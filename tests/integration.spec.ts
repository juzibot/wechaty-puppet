#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
// @ts-check

import { test }  from 'tstest'

import { PuppetTest } from './fixtures/puppet-test/puppet-test.js'

test('Integration testing', async t => {

  const puppet = new PuppetTest()

  t.ok(puppet, 'tbw')
})

test('PuppetTest wxxd (微信小店) new functions', async t => {
  const puppet = new PuppetTest()

  await t.resolves(
    puppet.listWxxdOrders({ pageSize: 10 }),
    'listWxxdOrders should resolve',
  )
  const ordersRes = await puppet.listWxxdOrders({ pageSize: 10 })
  t.ok(Array.isArray(ordersRes.response), 'listWxxdOrders should return response array')

  await t.resolves(
    puppet.wxxdOrderPayload('test-order-id'),
    'wxxdOrderPayload should resolve',
  )
  const orderPayload = await puppet.wxxdOrderPayload('test-order-id')
  t.ok(typeof orderPayload === 'object', 'wxxdOrderPayload should return object')

  await t.resolves(
    puppet.updateWxxdMerchantnotes('test-order-id', 'test-notes'),
    'updateWxxdMerchantnotes should resolve',
  )

  await t.resolves(
    puppet.getWxxdOrderDeliveryCompanyList(),
    'getWxxdOrderDeliveryCompanyList should resolve',
  )
  const companyList = await puppet.getWxxdOrderDeliveryCompanyList()
  t.ok(Array.isArray(companyList), 'getWxxdOrderDeliveryCompanyList should return array')

  await t.resolves(
    puppet.wxxdOrderDeliverySend({
      orderId: 'test-order-id',
      deliveryId: 'test-delivery-id',
      waybillId: 'test-waybill-id',
    }),
    'wxxdOrderDeliverySend should resolve',
  )

  await t.resolves(
    puppet.wxxdOrderGenAfterSaleOrder({
      orderId: 'test-order-id',
      reason: 'test-reason',
    }),
    'wxxdOrderGenAfterSaleOrder should resolve',
  )
})
