#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
}           from 'tstest'

import type {
  CallMixin,
  ProtectedPropertyCallMixin,
}                                   from './call-mixin.js'

test('ProtectedPropertyCallMixin', async t => {
  type NotExistInMixin = Exclude<ProtectedPropertyCallMixin, keyof InstanceType<CallMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
