import type { DirtyType } from './dirty.js'
import type { TagEventType, TapType } from './mod.js'
import type { TagGroupEventType } from './tag.js'
import type { VerifyCodeScene, VerifyCodeStatus } from './verify-code.js'
import type { VerifySlideStatus, VerifySlideScene } from './verify-slide.js'
import type { CallSignal } from './call.js'

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
  /**
   * Idle: the login flow is waiting to be triggered manually
   *  (e.g. IM just opened, or a previous qrcode expired),
   *  no qrcode is available until `refreshQRCode()` is called.
   */
  Idle      = 6,
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

  createTimestamp?: number,
  expireTimestamp?: number,
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

export interface EventVerifySlidePayload {
  scene: VerifySlideScene,
  status: VerifySlideStatus,

  sliderVerifyEncrypt: string,
  sliderExeUrl: string,
}

export interface EventLoginUrlPayload {
  url: string,
}

export interface EventIntentCommentPayload {
  intentCommentId: string,
}

export interface EventContactEnterConversationPayload {
  contactId: string,
  timestamp: number,
  scene?: string,
}

export interface EventContactLeadFilledPayload {
  contactId: string,
  /**
   * [{name: '微信', value: '案例微信号'}, {name: '手机号', value: '13800000000'}]
   */
  leads: {
    name: string,
    value: string,
    source?: string,
  }[],
  timestamp: number,
}
export interface EventWxxdProductPayload {
  productId: string,
}

export interface EventWxxdOrderPayload {
  orderId: string,
}

/**
 * Uplink event payload: remote side → local side.
 * signal=Invite indicates an incoming call (from the callee's perspective);
 * the caller does not receive an echo of its own Invite.
 * Multi-party calls share the same signal set — accept means joining, hangup
 * means leaving; whether a single hangup ends the whole call is the consumer's
 * state machine concern, the puppet layer only relays actor + signal faithfully.
 *
 * This event stream carries actions only; call state (media, roster) lives
 * in callPayload(), kept fresh via dirty (DirtyType.Call).
 *
 * Per-direction legal signals (which side legitimately receives each signal):
 * - Invite:        callee side only (incoming call); the caller never receives
 *                  an echo of its own invite.
 * - Ringing:       caller side only (the callee protocol side's automatic
 *                  acknowledgement).
 * - Accept/Reject: caller side (the callee's answer); in a group call the actor
 *                  is the participant who answered.
 * - Cancel:        callee side (the caller withdraws before the call connects).
 * - Hangup:        either side (the peer hangs up / leaves).
 */
export interface EventCallPayload {
  callId    : string
  signal    : CallSignal
  contactId : string   // the actor of this signal: Invite = the initiator; Accept/Reject/Hangup = the participant who performed the action
  reason?   : string   // action attribute (Reject/Hangup)
  timestamp : number   // protocol-side milliseconds timestamp of the action; the action stream is not transport-ordered — consumers linearize by this
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
  | EventVerifySlidePayload
  | EventLoginUrlPayload
  | EventIntentCommentPayload
  | EventContactEnterConversationPayload
  | EventContactLeadFilledPayload
  | EventWxxdProductPayload
  | EventWxxdOrderPayload
  | EventCallPayload
