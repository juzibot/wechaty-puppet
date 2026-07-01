#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
}           from 'tstest'

import type {
  MessageMixin,
  ProtectedPropertyMessageMixin,
}                                   from './message-mixin.js'

import { Puppet }    from '../puppet/mod.js'
import { DirtyType } from '../schemas/dirty.js'

test('ProtectedPropertyMessageMixin', async t => {
  type NotExistInMixin = Exclude<ProtectedPropertyMessageMixin, keyof InstanceType<MessageMixin>>
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
 * Regression: `messageList()` was `[ ...this.cache.message!.keys() ]`,
 * guarded only by `cache.disabled`. The `disabled` flag is set
 * synchronously in CacheAgent's constructor, but the LRU instances
 * are created later inside the async `cache.start()` (it dynamically
 * imports @alloc/quick-lru). Between construction and start,
 * `cache.disabled === false` but `cache.message === undefined`, so
 * the non-null assertion crashes with
 * "Cannot read properties of undefined (reading 'keys')".
 *
 * Any pre-start caller (e.g. wechaty during early lifecycle, or a
 * crash-recovery loop) trips this.
 */
test('messageList() must not throw before cache.start() resolves', async t => {
  const puppet = new TestPuppet() as any
  // Note: intentionally do NOT await puppet.start() -- we want the
  // narrow window after constructor but before cache.start() resolves.

  t.equal(
    typeof puppet.messageList,
    'function',
    'sanity: messageList is defined on the prototype',
  )

  let result: string[] | undefined
  t.doesNotThrow(
    () => { result = puppet.messageList() },
    'messageList() should not throw on a pre-start puppet',
  )
  t.same(result, [], 'messageList() should return [] when the LRU is not yet built')
})

test('messageList() must not throw while cache.start() is pending', async t => {
  const puppet = new TestPuppet() as any
  const startPromise = puppet.start()   // fire, do not await
  t.doesNotThrow(() => puppet.messageList(), 'pending-start call must not throw')
  await startPromise
  t.same(puppet.messageList(), [], 'still empty after start resolves')
  await puppet.stop()
})

test('messagePayload: concurrent callers dedup to a single raw fetch', async t => {
  const puppet = new TestPuppet() as any
  await puppet.start()

  let rawCalls = 0
  puppet.messageRawPayload = async (id: string) => {
    rawCalls++
    await new Promise(resolve => setTimeout(resolve, 40))
    return { id, text: `t-${id}` }
  }
  puppet.messageRawPayloadParser = async (raw: any) => raw

  const [ a, b ] = await Promise.all([
    puppet.messagePayload('m1'),
    puppet.messagePayload('m1'),
  ])

  t.equal(rawCalls, 1, 'raw fetcher fires exactly once for 2 concurrent callers')
  t.equal(a.id, 'm1')
  t.equal(b.id, 'm1')

  await puppet.stop()
})

test('messagePayload: dirty during in-flight fetch must not repopulate cache', async t => {
  const puppet = new TestPuppet() as any
  await puppet.start()

  let releaseRaw: () => void = () => {}
  const rawGate = new Promise<void>(resolve => { releaseRaw = resolve })

  puppet.messageRawPayload = async (id: string) => {
    await rawGate
    return { id, text: 'stale' }
  }
  puppet.messageRawPayloadParser = async (raw: any) => raw

  const inflight = puppet.messagePayload('m2')
  puppet.cache.bumpGen(DirtyType.Message, 'm2')
  releaseRaw()
  await inflight

  t.equal(puppet.cache.message?.get('m2'), undefined,
    'LRU must NOT hold the stale payload after dirty-during-fetch')

  await puppet.stop()
})
