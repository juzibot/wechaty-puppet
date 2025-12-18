import type { ExtraServicePayload } from './wxxd-product.js'

export enum OrderStatus {
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

export interface WxxdOrderPayload {
  orderId: string,
  openId: string,
  status: OrderStatus,
  createTime: number,
  updateTime: number,
  products: OrderProductPayload[],
  extInfo: OrderExtInfoPayload,
}

export interface OrderProductPayload {
  productId: string,
  skuId: string,
  thumbImage: string,
  salePrice: number,
  skuCnt: number,
  title: string,
  marketPrice: number,
  realPrice: number,
  extraService: ExtraServicePayload,
  isDiscounted: boolean,
  skuAttrs: SkuAttrPayload[],
}

export interface OrderExtInfoPayload {
  customerNotes: string,
  merchantNotes: string,
}

export interface SkuAttrPayload {
  attrKey: string;
  attrValue: string;
}