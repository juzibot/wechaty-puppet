import {
  timeoutPromise,
}                           from 'gerror'

import { STRING_SPLITTER, log }  from '../config.js'

import type {
  PuppetOptions,
  EventDirtyPayload,
}                               from '../schemas/mod.js'
import { DirtyType }          from '../schemas/mod.js'

import { CacheAgent }           from '../agents/mod.js'

import type { PuppetSkeleton }   from '../puppet/mod.js'

import type { LoginMixin } from './login-mixin.js'

/**
 *
 * Huan(202111) Issue #158 - Refactoring the 'dirty' event, dirtyPayload(),
 *  and XXXPayloadDirty() methods logic & spec
 *
 *    @see https://github.com/wechaty/puppet/issues/158
 *
 */
const cacheMixin = <MixinBase extends typeof PuppetSkeleton & LoginMixin>(mixinBase: MixinBase) => {

  abstract class CacheMixin extends mixinBase {

    cache: CacheAgent

    __cacheMixinCleanCallbackList: (() => void)[]

    constructor (...args: any[]) {
      super(...args)
      log.verbose('PuppetCacheMixin', 'constructor(%s)',
        args[0]?.cache
          ? '{ cache: ' + JSON.stringify(args[0].cache) + ' }'
          : '',
      )

      const options: PuppetOptions = args[0] || {}

      this.__cacheMixinCleanCallbackList = []
      this.cache = new CacheAgent(options.cache)
    }

    override async start (): Promise<void> {
      log.verbose('PuppetCacheMixin', 'start()')
      await super.start()
      await this.cache.start()

      const onDirty = this.onDirty.bind(this)

      this.on('dirty', onDirty)
      log.verbose('PuppetCacheMixin', 'start() "dirty" event listener added')

      const cleanFn = () => {
        this.off('dirty', onDirty)
        log.verbose('PuppetCacheMixin', 'start() "dirty" event listener removed')
      }
      this.__cacheMixinCleanCallbackList.push(cleanFn)
    }

    override async stop (): Promise<void> {
      log.verbose('PuppetCacheMixin', 'stop()')
      this.cache.stop()

      this.__cacheMixinCleanCallbackList.map(setImmediate)
      this.__cacheMixinCleanCallbackList.length = 0

      await super.stop()
    }

    /**
     *
     * @windmemory(202008): add dirty payload methods
     *
     *  @see https://github.com/wechaty/grpc/pull/79
     *
     * Call this method when you want to notify the server that the data cache need to be invalidated.
     */
    dirtyPayload (
      type : DirtyType,
      id   : string,
    ): void {
      log.verbose('PuppetCacheMixin', 'dirtyPayload(%s<%s>, %s)', DirtyType[type], type, id)

      /**
       * Contract check for RoomMember ids.
       *
       * A legitimate RoomMember id is either a bare roomId (whole-room
       * dirty) OR `${roomId}${SEP}${memberId}` (single-member dirty).
       * Anything containing SEP that does not split into exactly two
       * non-empty segments is a caller bug: surface it via `error`
       * (never throw -- the setImmediate below would turn a throw into
       * uncaughtException) and abort emission.
       */
      if (type === DirtyType.RoomMember && id.includes(STRING_SPLITTER)) {
        const segments = id.split(STRING_SPLITTER)
        if (segments.length !== 2 || !segments[0] || !segments[1]) {
          const err = new Error(
            `dirtyPayload: malformed RoomMember id "${id}" -- `
            + 'expected bare roomId or roomId+SEP+memberId',
          )
          log.error('PuppetCacheMixin', err.message)
          this.emit('error', err)
          return
        }
      }

      /**
       * Bump the (type, id) generation counter BEFORE scheduling the
       * emit so that any payload getter whose raw fetch is currently
       * in-flight will see a stale snapshot and skip its LRU set.
       * See CacheAgent.bumpGen for the full contract.
       */
      this.cache.bumpGen(type, id)

      /**
       * Huan(202111): we return first before emit the `dirty` event?
       */
      setImmediate(() => this.emit('dirty', {
        payloadId   : id,
        payloadType : type,
      }))
    }

    /**
     * OnDirty will be registered as a `dirty` event listener,
     *  and it will invalidate the cache.
     *
     * Implementation note: the dirty event is emitted via setImmediate
     * (see `dirtyPayload`), so any throw from this listener becomes an
     * uncaughtException. Defensive coding around bad payloadType values
     * (notably `Unspecified`) must therefore not throw -- we log and
     * emit an `error` event instead. The outer try/catch below is a
     * belt-and-braces safety net for future per-cache bugs.
     */
    onDirty (
      {
        payloadType,
        payloadId,
      }: EventDirtyPayload,
    ): void {
      log.verbose('PuppetCacheMixin', 'onDirty(%s<%s>, %s)', DirtyType[payloadType], payloadType, payloadId)
      if (this.cache.disabled) {
        return
      }
      const dirtyFunc = this.__dirtyFuncMap[payloadType]
      if (!dirtyFunc) {
        // Should not happen -- __dirtyFuncMap is a complete Record.
        // Keeping the guard for a future enum addition that lands
        // before its handler.
        log.warn('PuppetCacheMixin', 'onDirty() unmapped payloadType=%s(%s), id=%s; ignored',
          DirtyType[payloadType], payloadType, payloadId)
        return
      }
      try {
        dirtyFunc(payloadId)
      } catch (e) {
        log.warn('PuppetCacheMixin', 'onDirty() handler threw for payloadType=%s, id=%s: %s',
          DirtyType[payloadType], payloadId, (e as Error).message)
      }
    }

    /**
     * Exhaustive map from every DirtyType to its cache invalidator.
     *
     * Modeled as a complete `Record<DirtyType, ...>` (mirrors PR #94
     * on puppet-service): adding a new DirtyType now forces a compile
     * error until a handler lands, closing the class of "new enum
     * silently unmapped" bugs the prior Partial hid.
     *
     * Getter (not a field) so the closure captures `this` and can be
     * regenerated per-call if a subclass overrides -- and so the
     * structural test (`__dirtyFuncMap`) can read it without needing an
     * instantiation-order dance.
     *
     * Unspecified is a caller bug: emit an `error` event (log.error too)
     * but do NOT throw -- `dirty` is scheduled via setImmediate, and a
     * throw here would become an uncaughtException.
     */
    protected get __dirtyFuncMap (): Record<DirtyType, (id: string) => void> {
      return {
        [DirtyType.Unspecified]: (id: string) => {
          const err = new Error(
            `dirtyPayload emitted DirtyType.Unspecified<0> (id=${id}); refusing to invalidate`,
          )
          log.error('PuppetCacheMixin', err.message)
          this.emit('error', err)
        },
        [DirtyType.Contact]:      (id: string) => { this.cache.contact?.delete(id) },
        [DirtyType.Friendship]:   (id: string) => { this.cache.friendship?.delete(id) },
        [DirtyType.Message]:      (id: string) => { this.cache.message?.delete(id) },
        [DirtyType.Post]:         (id: string) => { this.cache.post?.delete(id) },
        [DirtyType.Room]:         (id: string) => { this.cache.room?.delete(id) },
        [DirtyType.RoomMember]:   (id: string) => {
          /**
           * Precision dirty: an id of `${roomId}${SEP}${memberId}`
           * must drop only that member from the nested map, not the
           * whole room. Only a bare roomId means "drop the whole room".
           * (Id shape has already been validated in dirtyPayload above,
           * so a SEP here means exactly two non-empty segments.)
           */
          if (!id.includes(STRING_SPLITTER)) {
            this.cache.roomMember?.delete(id)
            return
          }

          const [ roomId, memberId ] = id.split(STRING_SPLITTER) as [ string, string ]
          const current = this.cache.roomMember?.get(roomId)
          if (!current || !(memberId in current)) {
            return
          }

          const { [memberId]: _drop, ...rest } = current
          void _drop
          if (Object.keys(rest).length === 0) {
            this.cache.roomMember?.delete(roomId)
          } else {
            this.cache.roomMember?.set(roomId, rest)
          }
        },
        [DirtyType.Tag]:          (id: string) => { this.cache.tag?.delete(id) },
        [DirtyType.TagGroup]:     (id: string) => { this.cache.tagGroup?.delete(id) },
        [DirtyType.WxxdProduct]:  (id: string) => { this.cache.wxxdProduct?.delete(id) },
        [DirtyType.WxxdOrder]:    (id: string) => { this.cache.wxxdOrder?.delete(id) },
        [DirtyType.Call]:         (id: string) => { this.cache.call?.delete(id) },
      }
    }

    /**
     * When we are using PuppetService, the `dirty` event will be emitted from the server,
     *  and we need to wait for the `dirty` event so we can make sure the cache has been invalidated.
     */
    async __dirtyPayloadAwait (
      type : DirtyType,
      id   : string,
    ): Promise<void> {
      log.verbose('PuppetCacheMixin', '__dirtyPayloadAwait(%s<%s>, %s)', DirtyType[type], type, id)

      if (!this.__currentUserId) {
        log.verbose('PuppetCacheMixin', '__dirtyPayloadAwait() will not dirty any payload when the puppet is not logged in')
        return
      }

      const isCurrentDirtyEvent = (event: EventDirtyPayload) =>
        event.payloadId === id && event.payloadType === type

      const onDirtyResolve = (resolve: () => void) => {
        const onDirty = (event: EventDirtyPayload) => {
          if (isCurrentDirtyEvent(event)) {
            resolve()
          }
        }
        return onDirty
      }

      let onDirty: ReturnType<typeof onDirtyResolve>

      const future = new Promise<void>(resolve => {
        onDirty = onDirtyResolve(resolve)
        this.on('dirty', onDirty)
      })

      /**
       * 1. call for sending the `dirty` event
       *
       * The base implementation of `dirtyPayload` is synchronous (void),
       * but subclasses (e.g. wechaty-puppet-service) override it as
       * `async` so the call may actually return a Promise that can
       * reject (e.g. transient gRPC failures). We must capture that
       * rejection here -- otherwise it surfaces as an
       * `unhandledRejection`, and the local cache stays stale until
       * its LRU TTL expires.
       */
      const dirtyResult = this.dirtyPayload(type, id) as void | Promise<void>
      if (dirtyResult && typeof (dirtyResult as Promise<void>).then === 'function') {
        ;(dirtyResult as Promise<void>).catch(e => {
          log.warn('PuppetCacheMixin',
            '__dirtyPayloadAwait() dirtyPayload(%s<%s>, %s) rejected: %s',
            DirtyType[type], type, id, (e as Error).message,
          )
        })
      }

      /**
       * 2. wait for the `dirty` event arrive, with a 5 seconds timeout
       */
      try {
        await timeoutPromise(future, 5 * 1000)
          .finally(() => this.off('dirty', onDirty))

      } catch (e) {
        // timeout: the server never echoed back a `dirty` event within
        // 5s. Two things go wrong if we just log-and-return:
        //   1. the local LRU keeps the stale payload for up to
        //      maxAge (15 minutes), poisoning subsequent reads.
        //   2. the warning line before this fix carried no type/id, so
        //      grep-based on-call triage could not localize the miss.
        //
        // Fix: invoke `onDirty` locally with the same event payload so
        // the LRU is at least invalidated, and enrich the warn line
        // with the exact (type, id).
        log.warn('PuppetCacheMixin',
          '__dirtyPayloadAwait() timeout for %s<%s>, id=%s -- falling back to local LRU delete '
          + '(server likely on wechaty 0 or the dirty echo path is broken): %s',
          DirtyType[type], type, id, (e as Error).message,
        )

        try {
          this.onDirty({ payloadId: id, payloadType: type })
        } catch (fallbackErr) {
          log.warn('PuppetCacheMixin',
            '__dirtyPayloadAwait() local fallback onDirty threw: %s',
            (fallbackErr as Error).message,
          )
        }
      }

      /**
       * Huan(202111): wait for all the taks in the event loop queue to be executed
       *  before we return, because there might be other `onDirty` listeners
       */
      await new Promise(setImmediate)

    }

  }

  return CacheMixin
}

type CacheMixin = ReturnType<typeof cacheMixin>

type ProtectedPropertyCacheMixin =
  | 'cache'
  | 'onDirty'
  | '__cacheMixinCleanCallbackList'
  | '__dirtyFuncMap'
  | '__dirtyPayloadAwait'

export type {
  CacheMixin,
  ProtectedPropertyCacheMixin,
}
export { cacheMixin }
