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

  readonly disabled: boolean

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
        maxAge: 15 * 60 * 1000 * 1000, // 15 minutes
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
  }

}

export type { PayloadCacheOptions }
export { CacheAgent }
