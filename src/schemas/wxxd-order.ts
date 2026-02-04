import type { WxxdProductExtraServicePayload } from './wxxd-product.js'

export enum WxxdOrderStatus {
  /** 待付款 */
  Unpaid = 10,
  /** 礼物待收下 */
  GiftPending = 12,
  /** 一起买待成团 */
  GroupPending = 13,
  /** 待发货（已付款） */
  Paid = 20,
  /** 部分发货 */
  PartialDelivery = 21,
  /** 待收货（已发货） */
  Delivered = 30,
  /** 已完成 */
  Completed = 100,
  /** 已取消（全部商品售后完成） */
  Cancelled = 200,
  /** 未付款用户主动取消或超时未付款订单自动取消 */
  DepositPaid = 250,
}

export interface WxxdOrderSkuAttrPayload {
  attrKey: string;
  attrValue: string;
}

export interface WxxdOrderExtInfoPayload {
  customerNotes: string,
  merchantNotes: string,
}

export interface WxxdOrderProductPayload {
  productId: string,
  skuId: string,
  thumbImage: string,
  salePrice: number,
  skuCnt: number,
  title: string,
  marketPrice: number,
  realPrice: number,
  extraService: WxxdProductExtraServicePayload,
  isDiscounted: boolean,
  skuAttrs: WxxdOrderSkuAttrPayload[],
}

export interface WxxdOrderPayload {
  orderId: string,
  openId: string,
  status: WxxdOrderStatus,
  createTime: number,
  updateTime: number,
  products: WxxdOrderProductPayload[],
  extInfo: WxxdOrderExtInfoPayload,
}

export interface WxxdOrderDeliveryCompanyPayload {
  deliveryId: string,
  deliveryName: string,
}

export interface WxxdOrderDeliverySendRequest {
  orderId: string,
  deliveryId: string,
  waybillId: string,
}

export interface WxxdOrderGenAfterSaleOrderRequest {
  orderId: string,
  reason: string,
}