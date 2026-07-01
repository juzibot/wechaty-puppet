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
