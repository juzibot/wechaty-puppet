import {
  log,
} from '../config.js'

import type { PuppetSkeleton } from '../puppet/puppet-skeleton.js'
import type { ConsultCardListRequest, ConsultCardListResponse, ContactIdExternalUserIdPair, IntentCommentPayload, PaginationRequest, PaginationResponse, PremiumOnlineAppointmentCardListRequest, PremiumOnlineAppointmentCardListResponse } from '../schemas/mod.js'
import type { CorpMessageInterceptionStrategy, RoomAntiSpamStrategy } from '../schemas/wecom.js'
import type { WxxdShopPayload } from '../schemas/wxxd-shop.js'
import type { WxxdProductPayload } from '../schemas/wxxd-product.js'
import type { WxxdOrderPayload, WxxdOrderDeliveryCompanyPayload, WxxdOrderDeliverySendRequest, WxxdOrderGenAfterSaleOrderRequest } from '../schemas/wxxd-order.js'

const imSpecificMixin = <MixinBase extends typeof PuppetSkeleton>(mixinBase: MixinBase) => {

  abstract class ImSpecificMixin extends mixinBase {

    constructor (...args: any[]) {
      super(...args)
      log.verbose('ImSpecificMixin', 'constructor()')
    }

    // Wecom

    abstract getContactExternalUserId (contactIds: string[], serviceProviderId?: string): Promise<ContactIdExternalUserIdPair[]>
    abstract getRoomAntiSpamStrategyList (): Promise<RoomAntiSpamStrategy[]>
    abstract getRoomAntiSpamStrategyEffectRoomList (strategyId: string): Promise<string[]>
    abstract applyRoomAntiSpamStrategy (strategyId: string, roomIds: string[], active: boolean): Promise<void>

    abstract getCorpMessageInterceptionStrategies (): Promise<CorpMessageInterceptionStrategy[]>

    // 抖音
    abstract listConsultCards                  (query: ConsultCardListRequest)                  : Promise<ConsultCardListResponse>
    abstract listPremiumOnlineAppointmentCards (query: PremiumOnlineAppointmentCardListRequest) : Promise<PremiumOnlineAppointmentCardListResponse>

    // 小红书
    abstract listIntentComments (query: PaginationRequest): Promise<PaginationResponse<IntentCommentPayload[]>>
    abstract intentCommentPayload (id: string): Promise<IntentCommentPayload>

    // 微信小店
    abstract wxxdShopPayload(): Promise<WxxdShopPayload>

    abstract listWxxdProducts(query: PaginationRequest): Promise<PaginationResponse<WxxdProductPayload[]>>
    abstract wxxdProductPayload(productId: string): Promise<WxxdProductPayload>

    abstract listWxxdOrders(query: PaginationRequest): Promise<PaginationResponse<WxxdOrderPayload[]>>
    abstract wxxdOrderPayload(orderId: string): Promise<WxxdOrderPayload>

    abstract updateWxxdMerchantnotes(orderId: string, merchantNotes: string): Promise<void>
    abstract getWxxdOrderDeliveryCompanyList(): Promise<WxxdOrderDeliveryCompanyPayload[]>
    abstract wxxdOrderDeliverySend(req: WxxdOrderDeliverySendRequest): Promise<void>
    abstract wxxdOrderGenAfterSaleOrder(req: WxxdOrderGenAfterSaleOrderRequest): Promise<void>
    
  }

  return ImSpecificMixin
}

type ImSpecificMixin = ReturnType<typeof imSpecificMixin>
type ProtectedPropertyImSpecificMixin = never

export type {
  ImSpecificMixin,
  ProtectedPropertyImSpecificMixin,
}
export { imSpecificMixin }
