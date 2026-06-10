import type { Constructor } from 'clone-class'

import type { MixinProtectedProperty } from '../mixins/mod.js'
import type { PuppetSkeletonProtectedProperty } from './puppet-skeleton.js'
import type { Puppet } from './puppet-abstract.js'

type PuppetProtectedProperty =
  | MixinProtectedProperty
  | PuppetSkeletonProtectedProperty

// https://stackoverflow.com/questions/44983560/how-to-exclude-a-key-from-an-interface-in-typescript
// @ts-ignore TS2589: ignore excessive depth from growing mixin chain
type PuppetInterface = Omit<
  Puppet,
  PuppetProtectedProperty | `_${string}`
>

type PuppetConstructor = Constructor<PuppetInterface>

export type {
  PuppetProtectedProperty,
  PuppetConstructor,
  PuppetInterface,
}
