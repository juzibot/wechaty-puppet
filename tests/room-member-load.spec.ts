#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test } from 'tstest'

import type { CacheAgent } from '../src/agents/cache-agent.js'
import { payloads, types } from '../src/mods/mod.js'
import type { PuppetInterface } from '../src/puppet/puppet-interface.js'
import type { PuppetOptions } from '../src/schemas/puppet.js'

import { PuppetTest } from './fixtures/puppet-test/puppet-test.js'

interface RoomMemberLoadTestBase extends Omit<PuppetInterface, 'dirtyPayload' | 'roomMemberList'> {
  cache: CacheAgent
  dirtyPayload (): void
  roomMemberList (): Promise<string[]>
  roomRawPayload (roomId: string): Promise<payloads.Room>
  roomRawPayloadParser (payload: payloads.Room): Promise<payloads.Room>
  roomMemberRawPayload (roomId: string, memberId: string): Promise<payloads.RoomMember>
  roomMemberRawPayloadParser (payload: payloads.RoomMember): Promise<payloads.RoomMember>
}

// Narrow the deeply composed mixin constructor to avoid TypeScript 4.7's instantiation limit.
const RoomMemberLoadTestBase = PuppetTest as unknown as new (options?: PuppetOptions) => RoomMemberLoadTestBase

class RoomMemberLoadPuppet extends RoomMemberLoadTestBase {

  roomReads = 0
  memberReads = 0
  memberListReads = 0
  dirtyCalls = 0

  get payloadCache (): CacheAgent { return this.cache }

  override dirtyPayload (): void { this.dirtyCalls++ }

  override async roomRawPayload (roomId: string): Promise<payloads.Room> {
    this.roomReads++
    return { adminIdList: [], id: roomId, memberIdList: [], topic: `topic-${this.roomReads}` }
  }

  override async roomRawPayloadParser (payload: payloads.Room): Promise<payloads.Room> {
    return payload
  }

  override async roomMemberRawPayload (_roomId: string, memberId: string): Promise<payloads.RoomMember> {
    this.memberReads++
    return { avatar: '', id: memberId, name: `member-${this.memberReads}` }
  }

  override async roomMemberRawPayloadParser (payload: payloads.RoomMember): Promise<payloads.RoomMember> {
    return payload
  }

  override async roomMemberList (): Promise<string[]> {
    this.memberListReads++
    return []
  }

}

test('room member loading APIs reject explicitly when unsupported without reading or dirtying', async t => {
  const puppet = new RoomMemberLoadPuppet()
  await t.rejects(async (): Promise<unknown> => puppet.roomMemberSync('room'), /roomMemberSync.*unsupported/i)
  await t.rejects(async (): Promise<unknown> => puppet.roomMemberSync('room', { force: true }), /unsupported/i)
  await t.rejects(async (): Promise<unknown> => puppet.roomMemberLoadState('room'), /roomMemberLoadState.*unsupported/i)
  await t.rejects(async (): Promise<unknown> => puppet.roomMemberSnapshot('room', '9007199254740993'), /roomMemberSnapshot.*unsupported/i)
  await t.rejects(async (): Promise<unknown> => puppet.roomMemberSnapshot('room', '0', { pageSize: 0, pageToken: '' }), /unsupported/i)
  t.same([ puppet.roomReads, puppet.memberReads, puppet.memberListReads, puppet.dirtyCalls ], [ 0, 0, 0, 0 ])
})

test('room-member-load invalidates only local room/member caches and preserves the raw event', async t => {
  const puppet = new RoomMemberLoadPuppet()
  await puppet.start()
  t.teardown(() => puppet.stop())
  let dirtyEvents = 0
  let joinEvents = 0
  puppet.on('dirty', (): void => { dirtyEvents++ })
  puppet.on('room-join', (): void => { joinEvents++ })
  const otherRoom = await puppet.roomPayload('other-room')
  const otherMember = await puppet.roomMemberPayload('other-room', 'other-member')
  for (const status of [ 1, 2, 3, 4 ]) {
    const room = await puppet.roomPayload('room')
    const member = await puppet.roomMemberPayload('room', 'member')
    const reads = [ puppet.roomReads, puppet.memberReads ]
    const state: payloads.EventRoomMemberLoad = { revision: '9007199254740993', roomId: 'room', status, taskId: 'task' }
    let received: payloads.RoomMemberLoadState | undefined
    puppet.once('room-member-load', (payload): void => { received = payload })
    puppet.emit('room-member-load', state)
    t.equal(received, state, 'event forwards the original object')
    t.notOk(puppet.payloadCache.room?.get('room'), 'room cache cleared')
    t.notOk(puppet.payloadCache.roomMember?.get('room'), 'member cache cleared')
    t.same([ puppet.roomReads, puppet.memberReads ], reads, 'event performs no payload reads')
    t.equal(await puppet.roomPayload('other-room'), otherRoom, 'other room remains cached')
    t.equal(await puppet.roomMemberPayload('other-room', 'other-member'), otherMember, 'other members remain cached')
    t.not(await puppet.roomPayload('room'), room, 'explicit next read refreshes room')
    t.not(await puppet.roomMemberPayload('room', 'member'), member, 'explicit next read refreshes member')
  }
  await new Promise<void>(resolve => setImmediate(resolve))
  t.same([ puppet.dirtyCalls, dirtyEvents, joinEvents, puppet.memberListReads ], [ 0, 0, 0, 0 ])
  t.ok(types.PUPPET_EVENT_DICT['room-member-load'], 'event registered in the public dictionary')
})

test('room-member-load listener tolerates disabled caches and is removed across restarts', async t => {
  const disabled = new RoomMemberLoadPuppet({ cache: { disable: true } })
  await disabled.start()
  const state: payloads.EventRoomMemberLoad = {
    revision: '0', roomId: 'room', status: types.RoomMemberLoadStatus.Pending, taskId: 'task',
  }
  t.doesNotThrow((): void => { disabled.emit('room-member-load', state) })
  t.same([ disabled.dirtyCalls, disabled.roomReads, disabled.memberReads ], [ 0, 0, 0 ])
  await disabled.stop()
  await new Promise<void>(resolve => setImmediate(resolve))
  const puppet = new RoomMemberLoadPuppet()
  const baseline = puppet.listenerCount('room-member-load')
  await puppet.start()
  t.equal(puppet.listenerCount('room-member-load'), baseline + 1)
  await puppet.stop()
  await new Promise<void>(resolve => setImmediate(resolve))
  t.equal(puppet.listenerCount('room-member-load'), baseline)
  await puppet.start()
  t.equal(puppet.listenerCount('room-member-load'), baseline + 1)
  await puppet.stop()
  await new Promise<void>(resolve => setImmediate(resolve))
  t.equal(puppet.listenerCount('room-member-load'), baseline)
})

test('legacy dirty events keep separate room and room-member invalidation semantics', async t => {
  const puppet = new RoomMemberLoadPuppet()
  await puppet.start()
  t.teardown(() => puppet.stop())
  const member = await puppet.roomMemberPayload('room', 'member')
  await puppet.roomPayload('room')
  puppet.emit('dirty', { payloadId: 'room', payloadType: types.Dirty.Room })
  t.notOk(puppet.payloadCache.room?.get('room'))
  t.equal(await puppet.roomMemberPayload('room', 'member'), member)
  const room = await puppet.roomPayload('room')
  puppet.emit('dirty', { payloadId: 'room', payloadType: types.Dirty.RoomMember })
  t.notOk(puppet.payloadCache.roomMember?.get('room'))
  t.equal(await puppet.roomPayload('room'), room)
})

test('public room member loading types preserve the frozen contract', async t => {
  t.same([
    types.RoomMemberLoadMode.Unspecified, types.RoomMemberLoadMode.Normal, types.RoomMemberLoadMode.Lazy,
  ], [ 0, 1, 2 ])
  t.same([
    types.RoomMemberLoadStatus.Unspecified, types.RoomMemberLoadStatus.Pending, types.RoomMemberLoadStatus.Loading,
    types.RoomMemberLoadStatus.Loaded, types.RoomMemberLoadStatus.Failed,
  ], [ 0, 1, 2, 3, 4 ])
  const syncOptions: types.RoomMemberSyncOptions = {}
  const snapshotOptions: types.RoomMemberSnapshotOptions = { pageSize: 0, pageToken: '' }
  const snapshot: payloads.RoomMemberSnapshot = { members: [], revision: '9007199254740993', roomId: 'room' }
  const room: payloads.Room = {
    adminIdList: [],
    id: 'room',
    memberIdList: [],
    topic: '',
    memberCount: 42,
    memberLoadMode: types.RoomMemberLoadMode.Lazy,
    memberLoadStatus: types.RoomMemberLoadStatus.Loaded,
    memberLoadRevision: snapshot.revision,
    memberLoadedAt: 123,
  }
  t.notOk(syncOptions.force, 'force is not defaulted by the SDK')
  t.equal(snapshotOptions.pageSize, 0)
  t.equal(room.memberLoadRevision, snapshot.revision, 'revision stays an exact string')
})
