import {
  log,
} from '../config.js'

import type { PuppetSkeleton } from '../puppet/puppet-skeleton.js'
import type { CallControlPayload } from '../schemas/call.js'

/**
 * Explicit return type annotation truncates the TypeScript instantiation depth
 * for the callers (puppet-abstract.ts validateMixin chain) that otherwise trigger TS2589.
 */
type CallMixinReturn<MixinBase extends typeof PuppetSkeleton> =
  MixinBase & (abstract new (...args: any[]) => { callControl(payload: CallControlPayload): Promise<void> })

const callMixin = <MixinBase extends typeof PuppetSkeleton>(mixinBase: MixinBase): CallMixinReturn<MixinBase> => {

  abstract class CallMixin extends mixinBase {

    constructor (...args: any[]) {
      super(...args)
      log.verbose('PuppetCallMixin', 'constructor()')
    }

    /**
     * Send a call control signal to the remote party.
     * Implementations that do not support call signaling should
     * `throw throwUnsupportedError()` (see other puppet implementations' convention).
     */
    abstract callControl (payload: CallControlPayload): Promise<void>

  }

  return CallMixin as unknown as CallMixinReturn<MixinBase>
}

type CallMixin = ReturnType<typeof callMixin>
type ProtectedPropertyCallMixin = never

export type {
  CallMixin,
  ProtectedPropertyCallMixin,
}
export { callMixin }
