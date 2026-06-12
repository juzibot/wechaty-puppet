#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
}           from 'tstest'

import type {
  CallMediaEndpointPayload,
  CallMediaType,
}                                   from '../schemas/call.js'

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

test('CallMixin abstract method signatures', async t => {
  type Instance = InstanceType<CallMixin>

  type HasCallInvite = Instance extends { callInvite (contactIds: string[], media: CallMediaType): Promise<string> } ? true : false
  const hasCallInvite: HasCallInvite = true
  t.ok(hasCallInvite, 'should declare callInvite(contactIds, media): Promise<string>')

  type HasCallAdd = Instance extends { callAdd (callId: string, contactIds: string[]): Promise<void> } ? true : false
  const hasCallAdd: HasCallAdd = true
  t.ok(hasCallAdd, 'should declare callAdd(callId, contactIds): Promise<void>')

  type HasCallMediaEndpoint = Instance extends { callMediaEndpoint (callId: string): Promise<CallMediaEndpointPayload> } ? true : false
  const hasCallMediaEndpoint: HasCallMediaEndpoint = true
  t.ok(hasCallMediaEndpoint, 'should declare callMediaEndpoint(callId): Promise<CallMediaEndpointPayload>')

  type HasCallAccept = Instance extends { callAccept (callId: string): Promise<void> } ? true : false
  const hasCallAccept: HasCallAccept = true
  t.ok(hasCallAccept, 'should declare callAccept(callId): Promise<void>')

  type HasCallReject = Instance extends { callReject (callId: string, reason?: string): Promise<void> } ? true : false
  const hasCallReject: HasCallReject = true
  t.ok(hasCallReject, 'should declare callReject(callId, reason?): Promise<void>')

  type HasCallCancel = Instance extends { callCancel (callId: string): Promise<void> } ? true : false
  const hasCallCancel: HasCallCancel = true
  t.ok(hasCallCancel, 'should declare callCancel(callId): Promise<void>')

  type HasCallHangup = Instance extends { callHangup (callId: string, reason?: string): Promise<void> } ? true : false
  const hasCallHangup: HasCallHangup = true
  t.ok(hasCallHangup, 'should declare callHangup(callId, reason?): Promise<void>')
})
