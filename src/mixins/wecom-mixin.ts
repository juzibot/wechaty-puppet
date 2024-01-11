import {
  log,
} from '../config.js'

import type { PuppetSkeleton } from '../puppet/puppet-skeleton.js'
import type { ContactIdExternalUserIdPair } from '../schemas/mod.js'
import type { RoomAntiSpamStrategy } from '../schemas/wecom.js'

const wecomMixin = <MixinBase extends typeof PuppetSkeleton>(mixinBase: MixinBase) => {

  abstract class WecomMixin extends mixinBase {

    constructor (...args: any[]) {
      super(...args)
      log.verbose('WecomMixin', 'constructor()')
    }

    abstract getContactExternalUserId (contactIds: string[], serviceProviderId?: string): Promise<ContactIdExternalUserIdPair[]>
    abstract getRoomAntiSpamStrategyList (): Promise<RoomAntiSpamStrategy[]>
    abstract getRoomAntiSpamStrategyEffectRoomList (strategyId: string): Promise<string[]>
    abstract applyRoomAntiSpamStrategy (strategyId: string, roomIds: string[], active: boolean): Promise<void>

  }

  return WecomMixin
}

type WecomMixin = ReturnType<typeof wecomMixin>
type ProtectedPropertyWecomMixin = never

export type {
  WecomMixin,
  ProtectedPropertyWecomMixin,
}
export { wecomMixin }
