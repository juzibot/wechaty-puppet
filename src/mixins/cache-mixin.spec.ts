#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
}           from 'tstest'

import type {
  CacheMixin,
  ProtectedPropertyCacheMixin,
}                               from './cache-mixin.js'

import { Puppet }         from '../puppet/mod.js'
import { STRING_SPLITTER } from '../config.js'
import { DirtyType }      from '../schemas/dirty.js'

test('ProtectedPropertyCacheMixin', async t => {
  type NotExistInMixin = Exclude<ProtectedPropertyCacheMixin, keyof InstanceType<CacheMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should match Mixin properties for every protected property')
})

/**
 * Minimal concrete puppet that satisfies the abstract type contract only
 * structurally -- we never call the abstract methods in these tests.
 * `onStart`/`onStop` are required by the service-mixin lifecycle.
 */
class TestPuppet extends (Puppet as any) {

  async onStart (): Promise<void> {}
  async onStop  (): Promise<void> {}

}

/**
 * Regression: a `dirty` event with payloadType=Unspecified must not crash
 * the process. The previous implementation throws synchronously inside
 * the dirtyFuncMap, and because `dirtyPayload` schedules the emit through
 * setImmediate, the throw lands in a setImmediate callback with no
 * surrounding try/catch -- which becomes an uncaughtException.
 */
test('onDirty(Unspecified) must NOT crash the process via uncaughtException', async t => {
  const puppet = new TestPuppet() as any
  await puppet.start()

  const caught: Error[] = []
  const onUncaught = (e: Error) => caught.push(e)
  process.on('uncaughtException', onUncaught)

  puppet.dirtyPayload(DirtyType.Unspecified, 'no-such-id')

  // Allow the setImmediate scheduled by dirtyPayload to fire.
  await new Promise(resolve => setImmediate(resolve))
  await new Promise(resolve => setImmediate(resolve))
  await new Promise(resolve => setTimeout(resolve, 20))

  process.off('uncaughtException', onUncaught)

  t.equal(caught.length, 0,
    `Unspecified dirty should not raise uncaughtException, but got: ${caught.map(e => e.message).join(', ')}`,
  )

  await puppet.stop()
})

/**
 * Regression: `__dirtyPayloadAwait` calls `this.dirtyPayload(type, id)`
 * without awaiting. The base `dirtyPayload` is synchronous, but
 * subclasses (notably puppet-service) override it as `async` and may
 * reject (e.g. on transient gRPC failure). The unawaited rejection
 * then surfaces as an `unhandledRejection`.
 *
 * The fix must surface the rejection through logging without leaking
 * it to the process-level unhandledRejection handler.
 */
/**
 * Regression: `__dirtyPayloadAwait` waits up to 5s for a `dirty` event
 * that echoes back from the server. When the server never delivers (or
 * an override no-ops the emit path), the previous implementation just
 * logged a warning and returned -- the local LRU stayed populated with
 * whatever stale value it held, poisoning the next `xxxPayload(id)`
 * call for up to the LRU maxAge (15m).
 *
 * The fix: on timeout, invoke the same local-cache invalidator that
 * `onDirty` runs -- so the local LRU at least gets cleaned even when
 * the remote round-trip fails.
 */
test('__dirtyPayloadAwait: 5s timeout falls back to local LRU delete', async t => {
  const puppet = new TestPuppet() as any
  await puppet.start()
  puppet.__currentUserId = 'me'

  // Seed the local LRU with a stale value.
  puppet.cache.contact?.set('c-stale', { id: 'c-stale' } as any)
  t.ok(puppet.cache.contact?.get('c-stale'), 'sanity: stale entry seeded')

  // No-op dirtyPayload -- simulates a puppet-service whose emit-path
  // is disabled or a server that never echoes back.
  puppet.dirtyPayload = () => {}

  // Await the full 5s timeout window; must resolve, not throw.
  await puppet.__dirtyPayloadAwait(DirtyType.Contact, 'c-stale')

  t.equal(puppet.cache.contact?.get('c-stale'), undefined,
    'local LRU entry removed by timeout fallback')

  await puppet.stop()
})

/**
 * Regression: the dirtyFuncMap started as a hand-maintained
 * `Partial<Record<DirtyType, ...>>`. It's easy to add a new DirtyType
 * (RoomMember, Post, Tag, ...) and forget to wire a handler; the
 * silent Partial then makes the miss invisible.
 *
 * The map must cover every DirtyType enum value. Enforce this
 * structurally so a new DirtyType is a compile-time error unless a
 * handler is added.
 */
test('dirtyFuncMap covers every DirtyType', async t => {
  const puppet = new TestPuppet() as any
  await puppet.start()

  // DirtyType is a numeric enum, so Object.values returns both
  // numeric and reverse-mapped string entries -- keep only the numbers.
  const dirtyTypes = Object.values(DirtyType).filter(v => typeof v === 'number') as DirtyType[]

  const map = puppet.__dirtyFuncMap as Record<DirtyType, unknown>
  for (const type of dirtyTypes) {
    t.equal(typeof map[type], 'function',
      `dirtyFuncMap must define a handler for DirtyType.${DirtyType[type]}<${type}>`)
  }

  await puppet.stop()
})

test('__dirtyPayloadAwait must handle rejection from an overridden async dirtyPayload', async t => {
  const puppet = new TestPuppet() as any
  await puppet.start()
  // pretend the puppet is logged in so __dirtyPayloadAwait does not early-return
  puppet.__currentUserId = 'me'

  // Override dirtyPayload as an async-rejecting method (simulating
  // puppet-service when its gRPC dirtyPayload RPC fails).
  puppet.dirtyPayload = async () => {
    throw new Error('simulated gRPC dirtyPayload failure')
  }

  const unhandled: any[] = []
  const onUnhandled = (reason: any) => unhandled.push(reason)
  process.on('unhandledRejection', onUnhandled)

  // Call __dirtyPayloadAwait. The 5s internal timeout for the awaited
  // future is unavoidable today; we let it elapse.
  await puppet.__dirtyPayloadAwait(DirtyType.Contact, 'contact-id-x')

  // Give Node a tick to surface any pending unhandled rejection.
  await new Promise(resolve => setImmediate(resolve))
  await new Promise(resolve => setImmediate(resolve))

  process.off('unhandledRejection', onUnhandled)

  t.equal(
    unhandled.length,
    0,
    `dirtyPayload rejection must be captured, not leaked as unhandledRejection (got ${unhandled.length})`,
  )

  await puppet.stop()
})

/**
 * Regression: HIGH-A (round-3) -- an earlier revision pruned `__gen`
 * inside `onDirty`'s `finally` to bound memory growth. That prune
 * reopened the pre-existing dirty-during-fetch race for the FIRST
 * dirty a given (type, id) ever sees:
 *
 *   Getter A: snap = snapshotGen(Contact, X) = 0   (X not in map yet)
 *   Server:   bumpGen(Contact, X)          -> map[X]=1
 *   onDirty:  ...runs LRU delete... finally { genDelete(X) }  -> map[X] gone
 *   Getter A: fetch resolves; isFreshWrite reads snapshotGen -> 0 (missing)
 *             0 === 0 -> true  -> stale payload written back into the LRU.
 *
 * First-dirty is the common case (onboarding, first-view, first-refresh),
 * so the prune was a net regression. The fix (round-3) drops the prune
 * entirely and accepts bounded `__gen` growth against the CRM-scale
 * contact/room ceiling. Pin the no-prune invariant so a future well-
 * meaning "bound the map" refactor does not re-open the race.
 *
 * We assert on both the (type, id)-specific snapshot AND on `__genSize`:
 *   - snapshotGen > 0 proves the bump survived, which is what closes the
 *     race for the in-flight fetch.
 *   - __genSize > 0 pins the "no unconditional prune from onDirty" shape.
 */
test('onDirty must NOT prune __gen (pin no-prune invariant)', async t => {
  const puppet = new TestPuppet() as any
  await puppet.start()

  puppet.dirtyPayload(DirtyType.Contact, 'gen-a')
  puppet.dirtyPayload(DirtyType.Contact, 'gen-b')

  // Let the setImmediate-scheduled emit + onDirty run.
  await new Promise(resolve => setImmediate(resolve))
  await new Promise(resolve => setImmediate(resolve))

  // Base `dirtyPayload` bumps once, then the dirty-echo path (onDirty)
  // bumps the same (type, id) a second time. The exact count is not the
  // invariant -- what matters is that a pre-bump snapshot (0) can never
  // equal the post-onDirty gen, so the write stays skipped. Assert the
  // gen strictly moved off 0 rather than pinning a brittle absolute.
  t.ok(puppet.cache.snapshotGen(DirtyType.Contact, 'gen-a') >= 1,
    'gen-a bump survives onDirty (any pre-bump snapshot must still see stale)')
  t.ok(puppet.cache.snapshotGen(DirtyType.Contact, 'gen-b') >= 1,
    'gen-b bump survives onDirty (any pre-bump snapshot must still see stale)')
  t.ok(puppet.cache.__genSize() >= 2,
    '__gen retains both slots after onDirty -- no unconditional prune')

  await puppet.stop()
})

/**
 * Regression: MEDIUM-2 -- when RoomMember dirty is called with a
 * malformed id shape (e.g. bare `${SEP}memberId` or trailing SEP),
 * the pre-round-2 code path used to unconditionally delete the whole
 * `roomMember[first-segment]` entry. The contract-check we added
 * emits `error` and returns early, which is safer BUT drops the
 * old fallback delete -- any stale LRU entry linked to that room
 * then survives for the full 15-minute maxAge.
 *
 * The fix: emit `error` (contract violation is still surfaced) AND
 * best-effort delete `roomMember[segments[0] || id]` first so a buggy
 * caller does not accidentally poison the cache for 15 minutes.
 */
test('dirtyPayload(RoomMember, malformed id) still triggers a fallback LRU delete', async t => {
  const puppet = new TestPuppet() as any
  await puppet.start()

  const errors: any[] = []
  puppet.on('error', (payload: any) => errors.push(payload))

  puppet.cache.roomMember?.set('rm-fb-1', { m1: { id: 'm1' } as any })
  puppet.cache.roomMember?.set('', { m0: { id: 'm0' } as any })

  // Trailing SEP: segments=[roomId,''] -> non-empty first segment.
  puppet.dirtyPayload(DirtyType.RoomMember, `rm-fb-1${STRING_SPLITTER}`)

  await new Promise(resolve => setImmediate(resolve))
  await new Promise(resolve => setImmediate(resolve))

  t.equal(errors.length, 1, 'malformed id still surfaces the error event')
  t.equal(puppet.cache.roomMember?.get('rm-fb-1'), undefined,
    'best-effort fallback still evicts `roomMember[segments[0]]` for a trailing-SEP shape')

  // Leading SEP: segments=['', memberId] -> first segment falsy, so we
  // fall back to `id` (the whole malformed string). No cache entry
  // exists at that key -- but we must not throw.
  const errsBefore = errors.length
  puppet.dirtyPayload(DirtyType.RoomMember, `${STRING_SPLITTER}orphan`)

  await new Promise(resolve => setImmediate(resolve))
  await new Promise(resolve => setImmediate(resolve))

  t.equal(errors.length, errsBefore + 1, 'leading-SEP shape also surfaces error')

  await puppet.stop()
})

/**
 * Unit: `__inflightDeletePrefix` removes exactly the entries whose key
 * starts with the prefix and leaves every other entry intact. This is
 * the primitive the whole-room RoomMember dirty relies on.
 */
test('CacheAgent.__inflightDeletePrefix removes only prefix-matching keys', async t => {
  const puppet = new TestPuppet() as any
  await puppet.start()

  const p = Promise.resolve('x')
  // swallow to avoid unhandled-rejection noise (these never reject)
  p.catch(() => {})

  puppet.cache.__inflightSet(`roommember:room-1${STRING_SPLITTER}m1`, p)
  puppet.cache.__inflightSet(`roommember:room-1${STRING_SPLITTER}m2`, p)
  puppet.cache.__inflightSet(`roommember:room-2${STRING_SPLITTER}m1`, p)
  puppet.cache.__inflightSet('contact:room-1', p)

  puppet.cache.__inflightDeletePrefix(`roommember:room-1${STRING_SPLITTER}`)

  t.equal(puppet.cache.__inflightGet(`roommember:room-1${STRING_SPLITTER}m1`), undefined,
    'room-1 member m1 in-flight removed')
  t.equal(puppet.cache.__inflightGet(`roommember:room-1${STRING_SPLITTER}m2`), undefined,
    'room-1 member m2 in-flight removed')
  t.ok(puppet.cache.__inflightGet(`roommember:room-2${STRING_SPLITTER}m1`),
    'a different room is untouched')
  t.ok(puppet.cache.__inflightGet('contact:room-1'),
    'a non-roommember key sharing the roomId substring is untouched')

  await puppet.stop()
})

/**
 * Regression (dirty-echo path, RoomMember): a single-member dirty
 * (`${roomId}${SEP}${memberId}`) arriving via `onDirty` must bump BOTH
 * the composite gen key AND the bare-roomId gen key. The whole-room
 * batch write-back in room-member-mixin snapshots the bare-roomId key
 * (and puppet-service's FlashStore row write-back keys by roomId too);
 * without the bare-key bump a whole-room snapshot flying during the
 * single-member dirty would be treated as fresh and merged back.
 */
test('onDirty(RoomMember composite) bumps both the member gen and the room gen', async t => {
  const puppet = new TestPuppet() as any
  await puppet.start()

  const roomId    = 'room-x'
  const memberId  = 'member-y'
  const composite = `${roomId}${STRING_SPLITTER}${memberId}`

  t.equal(puppet.cache.snapshotGen(DirtyType.RoomMember, composite), 0, 'sanity: member gen starts at 0')
  t.equal(puppet.cache.snapshotGen(DirtyType.RoomMember, roomId), 0, 'sanity: room gen starts at 0')

  puppet.onDirty({ payloadType: DirtyType.RoomMember, payloadId: composite })

  t.equal(puppet.cache.snapshotGen(DirtyType.RoomMember, composite), 1,
    'single-member dirty bumps the composite gen key')
  t.equal(puppet.cache.snapshotGen(DirtyType.RoomMember, roomId), 1,
    'single-member dirty ALSO bumps the bare-roomId gen key (whole-room snapshots go stale)')

  await puppet.stop()
})

/**
 * Regression (dirty-echo path, RoomMember): a bare-roomId (whole-room)
 * dirty via `onDirty` must evict EVERY per-member in-flight fetch for
 * that room, so a getter that joined a pre-dirty member fetch cannot
 * resurrect a stale member snapshot.
 */
test('onDirty(RoomMember bare roomId) prefix-clears all member in-flight fetches', async t => {
  const puppet = new TestPuppet() as any
  await puppet.start()

  const roomId = 'room-whole'
  const p = Promise.resolve({ id: 'stale' })
  p.catch(() => {})

  puppet.cache.__inflightSet(`roommember:${roomId}${STRING_SPLITTER}m1`, p)
  puppet.cache.__inflightSet(`roommember:${roomId}${STRING_SPLITTER}m2`, p)
  puppet.cache.__inflightSet(`roommember:other${STRING_SPLITTER}m1`, p)

  puppet.onDirty({ payloadType: DirtyType.RoomMember, payloadId: roomId })

  t.equal(puppet.cache.__inflightGet(`roommember:${roomId}${STRING_SPLITTER}m1`), undefined,
    'm1 in-flight cleared by whole-room dirty')
  t.equal(puppet.cache.__inflightGet(`roommember:${roomId}${STRING_SPLITTER}m2`), undefined,
    'm2 in-flight cleared by whole-room dirty')
  t.ok(puppet.cache.__inflightGet(`roommember:other${STRING_SPLITTER}m1`),
    'a different room keeps its in-flight fetch')

  await puppet.stop()
})
