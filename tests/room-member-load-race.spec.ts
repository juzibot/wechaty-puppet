#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test } from 'tstest'

import type { CacheAgent } from '../src/agents/cache-agent.js'
import { payloads, types } from '../src/mods/mod.js'

import { PuppetTest } from './fixtures/puppet-test/puppet-test.js'

interface Deferred<Value> {
  readonly promise: Promise<Value>
  readonly resolve: (value: Value) => void
}

function deferred<Value> (): Deferred<Value> {
  let resolve!: (value: Value) => void
  const promise = new Promise<Value>(_resolve => { resolve = _resolve })
  return { promise, resolve }
}

function roomPayload (roomId: string, revision: string): payloads.Room {
  return { adminIdList: [], id: roomId, memberIdList: [], memberLoadRevision: revision, topic: revision }
}

function memberPayload (memberId: string, revision: string): payloads.RoomMember {
  return { avatar: '', id: memberId, name: revision }
}

function emitLoaded (puppet: PuppetTest, roomId: string): void {
  puppet.emit('room-member-load', {
    revision: '2', roomId, status: types.RoomMemberLoadStatus.Loaded, taskId: 'task',
  })
}

function cacheOf (puppet: PuppetTest): CacheAgent {
  return (puppet as unknown as { cache: CacheAgent }).cache
}

test('a business listener registered before start reads only refreshed room/member payloads', async t => {
  const puppet = new PuppetTest()
  let revision = '1'
  puppet.roomRawPayload = async (roomId: string): Promise<payloads.Room> => roomPayload(roomId, revision)
  puppet.roomRawPayloadParser = async (payload: payloads.Room): Promise<payloads.Room> => payload
  puppet.roomMemberRawPayload = async (_roomId: string, memberId: string): Promise<payloads.RoomMember> => memberPayload(memberId, revision)
  puppet.roomMemberRawPayloadParser = async (payload: payloads.RoomMember): Promise<payloads.RoomMember> => payload
  const observed = deferred<[payloads.Room, payloads.RoomMember]>()
  puppet.on('room-member-load', async (): Promise<void> => {
    observed.resolve(await Promise.all([ puppet.roomPayload('room'), puppet.roomMemberPayload('room', 'member') ]))
  })
  await puppet.start()
  t.teardown(() => puppet.stop())
  await Promise.all([ puppet.roomPayload('room'), puppet.roomMemberPayload('room', 'member') ])
  revision = '2'
  emitLoaded(puppet, 'room')
  const [ room, member ] = await observed.promise
  t.equal(room.memberLoadRevision, '2', 'synchronous business read cannot hit old room cache')
  t.equal(member.name, '2', 'synchronous business read cannot hit old member cache')
})

for (const stage of [ 'raw', 'parser' ]) {
  for (const oldFirst of [ true, false ]) {
    test(`old ${stage} completes ${oldFirst ? 'before' : 'after'} new reads without reviving caches`, async t => {
      const puppet = new PuppetTest()
      const roomGate = deferred<payloads.Room>()
      const memberGate = deferred<payloads.RoomMember>()
      const roomStarted = deferred<void>()
      const memberStarted = deferred<void>()
      let revision = '1'
      puppet.roomRawPayload = async (roomId: string): Promise<payloads.Room> => {
        if (stage === 'raw' && revision === '1') {
          roomStarted.resolve()
          return roomGate.promise
        }
        return roomPayload(roomId, revision)
      }
      puppet.roomRawPayloadParser = async (payload: payloads.Room): Promise<payloads.Room> => {
        if (stage === 'parser' && payload.memberLoadRevision === '1') {
          roomStarted.resolve()
          return roomGate.promise
        }
        return payload
      }
      puppet.roomMemberRawPayload = async (_roomId: string, memberId: string): Promise<payloads.RoomMember> => {
        if (stage === 'raw' && revision === '1') {
          memberStarted.resolve()
          return memberGate.promise
        }
        return memberPayload(memberId, revision)
      }
      puppet.roomMemberRawPayloadParser = async (payload: payloads.RoomMember): Promise<payloads.RoomMember> => {
        if (stage === 'parser' && payload.name === '1') {
          memberStarted.resolve()
          return memberGate.promise
        }
        return payload
      }
      await puppet.start()
      t.teardown(() => puppet.stop())
      const oldReads = Promise.all([ puppet.roomPayload('room'), puppet.roomMemberPayload('room', 'member') ])
      await Promise.all([ roomStarted.promise, memberStarted.promise ])
      revision = '2'
      emitLoaded(puppet, 'room')
      if (!oldFirst) {
        const [ room, member ] = await Promise.all([ puppet.roomPayload('room'), puppet.roomMemberPayload('room', 'member') ])
        t.equal(room.memberLoadRevision, '2', 'new RPC is not serialized behind old fetch')
        t.equal(member.name, '2')
        await puppet.roomMemberPayload('room', 'new-member')
      }
      roomGate.resolve(roomPayload('room', '1'))
      memberGate.resolve(memberPayload('member', '1'))
      await oldReads
      if (oldFirst) {
        t.notOk(cacheOf(puppet).room?.get('room'), 'old room cannot repopulate an invalidated cache')
        t.notOk(cacheOf(puppet).roomMember?.get('room'), 'old member cannot repopulate an invalidated cache')
      } else {
        t.equal(cacheOf(puppet).room?.get('room')?.memberLoadRevision, '2', 'old room cannot overwrite new cache')
        t.equal(cacheOf(puppet).roomMember?.get('room')?.['member']?.name, '2', 'old member cannot merge into new cache')
        t.equal(cacheOf(puppet).roomMember?.get('room')?.['new-member']?.name, '2', 'new members survive')
      }
      t.equal((await puppet.roomPayload('room')).memberLoadRevision, '2', 'later reads never hit stale room')
      t.equal((await puppet.roomMemberPayload('room', 'member')).name, '2', 'later reads never hit stale member')
    })
  }
}

for (const batchSupported of [ true, false ]) {
  for (const stage of [ 'raw', 'parser' ]) {
    test(`batch ${batchSupported ? 'RPC' : 'fallback'} rejects invalidation during ${stage}`, async t => {
      const puppet = new PuppetTest()
      const roomGate = deferred<payloads.Room>()
      const memberGate = deferred<payloads.RoomMember>()
      const roomStarted = deferred<void>()
      const memberStarted = deferred<void>()
      const staleRoom = roomPayload('room', '1')
      const staleMember = memberPayload('member', '1')
      puppet.roomRawPayload = async (): Promise<payloads.Room> => {
        if (stage === 'raw') {
          roomStarted.resolve()
          return roomGate.promise
        }
        return staleRoom
      }
      puppet.roomMemberRawPayload = async (): Promise<payloads.RoomMember> => {
        if (stage === 'raw') {
          memberStarted.resolve()
          return memberGate.promise
        }
        return staleMember
      }
      puppet.roomRawPayloadParser = async (payload: payloads.Room): Promise<payloads.Room> => {
        if (stage === 'parser') {
          roomStarted.resolve()
          return roomGate.promise
        }
        return payload
      }
      puppet.roomMemberRawPayloadParser = async (payload: payloads.RoomMember): Promise<payloads.RoomMember> => {
        if (stage === 'parser') {
          memberStarted.resolve()
          return memberGate.promise
        }
        return payload
      }
      if (batchSupported) {
        puppet.batchRoomRawPayload = async (): Promise<Map<string, payloads.Room>> =>
          new Map([ [ 'room', await puppet.roomRawPayload('room') ] ])
        Object.defineProperty(puppet, 'batchRoomMemberRawPayload', {
          value: async (): Promise<Map<string, payloads.RoomMember>> =>
            new Map([ [ 'member', await puppet.roomMemberRawPayload('room', 'member') ] ]),
        })
      } else {
        Object.defineProperty(puppet, 'batchRoomRawPayload', { value: undefined })
      }
      await puppet.start()
      t.teardown(() => puppet.stop())
      const rooms = puppet.batchRoomPayload([ 'room' ])
      const members = puppet.batchRoomMemberPayload('room', [ 'member' ])
      const roomRejected = t.rejects(rooms, /batchRoomPayload.*invalidated.*room-member-load/i)
      const memberRejected = t.rejects(members, /batchRoomMemberPayload.*invalidated.*room-member-load/i)
      await Promise.all([ roomStarted.promise, memberStarted.promise ])
      emitLoaded(puppet, 'room')
      roomGate.resolve(staleRoom)
      memberGate.resolve(staleMember)
      await Promise.all([ roomRejected, memberRejected ])
      t.notOk(cacheOf(puppet).room?.get('room'), 'batch leaves room cache empty')
      t.notOk(cacheOf(puppet).roomMember?.get('room'), 'batch leaves member cache empty')
    })
  }
}

test('generation advances before business listeners even with cache disabled and stays room-local', async t => {
  const puppet = new PuppetTest({ cache: { disable: true } })
  const observed: number[] = []
  puppet.on('room-member-load', (): void => { observed.push(puppet.roomPayloadCacheGeneration('room')) })
  t.equal(puppet.roomPayloadCacheGeneration('room'), 0)
  await puppet.start()
  t.teardown(() => puppet.stop())
  emitLoaded(puppet, 'room')
  emitLoaded(puppet, 'room')
  t.same(observed, [ 1, 2 ], 'every event advances the generation before forwarding')
  t.equal(puppet.roomPayloadCacheGeneration('other-room'), 0, 'another room does not advance')
})

test('an event for another room does not discard in-flight room/member cache commits', async t => {
  const puppet = new PuppetTest()
  const roomGate = deferred<payloads.Room>()
  const memberGate = deferred<payloads.RoomMember>()
  puppet.roomRawPayload = async (): Promise<payloads.Room> => roomGate.promise
  puppet.roomMemberRawPayload = async (): Promise<payloads.RoomMember> => memberGate.promise
  puppet.roomRawPayloadParser = async (payload: payloads.Room): Promise<payloads.Room> => payload
  puppet.roomMemberRawPayloadParser = async (payload: payloads.RoomMember): Promise<payloads.RoomMember> => payload
  await puppet.start()
  t.teardown(() => puppet.stop())
  const room = puppet.roomPayload('other-room')
  const member = puppet.roomMemberPayload('other-room', 'member')
  const rooms = puppet.batchRoomPayload([ 'other-room' ])
  const members = puppet.batchRoomMemberPayload('other-room', [ 'member' ])
  emitLoaded(puppet, 'room')
  roomGate.resolve(roomPayload('other-room', '1'))
  memberGate.resolve(memberPayload('member', '1'))
  const [ resultRoom, resultMember, resultRooms, resultMembers ] = await Promise.all([ room, member, rooms, members ])
  t.equal(cacheOf(puppet).room?.get('other-room'), resultRoom, 'room still commits')
  t.equal(cacheOf(puppet).roomMember?.get('other-room')?.['member'], resultMember, 'member still commits')
  t.equal(resultRooms.size, 1, 'unaffected room batch succeeds')
  t.equal(resultMembers.size, 1, 'unaffected member batch succeeds')
})

test('room batch rechecks already parsed rooms after later room parsing finishes', async t => {
  const puppet = new PuppetTest()
  const gate = deferred<payloads.Room>()
  const parsing = deferred<void>()
  puppet.batchRoomRawPayload = async (): Promise<Map<string, payloads.Room>> => new Map([
    [ 'room', roomPayload('room', '1') ], [ 'later-room', roomPayload('later-room', '1') ],
  ])
  puppet.roomRawPayloadParser = async (payload: payloads.Room): Promise<payloads.Room> => {
    if (payload.id === 'later-room') {
      parsing.resolve()
      return gate.promise
    }
    return payload
  }
  await puppet.start()
  t.teardown(() => puppet.stop())
  const rejected = t.rejects(puppet.batchRoomPayload([ 'room', 'later-room' ]), /batchRoomPayload.*invalidated/i)
  await parsing.promise
  emitLoaded(puppet, 'room')
  gate.resolve(roomPayload('later-room', '1'))
  await rejected
  t.notOk(cacheOf(puppet).room?.get('room'))
})
