#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test }  from 'tstest'

import { CacheAgent } from './cache-agent.js'
import { DirtyType }  from '../schemas/dirty.js'

test('CacheAgent roomMemberId() restart', async t => {
  t.ok(CacheAgent, 'tbw')
})

/**
 * Regression: the payload getters in contact/message/room/post follow a
 * `MISS -> await raw -> set` template. Without an in-flight dedup map,
 * N concurrent callers for the same id each fire the raw fetcher. And
 * without a "generation" number, a `dirty` event that lands between the
 * raw fetch and the set silently gets clobbered by the stale set.
 *
 * CacheAgent must expose the primitives that the mixins compose around
 * that template:
 *   - snapshotGen(type, id)          -- read the current generation
 *   - bumpGen(type, id)              -- invalidate any in-flight snapshot
 *   - isFreshWrite(type, id, snap)   -- true iff no dirty since snapshot
 *   - __inflightGet / Set / Delete   -- share a single Promise per (type,id)
 */
test('CacheAgent gen tracking: bumpGen invalidates a prior snapshot', async t => {
  const cache = new CacheAgent()
  await cache.start()

  const snap = cache.snapshotGen(DirtyType.Contact, 'c1')
  t.equal(cache.isFreshWrite(DirtyType.Contact, 'c1', snap), true,
    'snapshot is fresh before any bumpGen')

  cache.bumpGen(DirtyType.Contact, 'c1')

  t.equal(cache.isFreshWrite(DirtyType.Contact, 'c1', snap), false,
    'snapshot goes stale after bumpGen')

  const snap2 = cache.snapshotGen(DirtyType.Contact, 'c1')
  t.equal(cache.isFreshWrite(DirtyType.Contact, 'c1', snap2), true,
    'a snapshot taken after the bump is fresh again')
})

test('CacheAgent gen tracking: distinct ids/types do not cross-invalidate', async t => {
  const cache = new CacheAgent()
  await cache.start()

  const snapC = cache.snapshotGen(DirtyType.Contact, 'x')
  const snapM = cache.snapshotGen(DirtyType.Message, 'x')

  cache.bumpGen(DirtyType.Contact, 'x')

  t.equal(cache.isFreshWrite(DirtyType.Contact, 'x', snapC), false,
    'Contact/x is stale after Contact/x bump')
  t.equal(cache.isFreshWrite(DirtyType.Message, 'x', snapM), true,
    'Message/x still fresh -- different type key')

  const snapContactY = cache.snapshotGen(DirtyType.Contact, 'y')
  cache.bumpGen(DirtyType.Contact, 'y')
  t.equal(cache.isFreshWrite(DirtyType.Contact, 'y', snapContactY), false,
    'Contact/y is stale after Contact/y bump')
})

test('CacheAgent __inflight: get/set/delete round-trip', async t => {
  const cache = new CacheAgent()
  await cache.start()

  const key = 'contact:abc'
  t.equal(cache.__inflightGet(key), undefined, 'no in-flight before set')

  const p = Promise.resolve('payload')
  cache.__inflightSet(key, p)

  t.equal(cache.__inflightGet(key), p, 'get returns the exact promise')

  cache.__inflightDelete(key)
  t.equal(cache.__inflightGet(key), undefined, 'delete clears the slot')
})

test('CacheAgent __inflight: two callers get the same Promise for one key', async t => {
  const cache = new CacheAgent()
  await cache.start()

  const key = 'message:m1'
  let resolveIt: (v: string) => void = () => {}
  const p = new Promise<string>(resolve => { resolveIt = resolve })
  cache.__inflightSet(key, p)

  const a = cache.__inflightGet<string>(key)
  const b = cache.__inflightGet<string>(key)
  t.equal(a, b, 'two get()s return the same Promise reference')

  resolveIt('done')
  t.equal(await a, 'done', 'promise resolves once for both callers')
})

/**
 * Regression: `__gen` is only cleared at `stop()`. On a long-lived
 * puppet (production dispatchers routinely stay up for weeks) the map
 * grows by one entry per distinct (type, id) touched by a dirtyPayload
 * -- millions of contacts / messages accumulate without any bound.
 *
 * The fix: `CacheMixin.onDirty` prunes the gen slot after the LRU
 * handler runs via a `CacheAgent.genDelete(type, id)` helper. Here
 * we exercise the helper directly against the agent.
 *
 * NB: the assertions read the private `__gen` map via `as any`. The
 * agent gains a public `__genSize()` observer in the follow-up fix
 * commit; this test commit deliberately relies on the internal shape
 * so it lands "red" and turns green once the fix arrives.
 */
test('CacheAgent genDelete: prunes a single (type, id) slot', async t => {
  const cache = new CacheAgent()
  await cache.start()

  cache.bumpGen(DirtyType.Contact, 'gc-1')
  cache.bumpGen(DirtyType.Contact, 'gc-2')
  t.equal((cache as any).__gen.size, 2, 'two bumps -> two slots')

  ;(cache as any).genDelete(DirtyType.Contact, 'gc-1')
  t.equal((cache as any).__gen.size, 1, 'genDelete drops exactly one slot')

  t.equal(cache.snapshotGen(DirtyType.Contact, 'gc-1'), 0,
    'a fresh snapshot after prune reads as 0 (semantically the same as never-bumped)')
  t.equal(
    cache.isFreshWrite(DirtyType.Contact, 'gc-1', 0),
    true,
    'pruning does not cause spurious staleness for a new snapshot',
  )
})

test('CacheAgent genDelete: idempotent + missing key is a no-op', async t => {
  const cache = new CacheAgent()
  await cache.start()

  ;(cache as any).genDelete(DirtyType.Contact, 'never-bumped')
  t.equal((cache as any).__gen.size, 0, 'delete on a missing key does not throw or grow the map')

  cache.bumpGen(DirtyType.Message, 'mid')
  ;(cache as any).genDelete(DirtyType.Message, 'mid')
  ;(cache as any).genDelete(DirtyType.Message, 'mid')
  t.equal((cache as any).__gen.size, 0, 'delete is idempotent')
})
