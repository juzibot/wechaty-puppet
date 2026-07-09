#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
}           from 'tstest'

import type {
  ContactMixin,
  ProtectedPropertyContactMixin,
}                                 from './contact-mixin.js'

import { Puppet }    from '../puppet/mod.js'
import { DirtyType } from '../schemas/dirty.js'

test('ProtectedPropertyContactMixin', async t => {
  type NotExistInMixin = Exclude<ProtectedPropertyContactMixin, keyof InstanceType<ContactMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should match Mixin properties for every protected property')
})

class TestPuppet extends (Puppet as any) {

  async onStart (): Promise<void> {}
  async onStop  (): Promise<void> {}

}

/**
 * Regression: two concurrent contactPayload(id) callers must share a
 * single raw fetch. Without in-flight dedup, N callers each fire the
 * (potentially expensive, remote) contactRawPayload.
 */
test('contactPayload: concurrent callers dedup to a single raw fetch', async t => {
  const puppet = new TestPuppet() as any
  await puppet.start()

  let rawCalls = 0
  puppet.contactRawPayload = async (id: string) => {
    rawCalls++
    await new Promise(resolve => setTimeout(resolve, 40))
    return { id, name: `n-${id}` }
  }
  puppet.contactRawPayloadParser = async (raw: any) => raw

  const [ a, b, c ] = await Promise.all([
    puppet.contactPayload('c1'),
    puppet.contactPayload('c1'),
    puppet.contactPayload('c1'),
  ])

  t.equal(rawCalls, 1, 'raw fetcher fires exactly once for 3 concurrent callers')
  t.equal(a.id, 'c1')
  t.equal(b.id, 'c1')
  t.equal(c.id, 'c1')

  await puppet.stop()
})

/**
 * Regression: a dirty event that lands *between* the raw fetch and the
 * LRU set must not be silently clobbered by the stale set.
 */
test('contactPayload: dirty during in-flight fetch must not repopulate cache', async t => {
  const puppet = new TestPuppet() as any
  await puppet.start()

  let releaseRaw: () => void = () => {}
  const rawGate = new Promise<void>(resolve => { releaseRaw = resolve })

  puppet.contactRawPayload = async (id: string) => {
    await rawGate
    return { id, name: 'stale' }
  }
  puppet.contactRawPayloadParser = async (raw: any) => raw

  const inflight = puppet.contactPayload('c2')

  // Dirty arrives while the raw fetch is still awaiting.
  puppet.cache.bumpGen(DirtyType.Contact, 'c2')

  releaseRaw()
  await inflight

  t.equal(puppet.cache.contact?.get('c2'), undefined,
    'LRU must NOT hold the stale payload after a dirty-during-fetch race')

  await puppet.stop()
})

/**
 * Regression: HIGH-A (round-3) -- the earlier "prune __gen inside
 * onDirty.finally" hardening reopened the dirty-during-fetch race for
 * the FIRST dirty a given (type, id) ever sees. Reproduce it end-to-end
 * through the real `dirtyPayload` path:
 *
 *   1. Getter starts, snap = 0 (map has no entry for c-first-dirty).
 *   2. `dirtyPayload(Contact, c-first-dirty)` runs synchronously:
 *      bumpGen sets gen=1, then setImmediate schedules the emit.
 *   3. onDirty drains via setImmediate; pre-fix it also `genDelete`d
 *      the (type, id) slot, resetting gen back to 0 (missing).
 *   4. Raw fetch resolves. isFreshWrite compares snapshotGen (0, since
 *      the slot was pruned) against snap (0) -> 0 === 0 -> true ->
 *      stale payload written into the LRU.
 *
 * The pin: after the whole sequence, the LRU must not carry the stale
 * fetched payload. This companions the "no-prune invariant" cache-mixin
 * spec; that one pins the shape, this one pins the observable outcome.
 *
 * Distinct from "contactPayload: dirty during in-flight fetch..." above,
 * which calls `cache.bumpGen` directly and never triggers onDirty --
 * so it never exercised the finally-prune. This test uses the real
 * `dirtyPayload` path and drains setImmediate BEFORE releasing the raw
 * fetch, which is exactly the pre-fix race window.
 */
test('contactPayload: first-time dirty via dirtyPayload during fetch must not repopulate LRU', async t => {
  const puppet = new TestPuppet() as any
  await puppet.start()

  let releaseRaw: () => void = () => {}
  const rawGate = new Promise<void>(resolve => { releaseRaw = resolve })

  puppet.contactRawPayload = async (id: string) => {
    await rawGate
    return { id, name: 'stale' }
  }
  puppet.contactRawPayloadParser = async (raw: any) => raw

  // Snapshot the pre-bump gen (0) and register an in-flight fetch.
  const inflight = puppet.contactPayload('c-first-dirty')

  // Real dirty path: bumpGen synchronously, then setImmediate emit
  // schedules onDirty. Drain both so the pre-fix genDelete would have
  // executed by the time the raw fetch resolves.
  puppet.dirtyPayload(DirtyType.Contact, 'c-first-dirty')
  await new Promise(resolve => setImmediate(resolve))
  await new Promise(resolve => setImmediate(resolve))

  releaseRaw()
  await inflight

  t.equal(puppet.cache.contact?.get('c-first-dirty'), undefined,
    'first-time dirty during raw fetch must not overwrite the LRU with the stale payload')

  await puppet.stop()
})

/**
 * `batchContactPayload` used to bypass `cache.contact`. That meant a
 * caller batch-fetching 100 contacts would re-fetch every one on the
 * next per-id `contactPayload(id)` call, defeating the LRU. The batch
 * API must populate the same cache slot the per-id getter reads.
 */
test('batchContactPayload: writes fetched entries into cache.contact', async t => {
  const puppet = new TestPuppet() as any
  await puppet.start()

  const raw = new Map<string, any>([
    [ 'cb-a', { id: 'cb-a', name: 'A' } ],
    [ 'cb-b', { id: 'cb-b', name: 'B' } ],
  ])
  puppet.batchContactRawPayload  = async (_ids: string[]) => raw
  puppet.contactRawPayloadParser = async (rawPayload: any) => rawPayload

  await puppet.batchContactPayload([ 'cb-a', 'cb-b' ])

  t.equal(puppet.cache.contact?.get('cb-a')?.name, 'A',
    'cb-a populated in cache.contact by the batch call')
  t.equal(puppet.cache.contact?.get('cb-b')?.name, 'B',
    'cb-b populated in cache.contact by the batch call')

  await puppet.stop()
})

/**
 * Regression: HIGH-1 -- the per-id `contactPayload` getter carries a
 * gen snapshot + isFreshWrite guard so a `dirtyPayload(Contact, id)`
 * that lands mid-fetch skips the LRU write. The `batchContactPayload`
 * write path used to blindly `cache.contact.set(id, fetched)` for
 * every id, silently clobbering that invalidation.
 *
 * The batch write must observe the same gen snapshot the per-id path
 * would have observed.
 */
test('batchContactPayload: dirty during batch fetch must NOT clobber cache', async t => {
  const puppet = new TestPuppet() as any
  await puppet.start()

  let releaseRaw: () => void = () => {}
  const rawGate = new Promise<void>(resolve => { releaseRaw = resolve })

  puppet.batchContactRawPayload = async (ids: string[]) => {
    await rawGate
    const raw = new Map<string, any>()
    for (const id of ids) {
      raw.set(id, { id, name: 'stale' })
    }
    return raw
  }
  puppet.contactRawPayloadParser = async (rawPayload: any) => rawPayload

  const inflight = puppet.batchContactPayload([ 'cbd-1', 'cbd-2' ])

  // Dirty lands while the raw batch fetch is awaiting.
  puppet.cache.bumpGen(DirtyType.Contact, 'cbd-1')

  releaseRaw()
  const result = await inflight

  // Batch still returns the fetched payloads to the caller (they
  // asked for them; the guard only governs the LRU write).
  t.equal(result.get('cbd-1')?.name, 'stale', 'caller receives the fetched payload')
  t.equal(result.get('cbd-2')?.name, 'stale', 'caller receives the fetched payload')

  t.equal(puppet.cache.contact?.get('cbd-1'), undefined,
    'LRU must NOT hold the payload for the dirtied id')
  t.equal(puppet.cache.contact?.get('cbd-2')?.name, 'stale',
    'other ids in the same batch are unaffected -- gen guard is per-id')

  await puppet.stop()
})

/**
 * Regression: HIGH-1 -- when a per-id `contactPayload(X)` is already
 * awaiting a raw fetch, a `batchContactPayload([..., X, ...])` used
 * to fire a second raw fetch for X and race the two LRU writes. The
 * batch path must observe `cache.__inflightGet(...)` and share the
 * inflight Promise instead.
 */
test('batchContactPayload: dedups against an in-flight per-id fetch', async t => {
  const puppet = new TestPuppet() as any
  await puppet.start()

  let rawCalls = 0
  const batchIds: string[][] = []

  let releaseRaw: () => void = () => {}
  const rawGate = new Promise<void>(resolve => { releaseRaw = resolve })

  puppet.contactRawPayload = async (id: string) => {
    rawCalls++
    await rawGate
    return { id, name: `n-${id}` }
  }
  puppet.batchContactRawPayload = async (ids: string[]) => {
    batchIds.push([ ...ids ])
    const raw = new Map<string, any>()
    for (const id of ids) {
      raw.set(id, { id, name: `n-${id}` })
    }
    return raw
  }
  puppet.contactRawPayloadParser = async (rawPayload: any) => rawPayload

  // Kick off the per-id fetch first; it will register an inflight.
  const perId = puppet.contactPayload('cbi-x')

  // Yield so the inflight registers before the batch begins.
  await new Promise(resolve => setImmediate(resolve))

  const batch = puppet.batchContactPayload([ 'cbi-x', 'cbi-y' ])

  releaseRaw()

  const [ perIdRes, batchRes ] = await Promise.all([ perId, batch ])

  t.equal(perIdRes.id, 'cbi-x', 'per-id call returns cbi-x')
  t.equal(batchRes.get('cbi-x')?.id, 'cbi-x',
    'batch call also returns cbi-x -- via the shared inflight')
  t.equal(batchRes.get('cbi-y')?.id, 'cbi-y',
    'batch call still fetches the non-inflight ids')

  t.equal(rawCalls, 1, 'per-id raw fetch fires exactly once for cbi-x')
  t.equal(batchIds.length, 1, 'batchContactRawPayload is invoked at most once')
  t.same(batchIds[0], [ 'cbi-y' ],
    'batch raw fetch only asks for the ids that were not already inflight')

  await puppet.stop()
})

/**
 * Regression (dirty-echo path): production puppets (wechaty-puppet-service
 * client, puppet-rabbit) override `dirtyPayload` to only forward the
 * invalidation to the server and rely on the server echoing a `dirty`
 * event back -- they never call `super.dirtyPayload`, so the gen bump the
 * base performs never runs on their (only) local invalidation path. The
 * echo lands in `onDirty`, which -- pre-fix -- neither bumped `__gen` nor
 * cleared `__inflight`. A raw fetch already in flight when the dirty
 * arrived then passed `isFreshWrite` and poisoned the just-cleared LRU;
 * the visible symptom was "must dirty twice before the new value shows".
 *
 * This models an overriding puppet: `dirtyPayload` only re-emits `dirty`
 * (no super, no bumpGen). After ONE dirty the next read must be NEW.
 */
test('dirty-echo path: one dirty makes the next read return NEW (overriding puppet)', async t => {
  const puppet = new TestPuppet() as any
  await puppet.start()

  // Overriding-type puppet: dirtyPayload only re-emits the `dirty`
  // event asynchronously, exactly like the server echo. No super call,
  // no bumpGen -- onDirty is the sole local invalidation path.
  puppet.dirtyPayload = (type: DirtyType, id: string) => {
    setImmediate(() => puppet.emit('dirty', { payloadId: id, payloadType: type }))
  }

  let releaseRaw: () => void = () => {}
  const rawGate = new Promise<void>(resolve => { releaseRaw = resolve })

  let rawCalls = 0
  puppet.contactRawPayload = async (id: string) => {
    rawCalls += 1
    if (rawCalls === 1) {
      // The in-flight fetch that started BEFORE the dirty: gated, and
      // it returns the pre-dirty (OLD) snapshot when finally released.
      await rawGate
      return { id, name: 'OLD' }
    }
    // Any fetch issued AFTER the dirty sees the new server state.
    return { id, name: 'NEW' }
  }
  puppet.contactRawPayloadParser = async (raw: any) => raw

  // 1. Read c1 -- raw fetch starts, snapshots gen=0, then blocks.
  const inflight = puppet.contactPayload('c1')

  // 2. Server data flips to NEW, server echoes a dirty for c1.
  puppet.dirtyPayload(DirtyType.Contact, 'c1')

  // 3. Let the setImmediate-scheduled emit + onDirty drain.
  await new Promise(resolve => setImmediate(resolve))
  await new Promise(resolve => setImmediate(resolve))

  // 4. Release the OLD fetch. isFreshWrite must now be false (onDirty
  //    bumped gen), so the OLD payload is NOT written back into the LRU.
  releaseRaw()
  const first = await inflight
  t.equal(first.name, 'OLD', 'the original pre-dirty caller still gets its OLD snapshot')

  // 5. Read c1 again -- LRU is empty and the in-flight was cleared, so a
  //    fresh fetch fires and returns NEW after a SINGLE dirty.
  const second = await puppet.contactPayload('c1')
  t.equal(second.name, 'NEW',
    'one dirty is enough: the next read returns NEW (pre-fix returned OLD)')

  await puppet.stop()
})

/**
 * Regression (dirty-echo path, in-flight cleanup): a read issued after
 * the dirty must NOT reuse the pre-dirty in-flight promise. onDirty must
 * evict `contact:${id}` from `__inflight` so a fresh raw fetch fires.
 */
test('dirty-echo path: post-dirty read does not reuse the pre-dirty in-flight fetch', async t => {
  const puppet = new TestPuppet() as any
  await puppet.start()

  puppet.dirtyPayload = (type: DirtyType, id: string) => {
    setImmediate(() => puppet.emit('dirty', { payloadId: id, payloadType: type }))
  }

  let releaseRaw: () => void = () => {}
  const rawGate = new Promise<void>(resolve => { releaseRaw = resolve })

  let rawCalls = 0
  puppet.contactRawPayload = async (id: string) => {
    rawCalls += 1
    if (rawCalls === 1) {
      await rawGate
      return { id, name: 'OLD' }
    }
    return { id, name: 'NEW' }
  }
  puppet.contactRawPayloadParser = async (raw: any) => raw

  const inflight = puppet.contactPayload('c-inflight')
  t.equal(puppet.cache.__inflightGet('contact:c-inflight') !== undefined, true,
    'sanity: a pre-dirty in-flight promise is registered')

  puppet.dirtyPayload(DirtyType.Contact, 'c-inflight')
  await new Promise(resolve => setImmediate(resolve))
  await new Promise(resolve => setImmediate(resolve))

  t.equal(puppet.cache.__inflightGet('contact:c-inflight'), undefined,
    'onDirty evicted the pre-dirty in-flight promise')

  releaseRaw()
  await inflight

  const after = await puppet.contactPayload('c-inflight')
  t.equal(rawCalls, 2, 'a second raw fetch fired -- the stale in-flight was not reused')
  t.equal(after.name, 'NEW', 'post-dirty read observes NEW, not the reused OLD promise')

  await puppet.stop()
})
