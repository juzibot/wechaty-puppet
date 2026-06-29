#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
}           from 'tstest'

import type {
  MessageMixin,
  ProtectedPropertyMessageMixin,
}                                   from './message-mixin.js'

import { Puppet } from '../puppet/mod.js'

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
