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
  await new Promise(resolve => setImmediate(resolve))
  await new Promise(resolve => setImmediate(resolve))
  await new Promise(resolve => setTimeout(resolve, 20))

  process.off('uncaughtException', onUncaught)

  t.equal(caught.length, 0,
    `Unspecified dirty should not raise uncaughtException, but got: ${caught.map(e => e.message).join(', ')}`,
  )

  await puppet.stop()
})

/**
 * Regression: `__dirtyPayloadAwait` calls `this.dirtyPayload(type, id)`
 * without awaiting. The base `dirtyPayload` is synchronous, but
 * subclasses (notably puppet-service) override it as `async` and may
 * reject (e.g. on transient gRPC failure). The unawaited rejection
 * then surfaces as an `unhandledRejection`.
 *
 * The fix must surface the rejection through logging without leaking
 * it to the process-level unhandledRejection handler.
 */
/**
 * Regression: `__dirtyPayloadAwait` waits up to 5s for a `dirty` event
 * that echoes back from the server. When the server never delivers (or
 * an override no-ops the emit path), the previous implementation just
 * logged a warning and returned -- the local LRU stayed populated with
 * whatever stale value it held, poisoning the next `xxxPayload(id)`
 * call for up to the LRU maxAge (15m).
 *
 * The fix: on timeout, invoke the same local-cache invalidator that
 * `onDirty` runs -- so the local LRU at least gets cleaned even when
 * the remote round-trip fails.
 */
test('__dirtyPayloadAwait: 5s timeout falls back to local LRU delete', async t => {
  const puppet = new TestPuppet() as any
  await puppet.start()
  puppet.__currentUserId = 'me'

  // Seed the local LRU with a stale value.
  puppet.cache.contact?.set('c-stale', { id: 'c-stale' } as any)
  t.ok(puppet.cache.contact?.get('c-stale'), 'sanity: stale entry seeded')

  // No-op dirtyPayload -- simulates a puppet-service whose emit-path
  // is disabled or a server that never echoes back.
  puppet.dirtyPayload = () => {}

  // Await the full 5s timeout window; must resolve, not throw.
  await puppet.__dirtyPayloadAwait(DirtyType.Contact, 'c-stale')

  t.equal(puppet.cache.contact?.get('c-stale'), undefined,
    'local LRU entry removed by timeout fallback')

  await puppet.stop()
})

test('__dirtyPayloadAwait must handle rejection from an overridden async dirtyPayload', async t => {
  const puppet = new TestPuppet() as any
  await puppet.start()
  // pretend the puppet is logged in so __dirtyPayloadAwait does not early-return
  puppet.__currentUserId = 'me'

  // Override dirtyPayload as an async-rejecting method (simulating
  // puppet-service when its gRPC dirtyPayload RPC fails).
  puppet.dirtyPayload = async () => {
    throw new Error('simulated gRPC dirtyPayload failure')
  }

  const unhandled: any[] = []
  const onUnhandled = (reason: any) => unhandled.push(reason)
  process.on('unhandledRejection', onUnhandled)

  // Call __dirtyPayloadAwait. The 5s internal timeout for the awaited
  // future is unavoidable today; we let it elapse.
  await puppet.__dirtyPayloadAwait(DirtyType.Contact, 'contact-id-x')

  // Give Node a tick to surface any pending unhandled rejection.
  await new Promise(resolve => setImmediate(resolve))
  await new Promise(resolve => setImmediate(resolve))

  process.off('unhandledRejection', onUnhandled)

  t.equal(
    unhandled.length,
    0,
    `dirtyPayload rejection must be captured, not leaked as unhandledRejection (got ${unhandled.length})`,
  )

  await puppet.stop()
})
