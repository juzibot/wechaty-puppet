import {
  log,
} from '../config.js'

import type { PuppetSkeleton } from '../puppet/puppet-skeleton.js'
import type { CallControlPayload } from '../schemas/call.js'
import { throwUnsupportedError } from '../throw-unsupported-error.js'

const callMixin = <MixinBase extends typeof PuppetSkeleton>(mixinBase: MixinBase) => {

  abstract class CallMixin extends mixinBase {

    constructor (...args: any[]) {
      super(...args)
      log.verbose('PuppetCallMixin', 'constructor()')
    }

    /**
     * Send a call control signal to the remote party.
     *
     * The default implementation throws UnsupportedError — whether a puppet
     * supports call control is decided by the puppet implementation.
     * Not declared abstract intentionally, so existing puppet implementations
     * are not forced to implement it when upgrading this package.
     */
    callControl (payload: CallControlPayload): Promise<void> {
      log.verbose('PuppetCallMixin', 'callControl(%s)', JSON.stringify(payload))
      throw throwUnsupportedError(payload)
    }

  }

  return CallMixin
}

type CallMixin = ReturnType<typeof callMixin>
type ProtectedPropertyCallMixin = never

export type {
  CallMixin,
  ProtectedPropertyCallMixin,
}
export { callMixin }
