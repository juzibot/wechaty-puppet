import type { DirtyType } from './dirty.js'
import type { TagEventType, TapType } from './mod.js'
import type { TagGroupEventType } from './tag.js'
import type { VerifyCodeScene, VerifyCodeStatus } from './verify-code.js'

/**
 * The event `scan` status number.
 */
export enum ScanStatus {
  Unknown   = 0,
  Cancel    = 1,
  Waiting   = 2,
  Scanned   = 3,
  Confirmed = 4,
  Timeout   = 5,
}

export enum ScanType {
  Unknown = 0,
  Login = 1,
  Verify = 2,
}

export interface EventFriendshipPayload {
  friendshipId: string,
}

export interface EventLoginPayload {
  contactId: string,
}

export interface EventLogoutPayload {
  contactId : string,
  data?     : string,
}

export interface EventMessagePayload {
  messageId: string,
}

export interface EventPostPayload {
  postId: string,
}

export interface EventPostCommentPayload {
  postId: string,
  commentId: string,
}

export interface EventPostTapPayload {
  postId: string,
  tapType: TapType,
  contactId: string,
  tap: boolean,
  timestamp: number,
}

export interface EventRoomInvitePayload {
  roomInvitationId: string,
}

export interface EventRoomJoinPayload {
  inviteeIdList : string[],
  inviterId     : string,
  roomId        : string,
  timestamp     : number,
}

export interface EventRoomLeavePayload {
  removeeIdList : string[],
  removerId     : string,
  roomId        : string,
  timestamp     : number,
}

export interface EventRoomTopicPayload {
  changerId : string,
  newTopic  : string,
  oldTopic  : string,
  roomId    : string,
  timestamp : number,
}

export interface EventRoomAnnouncePayload {
  changerId: string,
  newAnnounce: string,
  oldAnnounce?: string,
  roomId: string,
  timestamp: number
}

export interface EventScanPayload {
  status: ScanStatus,
  type?: ScanType,

  qrcode?  : string,
  data?    : string,
  timestamp: number,
}

export interface EventDongPayload {
  data?: string,
}

/**
 * GError.stringify-ed string
 *  @see https://github.com/huan/gerror
 *
 * TODO: remove `?` on `gerror` after Dec 31, 2022
 * TODO: remove `data` after Dec 31, 2022
 */
export type EventErrorPayload = {
  data?   : string  // <- deprecated. use `gerror` instead.
  gerror? : string
}

export interface EventReadyPayload {
  data?: string,
}

export interface EventResetPayload {
  data?: string,
}

export interface EventHeartbeatPayload {
  data?: string,
}

export interface EventDirtyPayload {
  payloadType : DirtyType,
  payloadId   : string,
}

export interface EventTagPayload {
  type: TagEventType.TagCreate | TagEventType.TagDelete | TagEventType.TagRename,
  idList: string[],
  timestamp: number,
}

export interface EventTagGroupPayload {
  type: TagGroupEventType.TagGroupCreate | TagGroupEventType.TagGroupDelete | TagGroupEventType.TagGroupRename,
  idList: string[],
  timestamp: number,
}

export interface EventVerifyCodePayload {
  id: string,
  scene: VerifyCodeScene,
  status: VerifyCodeStatus,
  message?: string,
}

export type EventPayload =
  | EventDirtyPayload
  | EventDongPayload
  | EventErrorPayload
  | EventFriendshipPayload
  | EventHeartbeatPayload
  | EventLoginPayload
  | EventLogoutPayload
  | EventMessagePayload
  | EventReadyPayload
  | EventResetPayload
  | EventRoomInvitePayload
  | EventRoomJoinPayload
  | EventRoomLeavePayload
  | EventRoomTopicPayload
  | EventRoomAnnouncePayload
  | EventScanPayload
  | EventTagPayload
  | EventTagGroupPayload
  | EventPostPayload
  | EventPostCommentPayload
  | EventPostTapPayload
  | EventVerifyCodePayload
