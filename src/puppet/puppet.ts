/**
 *   Wechaty - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016-2018 Huan LI <zixia@zixia.net>
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */
import {
  log,
  VERSION,
}                       from '../config.js'

import type {
  PuppetOptions,
}                       from '../schemas/mod.js'
import {
  PayloadType,
}                       from '../schemas/mod.js'

import {
  cacheMixin,
  contactMixin,
  friendshipMixin,
  loginMixin,
  memoryMixin,
  messageMixin,
  miscMixin,
  roomInvitationMixin,
  roomMemberMixin,
  roomMixin,
  stateMixin,
  tagMixin,
  watchdogMixin,
}                        from '../mixins/mod.js'

import { PuppetSkelton }    from './skelton.js'

/**
 * Huan(202110): use compose() to compose mixins
 */
const MixinBase = miscMixin(
  messageMixin(
    roomInvitationMixin(
      tagMixin(
        friendshipMixin(
          roomMixin(
            roomMemberMixin(
              contactMixin(
                loginMixin(
                  memoryMixin(
                    cacheMixin(
                      watchdogMixin(
                        stateMixin(
                          PuppetSkelton,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  ),
)

/**
 *
 * Puppet Base Class
 *
 * See: https://github.com/wechaty/wechaty/wiki/Puppet
 *
 */
abstract class Puppet extends MixinBase {

  /**
   * Must overwrite by child class to identify their version
   */
  static readonly VERSION = VERSION

  /**
   * childPkg stores the `package.json` that the NPM module who extends the `Puppet`
   */
  // Huan(202108): Remove this property, because it the `hot-import` module is not a ESM compatible one
  // private readonly childPkg: normalize.Package

  /**
   *
   *
   * Constructor
   *
   *
   */
  constructor (
    public override options: PuppetOptions = {},
  ) {
    super(options)
    log.verbose('Puppet', 'constructor(%s) #%d', JSON.stringify(options), this.counter)
  }

  override toString () {
    let memoryName
    try {
      memoryName = this.memory.name
    } catch (_) {}

    return [
      'Puppet#',
      this.counter,
      '<',
      this.constructor.name,
      '>',
      '(',
      memoryName || 'NOMEMORY',
      ')',
    ].join('')
  }

  /**
   * The child puppet provider should put all start code inside `tryStart()`
   *  becasue the `start()` will call `tryStart()` with the state management.
   */
  abstract tryStart (): Promise<void>
  /**
   * The child puppet provider should put all start code inside `tryStop()`
   *  becasue the `stop()` will call `tryStop()` with the state management.
   */
  abstract tryStop  (): Promise<void>

  override async start () : Promise<void> {
    log.verbose('Puppet', 'start()')

    if (this.state.on()) {
      log.warn('Puppet', 'start() already on, skip')
      await this.state.ready()
      return
    }

    this.state.on('pending')

    try {
      /**
       * Call all the mixins start()
       */
      await super.start()
      /**
       * Call the child provider start()
       */
      await this.tryStart()

      /**
       * The puppet has been successfully started
       */
      this.state.on(true)

    } catch (e) {
      /**
       * The puppet has not been started
       */
      this.state.off(true)
      log.error('Puppet', 'start() rejection: %s', (e as Error).message)
      throw e
    }
  }

  override async stop (): Promise<void> {
    log.verbose('Puppet', 'stop()')

    if (this.state.off()) {
      log.warn('Puppet', 'stop() already off, skip')
      await this.state.ready()
      return
    }

    this.state.off('pending')

    try {
      /**
       * Call the child provider stop()
       */
      await this.tryStop()
      /**
       * Call all the mixins stop()
       */
      await super.stop()

      /**
       * The puppet has been successfully stopped
       */
      this.state.off(true)

    } catch (e) {
      /**
       * The puppet has not been stopped
       */
      log.error('Puppet', 'start() rejection: %s', (e as Error).message)
      throw e
    } finally {
      /**
       * Put the puppet into a stopped state
       *  no matter the `tryStop()` success or fail
       */
      this.state.off(true)
    }
  }

  /**
   *
   * dirty payload methods
   *  See: https://github.com/Chatie/grpc/pull/79
   *
   */

  async dirtyPayload (type: PayloadType, id: string): Promise<void> {
    log.verbose('Puppet', 'dirtyPayload(%s<%s>, %s)', PayloadType[type], type, id)

    switch (type) {
      case PayloadType.Message:
        return this.dirtyPayloadMessage(id)
      case PayloadType.Contact:
        return this.dirtyPayloadContact(id)
      case PayloadType.Room:
        return this.dirtyPayloadRoom(id)
      case PayloadType.RoomMember:
        return this.dirtyPayloadRoomMember(id)
      case PayloadType.Friendship:
        return this.dirtyPayloadFriendship(id)

      default:
        throw new Error('unknown payload type: ' + type)
    }
  }

  // private async dirtyPayloadContact (contactId: string): Promise<void> {
  //   log.verbose('Puppet', 'dirtyPayloadContact(%s)', contactId)
  //   this.payloadCache.contact.delete(contactId)
  // }

  private async dirtyPayloadFriendship (friendshipId: string): Promise<void> {
    log.verbose('Puppet', 'dirtyPayloadFriendship(%s)', friendshipId)
    this.cache.friendship.delete(friendshipId)
  }

  private async dirtyPayloadMessage (messageId: string): Promise<void> {
    log.verbose('Puppet', 'dirtyPayloadMessage(%s)', messageId)
    this.cache.message.delete(messageId)
  }

}

export {
  Puppet,
}
export default Puppet