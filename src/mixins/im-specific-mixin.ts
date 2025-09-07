import {
  log,
} from '../config.js'

import type { PuppetSkeleton } from '../puppet/puppet-skeleton.js'
import type { ConsultCardListRequest, ConsultCardListResponse, ContactIdExternalUserIdPair, PremiumOnlineAppointmentCardListRequest, PremiumOnlineAppointmentCardListResponse } from '../schemas/mod.js'
import type { CorpMessageInterceptionStrategy, RoomAntiSpamStrategy } from '../schemas/wecom.js'

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

    abstract listConsultCards                  (query: ConsultCardListRequest)                  : Promise<ConsultCardListResponse>
    abstract listPremiumOnlineAppointmentCards (query: PremiumOnlineAppointmentCardListRequest) : Promise<PremiumOnlineAppointmentCardListResponse>

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
