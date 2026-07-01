#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
}           from 'tstest'

import type {
  RoomMixin,
  ProtectedPropertyRoomMixin,
}                                         from './room-mixin.js'

import { PuppetTest } from '../../tests/fixtures/puppet-test/puppet-test.js'
import { DirtyType } from '../schemas/dirty.js'

test('ProtectedPropertyRoomMixin', async t => {
  type NotExistInMixin = Exclude<ProtectedPropertyRoomMixin, keyof InstanceType<RoomMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should match Mixin properties for every protected property')
})

test('batchRoomPayload: returns Map of payloads keyed by id', async t => {
  const puppet = new PuppetTest()
  await puppet.start()

  const raw = new Map<string, any>([
    [ 'room-a', { id: 'room-a', topic: 'A' } ],
    [ 'room-b', { id: 'room-b', topic: 'B' } ],
  ])
  puppet.batchRoomRawPayload    = async (_ids: string[]) => raw
  puppet.roomRawPayloadParser   = async (rawPayload: any) => rawPayload

  const result = await puppet.batchRoomPayload([ 'room-a', 'room-b' ])

  t.equal(result.size, 2, 'should return a Map of size 2')
  t.equal(result.get('room-a')?.topic, 'A', 'room-a payload parsed')
  t.equal(result.get('room-b')?.topic, 'B', 'room-b payload parsed')

  await puppet.stop()
})

test('batchRoomPayload: falls back to roomRawPayload when batchRoomRawPayload not provided', async t => {
  const puppet = new PuppetTest()
  await puppet.start()

  const ids = [ 'room-x', 'room-y' ]
  const fetched: string[] = []

  // Simulate a puppet that did not implement the batch RPC.
  ;(puppet as { batchRoomRawPayload?: unknown }).batchRoomRawPayload = undefined
  puppet.roomRawPayload       = async (roomId: string) => {
    fetched.push(roomId)
    return { id: roomId, topic: `topic-${roomId}` }
  }
  puppet.roomRawPayloadParser = async (rawPayload: any) => rawPayload

  const result = await puppet.batchRoomPayload(ids)

  t.same(fetched, ids, 'should fall back to per-id roomRawPayload calls')
  t.equal(result.size, 2, 'should still produce a payload per id')
  t.equal(result.get('room-x')?.topic, 'topic-room-x', 'room-x parsed via fallback')
  t.equal(result.get('room-y')?.topic, 'topic-room-y', 'room-y parsed via fallback')

  await puppet.stop()
})

test('batchRoomPayload: empty input returns empty Map', async t => {
  const puppet = new PuppetTest()
  await puppet.start()

  let batchCalled = false
  puppet.batchRoomRawPayload  = async (_ids: string[]) => {
    batchCalled = true
    return new Map<string, any>()
  }
  puppet.roomRawPayloadParser = async (rawPayload: any) => rawPayload

  const result = await puppet.batchRoomPayload([])

  t.ok(batchCalled, 'batchRoomRawPayload is still invoked with the empty list')
  t.equal(result.size, 0, 'should return an empty Map for empty input')

  await puppet.stop()
})

test('batchRoomPayload: rejects if underlying raw fetcher throws', async t => {
  const puppet = new PuppetTest()
  await puppet.start()

  puppet.batchRoomRawPayload  = async (_ids: string[]) => {
    throw new Error('boom')
  }
  puppet.roomRawPayloadParser = async (rawPayload: any) => rawPayload

  await t.rejects(
    puppet.batchRoomPayload([ 'room-err' ]),
    /boom/,
    'should propagate errors from batchRoomRawPayload',
  )

  await puppet.stop()
})

test('roomPayload: concurrent callers dedup to a single raw fetch', async t => {
  const puppet = new PuppetTest()
  await puppet.start()

  let rawCalls = 0
  puppet.roomRawPayload = async (id: string) => {
    rawCalls++
    await new Promise(resolve => setTimeout(resolve, 40))
    return { id, topic: `t-${id}` }
  }
  puppet.roomRawPayloadParser = async (raw: any) => raw

  const [ a, b ] = await Promise.all([
    puppet.roomPayload('r1'),
    puppet.roomPayload('r1'),
  ])

  t.equal(rawCalls, 1, 'raw fetcher fires exactly once for 2 concurrent callers')
  t.equal(a.id, 'r1')
  t.equal(b.id, 'r1')

  await puppet.stop()
})

test('roomPayload: dirty during in-flight fetch must not repopulate cache', async t => {
  const puppet = new PuppetTest()
  await puppet.start()

  let releaseRaw: () => void = () => {}
  const rawGate = new Promise<void>(resolve => { releaseRaw = resolve })

  puppet.roomRawPayload = async (id: string) => {
    await rawGate
    return { id, topic: 'stale' }
  }
  puppet.roomRawPayloadParser = async (raw: any) => raw

  const inflight = puppet.roomPayload('r2')
  puppet.cache.bumpGen(DirtyType.Room, 'r2')
  releaseRaw()
  await inflight

  t.equal(puppet.cache.room?.get('r2'), undefined,
    'LRU must NOT hold the stale payload after dirty-during-fetch')

  await puppet.stop()
})

/**
 * `batchRoomPayload` used to bypass `cache.room`. That meant a caller
 * batch-fetching 100 rooms would fetch every one again on the next
 * per-id `roomPayload(id)` call, defeating the whole point of the LRU.
 * The batch API must populate the same cache slot the per-id getter
 * reads.
 */
test('batchRoomPayload: writes fetched entries into cache.room', async t => {
  const puppet = new PuppetTest()
  await puppet.start()

  const raw = new Map<string, any>([
    [ 'rb-a', { id: 'rb-a', topic: 'A' } ],
    [ 'rb-b', { id: 'rb-b', topic: 'B' } ],
  ])
  puppet.batchRoomRawPayload  = async (_ids: string[]) => raw
  puppet.roomRawPayloadParser = async (rawPayload: any) => rawPayload

  await puppet.batchRoomPayload([ 'rb-a', 'rb-b' ])

  t.equal(puppet.cache.room?.get('rb-a')?.topic, 'A',
    'rb-a populated in cache.room by the batch call')
  t.equal(puppet.cache.room?.get('rb-b')?.topic, 'B',
    'rb-b populated in cache.room by the batch call')

  await puppet.stop()
})
