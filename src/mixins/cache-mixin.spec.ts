#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
}           from 'tstest'

import type {
  CacheMixin,
  ProtectedPropertyCacheMixin,
}                               from './cache-mixin.js'

import { Puppet }    from '../puppet/mod.js'
import { DirtyType } from '../schemas/dirty.js'

test('ProtectedPropertyCacheMixin', async t => {
  type NotExistInMixin = Exclude<ProtectedPropertyCacheMixin, keyof InstanceType<CacheMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should match Mixin properties for every protected property')
})

/**
 * Minimal concrete puppet that satisfies the abstract type contract only
 * structurally -- we never call the abstract methods in these tests.
 * `onStart`/`onStop` are required by the service-mixin lifecycle.
 */
class TestPuppet extends (Puppet as any) {

  async onStart (): Promise<void> {}
  async onStop  (): Promise<void> {}

}

/**
 * Regression: a `dirty` event with payloadType=Unspecified must not crash
 * the process. The previous implementation throws synchronously inside
 * the dirtyFuncMap, and because `dirtyPayload` schedules the emit through
 * setImmediate, the throw lands in a setImmediate callback with no
 * surrounding try/catch -- which becomes an uncaughtException.
 */
test('onDirty(Unspecified) must NOT crash the process via uncaughtException', async t => {
  const puppet = new TestPuppet() as any
  await puppet.start()

  const caught: Error[] = []
  const onUncaught = (e: Error) => caught.push(e)
  process.on('uncaughtException', onUncaught)

  puppet.dirtyPayload(DirtyType.Unspecified, 'no-such-id')

  // Allow the setImmediate scheduled by dirtyPayload to fire.
  await new Promise(r => setImmediate(r))
  await new Promise(r => setImmediate(r))
  await new Promise(r => setTimeout(r, 20))

  process.off('uncaughtException', onUncaught)

  t.equal(caught.length, 0,
    `Unspecified dirty should not raise uncaughtException, but got: ${caught.map(e => e.message).join(', ')}`,
  )

  await puppet.stop()
})
