#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test } from 'tstest'

import type { CacheAgent } from '../src/agents/cache-agent.js'
import { payloads, types } from '../src/mods/mod.js'
import type { PuppetInterface } from '../src/puppet/puppet-interface.js'
import type { PuppetOptions } from '../src/schemas/puppet.js'

import { PuppetTest } from './fixtures/puppet-test/puppet-test.js'

interface LazyLoadTestBase extends Omit<PuppetInterface, 'roomMemberList'> {
  cache: CacheAgent
  roomMemberList (): Promise<string[]>
  roomRawPayload (roomId: string): Promise<payloads.Room>
  roomRawPayloadParser (payload: payloads.Room): Promise<payloads.Room>
}

// Narrow the deeply composed mixin constructor to avoid TypeScript 4.7's instantiation limit.
const LazyLoadTestBase = PuppetTest as unknown as new (options?: PuppetOptions) => LazyLoadTestBase

class LazyLoadPuppet extends LazyLoadTestBase {

  roomReads = 0

  get payloadCache (): CacheAgent { return this.cache }

  override async roomRawPayload (roomId: string): Promise<payloads.Room> {
    this.roomReads++
    return { adminIdList: [], id: roomId, memberIdList: [], topic: `topic-${this.roomReads}` }
  }

  override async roomRawPayloadParser (payload: payloads.Room): Promise<payloads.Room> {
    return payload
  }

  override async roomMemberList (): Promise<string[]> {
    return []
  }

}

test('roomMemberLazyLoadNow is unsupported by default', async t => {
  const puppet = new LazyLoadPuppet()
  await t.rejects(puppet.roomMemberLazyLoadNow(), /roomMemberLazyLoadNow is unsupported by this puppet/)
})

test('lazy load events are registered with their payload types', async t => {
  t.ok(types.PUPPET_EVENT_DICT['room-member-load'], 'room-member-load registered')
  t.ok(types.PUPPET_EVENT_DICT['room-member-lazy-load-finished'], 'room-member-lazy-load-finished registered')

  const puppet = new LazyLoadPuppet()
  const loaded: payloads.EventRoomMemberLoad[] = []
  const finished: payloads.EventRoomMemberLazyLoadFinished[] = []
  puppet.on('room-member-load', (payload): void => { loaded.push(payload) })
  puppet.on('room-member-lazy-load-finished', (payload): void => { finished.push(payload) })

  puppet.emit('room-member-load', { roomId: 'room' })
  puppet.emit('room-member-lazy-load-finished', {})

  t.same(loaded, [ { roomId: 'room' } ])
  t.same(finished, [ {} ])
})

test('room-member-load drops room and member cache before business listeners run', async t => {
  const puppet = new LazyLoadPuppet()
  await puppet.start()
  t.teardown(() => puppet.stop())

  await puppet.roomPayload('room')
  puppet.payloadCache.roomMember?.set('room', { member: { avatar: '', id: 'member', name: 'member' } })

  let topicSeenByListener: string | undefined
  puppet.on('room-member-load', async ({ roomId }): Promise<void> => {
    t.equal(puppet.payloadCache.roomMember?.get(roomId), undefined, 'member cache dropped first')
    topicSeenByListener = (await puppet.roomPayload(roomId)).topic
  })
  puppet.emit('room-member-load', { roomId: 'room' })
  await new Promise(resolve => setImmediate(resolve))

  t.equal(topicSeenByListener, 'topic-2', 'listener re-fetches instead of reading the stale room')
  t.equal(puppet.roomReads, 2)
})

test('room-member-load listener tolerates disabled caches and is removed on stop', async t => {
  const disabled = new LazyLoadPuppet({ cache: { disable: true } })
  await disabled.start()
  t.doesNotThrow((): void => { disabled.emit('room-member-load', { roomId: 'room' }) })
  await disabled.stop()

  const puppet = new LazyLoadPuppet()
  const baseline = puppet.listenerCount('room-member-load')
  await puppet.start()
  t.equal(puppet.listenerCount('room-member-load'), baseline + 1)
  await puppet.stop()
  await new Promise(resolve => setImmediate(resolve))
  t.equal(puppet.listenerCount('room-member-load'), baseline)
})
