import type {
  Options as QuickLruOptions,
}                               from '@alloc/quick-lru'
import type QuickLru from '@alloc/quick-lru'

import {
  envVars,
  log,
}                         from '../config.js'
import type {
  ContactPayload,
}                         from '../schemas/contact.js'
import type {
  FriendshipPayload,
}                         from '../schemas/friendship.js'
import type {
  MessagePayload,
}                         from '../schemas/message.js'
import type {
  RoomMemberPayload,
  RoomPayload,
}                         from '../schemas/room.js'
import type {
  RoomInvitationPayload,
}                         from '../schemas/room-invitation.js'
import type {
  PuppetOptions,
}                         from '../schemas/puppet.js'
import type {
  PostPayload,
}                         from '../schemas/post.js'
import type { TagGroupPayload, TagPayload } from '../schemas/tag.js'
import type {
  WxxdProductPayload,
}                         from '../schemas/wxxd-product.js'
import type {
  WxxdOrderPayload,
}                         from '../schemas/wxxd-order.js'
import type {
  CallPayload,
}                         from '../schemas/call.js'
import type { DirtyType } from '../schemas/dirty.js'
import { WECHATY_PUPPET_DISABLE_LRU_CACHE } from '../env-vars.js'

type PayloadCacheOptions = Required<PuppetOptions>['cache']

interface LruRoomMemberPayload {
  [memberContactId: string]: RoomMemberPayload
}

class CacheAgent {

  contact?        : QuickLru<string, ContactPayload>
  friendship?     : QuickLru<string, FriendshipPayload>
  message?        : QuickLru<string, MessagePayload>
  post?           : QuickLru<string, PostPayload>
  room?           : QuickLru<string, RoomPayload>
  roomInvitation? : QuickLru<string, RoomInvitationPayload>
  roomMember?     : QuickLru<string, LruRoomMemberPayload>
  tag?            : QuickLru<string, TagPayload>
  tagGroup?       : QuickLru<string, TagGroupPayload>
  wxxdProduct?   : QuickLru<string, WxxdProductPayload>
  wxxdOrder?      : QuickLru<string, WxxdOrderPayload>
  call?           : QuickLru<string, CallPayload>

  readonly disabled: boolean

  /**
   * Per (payloadType, id) generation counter.
   *
   * `dirtyPayload` in CacheMixin bumps the counter *before* the `dirty`
   * event is emitted. Payload getters snapshot the counter before the
   * raw fetch and re-check it before the LRU set: if the counter has
   * moved, the fetch is stale-with-respect-to a dirty and the write is
   * skipped. The stored value is never zero -- callers do not
   * dereference the map directly.
   */
  private readonly __gen: Map<string, number> = new Map()

  /**
   * In-flight raw-payload promises keyed by `${type}:${id}` (or any
   * caller-chosen scheme). Payload getters share a single Promise per
   * key so N concurrent callers only trigger one raw fetch.
   */
  private readonly __inflight: Map<string, Promise<any>> = new Map()

  constructor (
    protected options?: PayloadCacheOptions,
  ) {
    log.verbose('PuppetCacheAgent', 'constructor(%s)',
      options
        ? JSON.stringify(options)
        : '',
    )
    this.disabled = WECHATY_PUPPET_DISABLE_LRU_CACHE(options?.disable)

  }

  async start (): Promise<void> {
    log.verbose('PuppetCacheAgent', 'start()')

    /**
     * Setup LRU Caches
     */

    if (!this.disabled) {
      const QuickLruConstructor = ((await import('@alloc/quick-lru')) as any).default
      const createQuickLru = <T, K>(options: QuickLruOptions<T, K>) => {
        return new QuickLruConstructor(options) as QuickLru<T, K>
      }

      const lruOptions = (maxSize = 100): QuickLruOptions<any, any> => ({
        maxAge: 15 * 60 * 1000, // 15 minutes
        maxSize,
      })

      this.contact = createQuickLru<string, ContactPayload>(lruOptions(
        envVars.WECHATY_PUPPET_LRU_CACHE_SIZE_CONTACT(this.options?.contact)),
      )
      this.friendship = createQuickLru<string, FriendshipPayload>(lruOptions(
        envVars.WECHATY_PUPPET_LRU_CACHE_SIZE_FRIENDSHIP(this.options?.friendship)),
      )
      this.message = createQuickLru<string, MessagePayload>(lruOptions(
        envVars.WECHATY_PUPPET_LRU_CACHE_SIZE_MESSAGE(this.options?.message)),
      )
      this.roomInvitation = createQuickLru<string, RoomInvitationPayload>(lruOptions(
        envVars.WECHATY_PUPPET_LRU_CACHE_SIZE_ROOM_INVITATION(this.options?.roomInvitation)),
      )
      this.roomMember = createQuickLru<string, LruRoomMemberPayload>(lruOptions(
        envVars.WECHATY_PUPPET_LRU_CACHE_SIZE_ROOM_MEMBER(this.options?.roomMember)),
      )
      this.room = createQuickLru<string, RoomPayload>(lruOptions(
        envVars.WECHATY_PUPPET_LRU_CACHE_SIZE_ROOM(this.options?.room)),
      )
      this.post = createQuickLru<string, PostPayload>(lruOptions(
        envVars.WECHATY_PUPPET_LRU_CACHE_SIZE_POST(this.options?.post)),
      )
      this.tag = createQuickLru<string, TagPayload>(lruOptions(
        envVars.WECHATY_PUPPET_LRU_CACHE_SIZE_TAG(this.options?.tag)),
      )
      this.tagGroup = createQuickLru<string, TagGroupPayload>(lruOptions(
        envVars.WECHATY_PUPPET_LRU_CACHE_SIZE_TAG_GROUP(this.options?.tagGroup)),
      )
      this.wxxdProduct = createQuickLru<string, WxxdProductPayload>(lruOptions(
        envVars.WECHATY_PUPPET_LRU_CACHE_SIZE_WXXD_PRODUCT(this.options?.wxxdProduct)),
      )
      this.wxxdOrder = createQuickLru<string, WxxdOrderPayload>(lruOptions(
        envVars.WECHATY_PUPPET_LRU_CACHE_SIZE_WXXD_ORDER(this.options?.wxxdOrder)),
      )
      this.call = createQuickLru<string, CallPayload>(lruOptions(
        envVars.WECHATY_PUPPET_LRU_CACHE_SIZE_CALL(this.options?.call)),
      )
    }

  }

  stop (): void {
    log.verbose('PuppetCacheAgent', 'stop()')
    this.clear()
  }

  /**
   * FIXME: Huan(202008) clear cache when stop
   *  keep the cache as a temp workaround since wechaty-puppet-service has reconnect issue
   *  with un-cleared cache in wechaty-puppet will make the reconnect recoverable
   *
   * Related issue: https://github.com/wechaty/wechaty-puppet-service/issues/31
   *
   * Update:
   *  Huan(2021-08-28): clear the cache when stop
   */
  clear (): void {
    log.verbose('PuppetCacheAgent', 'clear()')

    this.contact?.clear()
    this.friendship?.clear()
    this.message?.clear()
    this.post?.clear()
    this.room?.clear()
    this.roomInvitation?.clear()
    this.roomMember?.clear()
    this.tag?.clear()
    this.tagGroup?.clear()
    this.wxxdProduct?.clear()
    this.wxxdOrder?.clear()
    this.call?.clear()

    this.__gen.clear()
    this.__inflight.clear()
  }

  /**
   * Bump the generation counter for a (payloadType, id) so any snapshot
   * taken before this call is now considered stale. Called from
   * `CacheMixin.dirtyPayload` before the `dirty` event is scheduled.
   */
  bumpGen (type: DirtyType, id: string): void {
    const key = this.__genKey(type, id)
    this.__gen.set(key, (this.__gen.get(key) ?? 0) + 1)
  }

  /**
   * Snapshot the current generation for a (payloadType, id). Payload
   * getters MUST call this before the raw fetch and pass the result to
   * `isFreshWrite` before setting the LRU.
   */
  snapshotGen (type: DirtyType, id: string): number {
    return this.__gen.get(this.__genKey(type, id)) ?? 0
  }

  /**
   * True iff no `bumpGen` for the same key has been observed since the
   * snapshot was taken -- i.e. writing the LRU now is not overriding a
   * dirty that arrived during the raw fetch.
   */
  isFreshWrite (type: DirtyType, id: string, snapshot: number): boolean {
    return this.snapshotGen(type, id) === snapshot
  }

  /**
   * @internal test hook -- exposes the internal gen map size so specs
   * can pin the round-3 no-prune invariant (an earlier revision drained
   * this map from `CacheMixin.onDirty`'s `finally`, reopening the
   * first-dirty race; see the "no-prune invariant" spec).
   */
  __genSize (): number {
    return this.__gen.size
  }

  private __genKey (type: DirtyType, id: string): string {
    return `${type}:${id}`
  }

  __inflightGet<T> (key: string): Promise<T> | undefined {
    return this.__inflight.get(key) as Promise<T> | undefined
  }

  __inflightSet<T> (key: string, promise: Promise<T>): void {
    this.__inflight.set(key, promise)
  }

  __inflightDelete (key: string): void {
    this.__inflight.delete(key)
  }

}

export type { PayloadCacheOptions }
export { CacheAgent }
