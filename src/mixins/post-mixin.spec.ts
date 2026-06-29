#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
}           from 'tstest'

import type {
  PostMixin,
  ProtectedPropertyPostMixin,
}                                   from './post-mixin.js'

import { Puppet } from '../puppet/mod.js'

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
