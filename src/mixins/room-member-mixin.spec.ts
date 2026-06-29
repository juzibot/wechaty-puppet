#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
}           from 'tstest'

import type {
  RoomMemberMixin,
  ProtectedPropertyRoomMemberMixin,
}                                         from './room-member-mixin.js'

import { Puppet } from '../puppet/mod.js'

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
    await new Promise(r => setTimeout(r, 50))
    return { id: memberId, name: memberId }
  }
  puppet.roomMemberRawPayloadParser = async (raw: any) => raw

  const [aliceRet, bobRet] = await Promise.all([
    puppet.roomMemberPayload(roomId, 'alice'),
    puppet.roomMemberPayload(roomId, 'bob'),
  ])

  t.equal(aliceRet.id, 'alice', 'sanity: alice payload returned')
  t.equal(bobRet.id,   'bob',   'sanity: bob payload returned')

  const cached = puppet.cache.roomMember!.get(roomId)
  t.ok(cached?.['alice'], 'alice should remain in the room-member cache')
  t.ok(cached?.['bob'],   'bob should remain in the room-member cache')

  await puppet.stop()
})
