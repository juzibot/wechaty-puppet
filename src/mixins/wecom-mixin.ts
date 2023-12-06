import {
  log,
} from '../config.js'

import type { PuppetSkeleton } from '../puppet/puppet-skeleton.js'
import type { ContactIdExternalUserIdPair } from '../schemas/mod.js'

const wecomMixin = <MixinBase extends typeof PuppetSkeleton>(mixinBase: MixinBase) => {

  abstract class WecomMixin extends mixinBase {

    constructor (...args: any[]) {
      super(...args)
      log.verbose('WecomMixin', 'constructor()')
    }

    override async start (): Promise<void> {
      log.verbose('WecomMixin', 'start()')
      await super.start()
    }

    override async stop (): Promise<void> {
      log.verbose('WecomMixin', 'stop()')

      /**
       * Huan(202201) NOTE: super.stop() should be the last line of this method
       *  becasue we should keep the reverse order of logic in start()
       */
      await super.stop()
    }

    abstract getContactExternalUserId (contactIds: string[], serviceProviderId?: string): Promise<ContactIdExternalUserIdPair[]>

  }

  return WecomMixin
}

type WecomMixin = ReturnType<typeof wecomMixin>

export type {
  WecomMixin,
}
export { wecomMixin }
