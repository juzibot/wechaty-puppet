#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
}           from 'tstest'

import type {
  RoomMemberMixin,
  ProtectedPropertyRoomMemberMixin,
}                                         from './room-member-mixin.js'

import { Puppet }         from '../puppet/mod.js'
import { STRING_SPLITTER } from '../config.js'
import { DirtyType }       from '../schemas/dirty.js'

test('ProtectedPropertyRoomMemberMixin', async t => {
  type NotExistInMixin = Exclude<ProtectedPropertyRoomMemberMixin, keyof InstanceType<RoomMemberMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should match Mixin properties for every protected property')
})

/**
 * Minimal concrete puppet stub for behavior tests.
 */
class TestPuppet extends (Puppet as any) {

  async onStart (): Promise<void> {}
  async onStop  (): Promise<void> {}

}

/**
 * Regression: roomMemberPayload reads `cache.roomMember.get(roomId)` once
 * at the top of the call, then writes `{...cachedPayload, [memberId]: payload}`
 * after an async raw-payload fetch. Two concurrent calls for distinct
 * members of the same room each capture the same (stale) snapshot and
 * blindly overwrite each other -- the second write loses the first
 * member.
 *
 * After fetching, the write must merge into the LATEST cache snapshot,
 * not the one captured at the start of the call.
 */
test('concurrent roomMemberPayload writes must not lose entries', async t => {
  const puppet = new TestPuppet() as any
  await puppet.start()

  const roomId = 'room-merge-race'

  puppet.roomMemberRawPayload = async (_: string, memberId: string) => {
    await new Promise(resolve => setTimeout(resolve, 50))
    return { id: memberId, name: memberId }
  }
  puppet.roomMemberRawPayloadParser = async (raw: any) => raw

  const [ aliceRet, bobRet ] = await Promise.all([
    puppet.roomMemberPayload(roomId, 'alice'),
    puppet.roomMemberPayload(roomId, 'bob'),
  ])

  t.equal(aliceRet.id, 'alice', 'sanity: alice payload returned')
  t.equal(bobRet.id,   'bob',   'sanity: bob payload returned')

  const cached = puppet.cache.roomMember!.get(roomId)
  t.equal(cached?.['alice']?.id, 'alice', 'alice cached entry must point at alice')
  t.equal(cached?.['bob']?.id,   'bob',   'bob cached entry must point at bob')

  await puppet.stop()
})

test('roomMemberPayload() must not throw before cache.start() resolves', async t => {
  const puppet = new TestPuppet() as any
  // intentionally do NOT await start()
  puppet.roomMemberRawPayload       = async () => ({ id: 'm', name: 'm' })
  puppet.roomMemberRawPayloadParser = async (raw: any) => raw

  // The call should not throw "Cannot read properties of undefined";
  // it may legitimately return undefined or skip caching on pre-start.
  let returned: any
  try {
    returned = await puppet.roomMemberPayload('room-pre-start', 'm')
  } catch (e) {
    t.fail(`roomMemberPayload threw pre-start: ${(e as Error).message}`)
    return
  }
  t.ok(returned, 'roomMemberPayload returned a payload pre-start')
})

/**
 * `roomMemberPayloadDirty(id)` takes a raw string id and every caller has
 * to hand-assemble the `${roomId}${SEP}${memberId}` shape (or hand a
 * bare roomId to mean "whole room"). Callers get this wrong.
 *
 * `dirtyRoomMemberPayload(roomId, memberId?)` is the ergonomic public API
 * -- roomId is required, memberId is optional. The assembled id must
 * match the format `dirtyPayload(DirtyType.RoomMember, id)` expects.
 */
test('dirtyRoomMemberPayload(roomId, memberId) assembles roomId SEP memberId', async t => {
  const puppet = new TestPuppet() as any
  await puppet.start()
  puppet.__currentUserId = 'me'

  const seen: string[] = []
  puppet.on('dirty', (ev: any) => {
    if (ev.payloadType === DirtyType.RoomMember) seen.push(ev.payloadId)
  })

  const p = puppet.dirtyRoomMemberPayload('r1', 'm1')
  // 5s __dirtyPayloadAwait timeout is unavoidable in this stub; assert on the
  // emitted id instead of on p resolving fast.
  await new Promise(resolve => setImmediate(resolve))
  await new Promise(resolve => setImmediate(resolve))

  t.equal(seen[0], `r1${STRING_SPLITTER}m1`, 'emitted id combines roomId + SEP + memberId')

  await p
  await puppet.stop()
})

test('dirtyRoomMemberPayload(roomId) with no memberId emits bare roomId', async t => {
  const puppet = new TestPuppet() as any
  await puppet.start()
  puppet.__currentUserId = 'me'

  const seen: string[] = []
  puppet.on('dirty', (ev: any) => {
    if (ev.payloadType === DirtyType.RoomMember) seen.push(ev.payloadId)
  })

  const p = puppet.dirtyRoomMemberPayload('r1')
  await new Promise(resolve => setImmediate(resolve))
  await new Promise(resolve => setImmediate(resolve))

  t.equal(seen[0], 'r1', 'emitted id is the bare roomId when memberId is omitted')

  await p
  await puppet.stop()
})

test('dirtyRoomMemberPayload rejects empty roomId', async t => {
  const puppet = new TestPuppet() as any
  await puppet.start()

  await t.rejects(
    puppet.dirtyRoomMemberPayload(''),
    /roomId/,
    'empty roomId is a caller bug -- surface it, not silently proceed',
  )

  await puppet.stop()
})

/**
 * The RoomMember id encoding uses STRING_SPLITTER (0x1F) to separate
 * roomId and memberId. Any id containing SEP that is NOT exactly
 * `roomId${SEP}memberId` is a caller bug: emit `error` and do NOT run
 * the dirtyFuncMap for it.
 */
test('dirtyPayload(RoomMember, malformed id with extra SEP) surfaces error', async t => {
  const puppet = new TestPuppet() as any
  await puppet.start()

  // PuppetSkeleton.emit(error, ...) coerces the arg into
  // EventErrorPayload = { gerror: string }, so we assert on gerror.
  const errors: { gerror?: string }[] = []
  puppet.on('error', (payload: any) => errors.push(payload))

  puppet.dirtyPayload(DirtyType.RoomMember, `r1${STRING_SPLITTER}m1${STRING_SPLITTER}extra`)

  await new Promise(resolve => setImmediate(resolve))
  await new Promise(resolve => setImmediate(resolve))
  await new Promise(resolve => setTimeout(resolve, 20))

  t.equal(errors.length, 1, 'malformed RoomMember id emits an error')
  t.match(errors[0]?.gerror, /RoomMember|malformed/, 'gerror mentions RoomMember/malformed')

  await puppet.stop()
})

/**
 * The old RoomMember dirty handler unconditionally deleted the whole
 * `roomMember[roomId]` LRU entry, even when the id was
 * `${roomId}${SEP}${memberId}` (single member). That threw away every
 * other member's cached payload just to invalidate one.
 *
 * The precise handler must:
 * - id === roomId              -> drop the whole room entry
 * - id === roomId+SEP+memberId -> drop only that memberId from the
 *                                 nested map; if it was the last
 *                                 entry, drop the whole roomId key.
 */
test('dirty(RoomMember, roomId+SEP+memberId) drops only that memberId', async t => {
  const puppet = new TestPuppet() as any
  await puppet.start()

  puppet.cache.roomMember?.set('r1', {
    m1: { id: 'm1' } as any,
    m2: { id: 'm2' } as any,
  })

  puppet.dirtyPayload(DirtyType.RoomMember, `r1${STRING_SPLITTER}m1`)

  await new Promise(resolve => setImmediate(resolve))
  await new Promise(resolve => setImmediate(resolve))

  const remaining = puppet.cache.roomMember?.get('r1')
  t.ok(remaining, 'roomId entry survives when only one member was dirtied')
  t.equal(remaining?.m1, undefined, 'm1 was removed')
  t.ok(remaining?.m2,               'm2 was preserved')

  await puppet.stop()
})

test('dirty(RoomMember, roomId+SEP+lastMemberId) drops the whole room entry', async t => {
  const puppet = new TestPuppet() as any
  await puppet.start()

  puppet.cache.roomMember?.set('r1', { m1: { id: 'm1' } as any })

  puppet.dirtyPayload(DirtyType.RoomMember, `r1${STRING_SPLITTER}m1`)

  await new Promise(resolve => setImmediate(resolve))
  await new Promise(resolve => setImmediate(resolve))

  t.equal(puppet.cache.roomMember?.get('r1'), undefined,
    'dirtying the only remaining member drops the roomId key')

  await puppet.stop()
})

test('dirty(RoomMember, bare roomId) drops the whole room entry', async t => {
  const puppet = new TestPuppet() as any
  await puppet.start()

  puppet.cache.roomMember?.set('r1', {
    m1: { id: 'm1' } as any,
    m2: { id: 'm2' } as any,
  })

  puppet.dirtyPayload(DirtyType.RoomMember, 'r1')

  await new Promise(resolve => setImmediate(resolve))
  await new Promise(resolve => setImmediate(resolve))

  t.equal(puppet.cache.roomMember?.get('r1'), undefined,
    'bare roomId drops all members of that room')

  await puppet.stop()
})

test('dirty(RoomMember) no-ops when the roomId is not cached', async t => {
  const puppet = new TestPuppet() as any
  await puppet.start()

  // Nothing cached for r-ghost.
  puppet.dirtyPayload(DirtyType.RoomMember, `r-ghost${STRING_SPLITTER}m1`)

  await new Promise(resolve => setImmediate(resolve))
  await new Promise(resolve => setImmediate(resolve))

  t.equal(puppet.cache.roomMember?.get('r-ghost'), undefined,
    'no entry, no change -- must not throw')

  await puppet.stop()
})

/**
 * `batchRoomMemberPayload` used to bypass `cache.roomMember`. The
 * nested cache shape `{[memberId]: payload}` requires merging fetched
 * members into the existing `roomMember[roomId]` entry, not replacing
 * it -- otherwise a concurrent single-member fetch is clobbered.
 */
test('batchRoomMemberPayload: merges fetched members into cache.roomMember[roomId]', async t => {
  const puppet = new TestPuppet() as any
  await puppet.start()

  // Seed one member from a prior call.
  puppet.cache.roomMember?.set('rb1', { m0: { id: 'm0' } as any })

  const raw = new Map<string, any>([
    [ 'm1', { id: 'm1' } ],
    [ 'm2', { id: 'm2' } ],
  ])
  puppet.batchRoomMemberRawPayload  = async (_r: string, _ids: string[]) => raw
  puppet.roomMemberRawPayloadParser = async (rawPayload: any) => rawPayload

  await puppet.batchRoomMemberPayload('rb1', [ 'm1', 'm2' ])

  const cached = puppet.cache.roomMember?.get('rb1')
  t.ok(cached,          'roomId entry preserved')
  t.equal(cached?.m0?.id, 'm0', 'existing member preserved')
  t.equal(cached?.m1?.id, 'm1', 'batch-fetched m1 written')
  t.equal(cached?.m2?.id, 'm2', 'batch-fetched m2 written')

  await puppet.stop()
})

test('dirty(RoomMember) no-ops when member is not present in the cached room', async t => {
  const puppet = new TestPuppet() as any
  await puppet.start()

  puppet.cache.roomMember?.set('r1', { m1: { id: 'm1' } as any })

  puppet.dirtyPayload(DirtyType.RoomMember, `r1${STRING_SPLITTER}m-absent`)

  await new Promise(resolve => setImmediate(resolve))
  await new Promise(resolve => setImmediate(resolve))

  const remaining = puppet.cache.roomMember?.get('r1')
  t.ok(remaining,           'roomId entry preserved when member is absent')
  t.ok(remaining?.m1,       'm1 preserved')

  await puppet.stop()
})

/**
 * Regression: MEDIUM-A (round-3) -- `batchRoomMemberPayload` guards
 * against per-member dirties that land during the raw fetch by
 * snapshotting `${roomId}${SEP}${memberId}` gens up front. But a
 * whole-room dirty (`dirtyPayload(RoomMember, roomId)`) bumps the
 * BARE `roomId` gen key -- a completely different __gen slot from any
 * of the per-member snapshots. Every per-member `isFreshWrite` still
 * reports fresh, and the batch then partially "resurrects" the room
 * with just the freshly-fetched members while the caller believed the
 * whole room was invalidated.
 *
 * Scenario:
 *   1. Pre-seed cache.roomMember[r] = { m0: p_old }.
 *   2. batchRoomMemberPayload(r, [m1, m2]) starts; per-member snaps
 *      captured for r+SEP+m1, r+SEP+m2 (both = 0), then raw fetch
 *      awaits.
 *   3. dirtyPayload(RoomMember, r)  -- bumps gen for bare "r" only;
 *      onDirty drops cache.roomMember[r] entirely.
 *   4. Raw resolves. Pre-fix code re-reads latest = undefined,
 *      per-member isFreshWrite returns true for both, merges {m1, m2}
 *      and writes cache.roomMember[r] = {m1, m2}. m0 is gone (correct
 *      -- the whole room was dirtied) BUT the room is now partially
 *      re-populated with data that predates the dirty.
 *
 * Fix (in room-member-mixin): snapshot the WHOLE-ROOM gen too and
 * skip the entire cache write when it moved. This test pins the
 * observable outcome.
 */
test('batchRoomMemberPayload: whole-room dirty during fetch must not partially resurrect', async t => {
  const puppet = new TestPuppet() as any
  await puppet.start()

  puppet.cache.roomMember?.set('r-wr', { m0: { id: 'm0' } as any })

  let releaseRaw: () => void = () => {}
  const rawGate = new Promise<void>(resolve => { releaseRaw = resolve })

  puppet.batchRoomMemberRawPayload = async (_r: string, ids: string[]) => {
    await rawGate
    const raw = new Map<string, any>()
    for (const id of ids) raw.set(id, { id, name: `${id}-stale` })
    return raw
  }
  puppet.roomMemberRawPayloadParser = async (raw: any) => raw

  const inflight = puppet.batchRoomMemberPayload('r-wr', [ 'm1', 'm2' ])

  // Whole-room dirty lands while the batch fetch is awaiting. Use the
  // real dirtyPayload path so onDirty (setImmediate) drains before the
  // raw fetch resolves -- this is exactly the pre-fix race window.
  puppet.dirtyPayload(DirtyType.RoomMember, 'r-wr')
  await new Promise(resolve => setImmediate(resolve))
  await new Promise(resolve => setImmediate(resolve))

  releaseRaw()
  await inflight

  t.equal(puppet.cache.roomMember?.get('r-wr'), undefined,
    'whole-room dirty during batch fetch must not partially resurrect the room')

  await puppet.stop()
})

test('dirtyPayload(RoomMember, "SEPmemberId" with empty roomId) surfaces error', async t => {
  const puppet = new TestPuppet() as any
  await puppet.start()

  const errors: { gerror?: string }[] = []
  puppet.on('error', (payload: any) => errors.push(payload))

  puppet.dirtyPayload(DirtyType.RoomMember, `${STRING_SPLITTER}m1`)

  await new Promise(resolve => setImmediate(resolve))
  await new Promise(resolve => setImmediate(resolve))
  await new Promise(resolve => setTimeout(resolve, 20))

  t.equal(errors.length, 1, 'empty roomId segment emits an error')

  await puppet.stop()
})
