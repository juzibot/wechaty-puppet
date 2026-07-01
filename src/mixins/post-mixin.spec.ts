#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
}           from 'tstest'

import type {
  PostMixin,
  ProtectedPropertyPostMixin,
}                                   from './post-mixin.js'

import { Puppet }    from '../puppet/mod.js'
import { DirtyType } from '../schemas/dirty.js'

test('ProtectedPropertyPostMixin', async t => {
  type NotExistInMixin = Exclude<ProtectedPropertyPostMixin, keyof InstanceType<PostMixin>>
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
 * Regression mirror of messageList(): `postList()` had the same
 * `[ ...this.cache.post!.keys() ]` shape guarded only by
 * `cache.disabled`. Between CacheAgent construction and the async
 * `cache.start()` resolving, the LRU is still undefined and the
 * non-null assertion would crash.
 */
test('postList() must not throw before cache.start() resolves', async t => {
  const puppet = new TestPuppet() as any
  // intentionally do NOT await start
  let result: string[] | undefined
  t.doesNotThrow(() => { result = puppet.postList() }, 'pre-start postList must not throw')
  t.same(result, [], 'postList returns [] when LRU is not yet built')
})

test('postPayload: concurrent callers dedup to a single raw fetch', async t => {
  const puppet = new TestPuppet() as any
  await puppet.start()

  let rawCalls = 0
  puppet.postRawPayload = async (id: string) => {
    rawCalls++
    await new Promise(resolve => setTimeout(resolve, 40))
    return { id, body: `b-${id}` }
  }
  puppet.postRawPayloadParser = async (raw: any) => raw

  const [ a, b ] = await Promise.all([
    puppet.postPayload('p1'),
    puppet.postPayload('p1'),
  ])

  t.equal(rawCalls, 1, 'raw fetcher fires exactly once for 2 concurrent callers')
  t.equal(a.id, 'p1')
  t.equal(b.id, 'p1')

  await puppet.stop()
})

test('postPayload: dirty during in-flight fetch must not repopulate cache', async t => {
  const puppet = new TestPuppet() as any
  await puppet.start()

  let releaseRaw: () => void = () => {}
  const rawGate = new Promise<void>(resolve => { releaseRaw = resolve })

  puppet.postRawPayload = async (id: string) => {
    await rawGate
    return { id, body: 'stale' }
  }
  puppet.postRawPayloadParser = async (raw: any) => raw

  const inflight = puppet.postPayload('p2')
  puppet.cache.bumpGen(DirtyType.Post, 'p2')
  releaseRaw()
  await inflight

  t.equal(puppet.cache.post?.get('p2'), undefined,
    'LRU must NOT hold the stale payload after dirty-during-fetch')

  await puppet.stop()
})
