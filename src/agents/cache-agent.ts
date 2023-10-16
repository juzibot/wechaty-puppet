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
import { Constructor } from 'clone-class'

type PayloadCacheOptions = Required<PuppetOptions>['cache']

interface LruRoomMemberPayload {
  [memberContactId: string]: RoomMemberPayload
}

class CacheAgent {

  readonly contact?        : QuickLru<string, ContactPayload>
  readonly friendship?     : QuickLru<string, FriendshipPayload>
  readonly message?        : QuickLru<string, MessagePayload>
  readonly post?           : QuickLru<string, PostPayload>
  readonly room?           : QuickLru<string, RoomPayload>
  readonly roomInvitation? : QuickLru<string, RoomInvitationPayload>
  readonly roomMember?     : QuickLru<string, LruRoomMemberPayload>
  readonly tag?            : QuickLru<string, TagPayload>
  readonly tagGroup?       : QuickLru<string, TagGroupPayload>

  readonly disabled: boolean

  constructor (
    protected options?: PayloadCacheOptions,
  ) {
    log.verbose('PuppetCacheAgent', 'constructor(%s)',
      options
        ? JSON.stringify(options)
        : '',
    )

    /**
     * Setup LRU Caches
     */

    this.disabled = WECHATY_PUPPET_DISABLE_LRU_CACHE(options.disable)
    if (!this.disabled) {
      const QuickLruConstructor = require('@alloc/quick-lru').QuickLru as Constructor<QuickLru>

      const lruOptions = (maxSize = 100): QuickLruOptions<any, any> => ({
        maxAge: 15 * 60 * 1000 * 1000, // 15 minutes
        maxSize,
      })

      this.contact = new QuickLruConstructor(lruOptions(
        envVars.WECHATY_PUPPET_LRU_CACHE_SIZE_CONTACT(options?.contact)),
      )
      this.friendship = new QuickLruConstructor(lruOptions(
        envVars.WECHATY_PUPPET_LRU_CACHE_SIZE_FRIENDSHIP(options?.friendship)),
      )
      this.message = new QuickLruConstructor(lruOptions(
        envVars.WECHATY_PUPPET_LRU_CACHE_SIZE_MESSAGE(options?.message)),
      )
      this.roomInvitation = new QuickLruConstructor(lruOptions(
        envVars.WECHATY_PUPPET_LRU_CACHE_SIZE_ROOM_INVITATION(options?.roomInvitation)),
      )
      this.roomMember = new QuickLruConstructor(lruOptions(
        envVars.WECHATY_PUPPET_LRU_CACHE_SIZE_ROOM_MEMBER(options?.roomMember)),
      )
      this.room = new QuickLruConstructor(lruOptions(
        envVars.WECHATY_PUPPET_LRU_CACHE_SIZE_ROOM(options?.room)),
      )
      this.post = new QuickLruConstructor(lruOptions(
        envVars.WECHATY_PUPPET_LRU_CACHE_SIZE_POST(options?.post)),
      )
      this.tag = new QuickLruConstructor(lruOptions(
        envVars.WECHATY_PUPPET_LRU_CACHE_SIZE_TAG(options?.tag)),
      )
      this.tagGroup = new QuickLruConstructor(lruOptions(
        envVars.WECHATY_PUPPET_LRU_CACHE_SIZE_TAG_GROUP(options?.tagGroup)),
      )
    }

  }

  start (): void {
    log.verbose('PuppetCacheAgent', 'start()')
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
