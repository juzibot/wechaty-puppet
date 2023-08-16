import {
  log,
} from '../config.js'

import type { PuppetSkeleton } from '../puppet/mod.js'

const verifyCodeMixin = <MixinBase extends typeof PuppetSkeleton>(mixinBase: MixinBase) => {

  abstract class VerifyCodeMixin extends mixinBase {

    constructor (...args: any[]) {
      super(...args)
      log.verbose('PuppetVerifyCodeMixin', 'constructor()')
    }

    abstract enterVerifyCode(id: string, code: string): Promise<void>

  }

  return VerifyCodeMixin
}

type VerifyCodeMixin = ReturnType<typeof verifyCodeMixin>
type ProtectedPropertyVerifyCodeMixin = never

export type {
  VerifyCodeMixin,
  ProtectedPropertyVerifyCodeMixin,
}
export { verifyCodeMixin }
