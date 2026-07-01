import {
  log,
}                       from '../config.js'

import type {
  PostPayload,
  PostQueryFilter,
}                                 from '../schemas/post.js'

import type { PuppetSkeleton }    from '../puppet/puppet-skeleton.js'
import { DirtyType }              from '../schemas/dirty.js'

import type {
  PaginationRequest,
  PaginationResponse,
}                                 from '../schemas/pagination.js'

import type { CacheMixin }        from './cache-mixin.js'
import type { SayablePayload } from '../schemas/mod.js'

const postMixin = <MinxinBase extends typeof PuppetSkeleton & CacheMixin>(baseMixin: MinxinBase) => {

  abstract class PostMixin extends baseMixin {

    constructor (...args: any[]) {
      super(...args)
      log.verbose('PuppetPostMixin', 'constructor()')
    }

    abstract postRawPayload (postId: string)        : Promise<any>
    abstract postRawPayloadParser (rawPayload: any) : Promise<PostPayload>

    postPayloadCache (postId: string): undefined | PostPayload {
      // log.silly('PuppetPostMixin', 'postPayloadCache(id=%s) @ %s', postId, this)
      if (!postId) {
        throw new Error('no id')
      }
      const cachedPayload = this.cache.post?.get(postId)
      if (cachedPayload) {
        // log.silly('PuppetPostMixin', 'postPayloadCache(%s) cache HIT', postId)
      } else {
        log.silly('PuppetPostMixin', 'postPayloadCache(%s) cache MISS', postId)
      }

      return cachedPayload
    }

    async postPayload (
      postId: string,
    ): Promise<PostPayload> {
      log.verbose('PuppetPostMixin', 'postPayload(%s)', postId)

      if (!postId) {
        throw new Error('no id')
      }

      /**
       * 1. Try to get from cache first
       */
      const cachedPayload = this.postPayloadCache(postId)
      if (cachedPayload) {
        return cachedPayload
      }

      /**
       * 2. Dedup concurrent callers and guard the LRU set against a
       *    dirty that lands during the raw fetch. See CacheAgent.
       */
      const inflightKey = `post:${postId}`
      const inflight = this.cache.__inflightGet<PostPayload>(inflightKey)
      if (inflight) {
        return inflight
      }

      const gen = this.cache.snapshotGen(DirtyType.Post, postId)
      const fetch = (async () => {
        const rawPayload = await this.postRawPayload(postId)
        const payload    = await this.postRawPayloadParser(rawPayload)

        if (!this.cache.disabled && this.cache.isFreshWrite(DirtyType.Post, postId, gen)) {
          this.cache.post?.set(postId, payload)
          log.silly('PuppetPostMixin', 'postPayload(%s) cache SET', postId)
        } else if (!this.cache.disabled) {
          log.silly('PuppetPostMixin',
            'postPayload(%s) cache SET skipped: dirty landed during raw fetch', postId)
        }

        return payload
      })().finally(() => this.cache.__inflightDelete(inflightKey))

      this.cache.__inflightSet(inflightKey, fetch)
      return fetch
    }

    // get a sayable from server post (which comes with Id)
    abstract postPayloadSayable (postId: string, sayableId: string): Promise<SayablePayload>

    /**
     * Publish a post
     */
    abstract postPublish (payload: PostPayload): Promise<void | string>
    abstract postUnpublish (id: string): Promise<void>

    /**
     * Search from the server.
     *
     * @param postId
     * @param filter
     * @param pagination
     */
    abstract postSearch (
      filter      : PostQueryFilter,
      pagination? : PaginationRequest,
    ): Promise<PaginationResponse<string[]>>

    /**
     * List from the local, will return all ids from cache
     */
    postList (): string[] {
      log.verbose('PuppetPostMixin', 'postList()')
      /**
       * cache.disabled is set synchronously in the CacheAgent constructor,
       * but the LRU instances are only created in the async cache.start().
       * Between construction and start we must not blindly assume the
       * LRU exists -- fall through to [] when it does not.
       */
      if (this.cache.disabled || !this.cache.post) {
        return []
      }
      return [ ...this.cache.post.keys() ]
    }

    async postPayloadDirty (
      id: string,
    ): Promise<void> {
      log.verbose('PuppetPostMixin', 'postPayloadDirty(%s)', id)

      await this.__dirtyPayloadAwait(
        DirtyType.Post,
        id,
      )
    }

  }

  return PostMixin
}

type PostMixin = ReturnType<typeof postMixin>

type ProtectedPropertyPostMixin =
  | 'postPayloadCache'
  | 'postRawPayload'
  | 'postRawPayloadParser'

export type {
  PostMixin,
  ProtectedPropertyPostMixin,
}
export { postMixin }
