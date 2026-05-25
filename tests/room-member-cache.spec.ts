#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test }  from 'tstest'

import { PuppetTest } from './fixtures/puppet-test/puppet-test.js'

/**
 * Regression test for `roomMemberPayload` cache key write bug.
 *
 * Before the fix, line 182 wrote `memberId: payload` (a literal property
 * named 'memberId') instead of `[memberId]: payload` (a computed key using
 * the variable's value). Because the read path uses `cachedPayload[memberId]`,
 * the cache hit rate was always 0 — every call fell back to raw RPC.
 *
 * See: src/mixins/room-member-mixin.ts (the `set` call inside
 * `roomMemberPayload`).
 */
test('roomMemberPayload cache hit (uses computed key for memberId)', async t => {
  const puppet = new PuppetTest()
  await puppet.start()
  t.teardown(() => puppet.stop())

  const roomId   = 'room-1'
  const memberId = 'member-1'

  let rawCalls = 0
  const originalRaw = puppet.roomMemberRawPayload.bind(puppet)
  puppet.roomMemberRawPayload = async (rid: string, mid: string) => {
    rawCalls++
    return originalRaw(rid, mid)
  }

  // First call: cache miss → raw is invoked once.
  await puppet.roomMemberPayload(roomId, memberId)
  t.equal(rawCalls, 1, 'first call: cache miss, raw payload invoked once')

  // Second call with the same (roomId, memberId): should hit cache.
  // Before the fix, the cache write used a literal key 'memberId' so this
  // hit would miss and raw would be invoked again (rawCalls would become 2).
  await puppet.roomMemberPayload(roomId, memberId)
  t.equal(rawCalls, 1, 'second call: cache hit, raw NOT invoked again')

  // Verify the cache stores the entry under the computed memberId key,
  // not under the literal 'memberId' string.
  const cached = (puppet as any).cache.roomMember?.get(roomId)
  t.ok(cached, 'cache slot for roomId is populated')
  t.ok(cached[memberId], 'payload is stored under the actual memberId key')
  // When the fix is applied, the computed-key write means the literal
  // string 'memberId' is never used as a property — the only own key on
  // `cached` should be the actual memberId value.
  t.notOk(
    Object.prototype.hasOwnProperty.call(cached, 'memberId'),
    'no stray "memberId" literal key (would be present if computed-key bug regressed)',
  )
})

test('roomMemberPayload accumulates multiple members under the same room', async t => {
  const puppet = new PuppetTest()
  await puppet.start()
  t.teardown(() => puppet.stop())

  const roomId = 'room-2'

  await puppet.roomMemberPayload(roomId, 'm-a')
  await puppet.roomMemberPayload(roomId, 'm-b')
  await puppet.roomMemberPayload(roomId, 'm-c')

  const cached = (puppet as any).cache.roomMember?.get(roomId)
  t.ok(cached, 'cache slot exists')
  t.ok(cached['m-a'], 'm-a is cached under its own key')
  t.ok(cached['m-b'], 'm-b is cached under its own key')
  t.ok(cached['m-c'], 'm-c is cached under its own key')
})
