export enum RoomMemberLoadMode {
  Unspecified = 0,
  Normal = 1,
  Lazy = 2,
}

export enum RoomMemberLoadStatus {
  Unspecified = 0,
  Pending = 1,
  Loading = 2,
  Loaded = 3,
  Failed = 4,
}

export interface RoomMemberSyncOptions {
  force?: boolean
}

export interface RoomMemberSnapshotOptions {
  pageToken?: string
  pageSize?: number
}

export interface RoomMemberLoadState {
  roomId: string
  taskId: string
  status: RoomMemberLoadStatus
  revision: string
  loadedAt?: number
  error?: string
}

export enum RoomMemberJoinSceneType {
  Unknown       = 0,
  Add           = 1,
  InviteLink    = 2,
  QRCode        = 3,
  Other         = 4,
}

export interface RoomMemberQueryFilter {
  name?         : string,
  roomAlias?    : string,
  contactAlias? : string,
}

export interface RoomQueryFilter {
  id?    : string
  topic? : string | RegExp,
}

export interface RoomPayload {
  id : string

  topic        : string
  avatar?      : string

  /**
   * Proposal: add a handle field to RoomPayload #181
   *  "A Twitter handle is the username that appears at the end of your unique Twitter URL."
   *  @link https://github.com/wechaty/puppet/issues/181
   */
  handle?      : string

  memberIdList : string[]
  memberCount? : number
  memberLoadMode? : RoomMemberLoadMode
  memberLoadStatus? : RoomMemberLoadStatus
  memberLoadRevision? : string
  memberLoadedAt? : number
  ownerId?     : string
  adminIdList  : string[]
  external?    : boolean

  /**
 * a stringified JSON object to handle any IM specific data
 */
  additionalInfo?: string

  remark?: string
  createTime?: number
}

export interface RoomMemberPayload {
  id         : string
  roomAlias? : string,   // "李佳芮-群里设置的备注", `chatroom_nick_name`
  inviterId? : string,   // "wxid_7708837087612",
  avatar     : string,
  name       : string,
  joinTime?  : number,
  joinScene? : RoomMemberJoinSceneType,

  /**
 * a stringified JSON object to handle any IM specific data
 */
  additionalInfo?: string
}

export interface RoomMemberSnapshot {
  roomId: string
  revision: string
  loadedAt?: number
  members: RoomMemberPayload[]
  nextPageToken?: string
}

export interface RoomPermission {
  inviteConfirm: boolean, // 群聊邀请确认 内外部
  adminOnlyManage: boolean, // 仅群主或管理员可管理 内部
  adminOnlyAtAll: boolean, // 仅群主或管理员可@所有人 内部
  muteAll: boolean, // 全员禁言 内部
  forbidRoomTopicEdit: boolean, // 禁止修改群名 外部
  disableMemberMutualAdd: boolean, // 禁止外部群成员互相添加
}

export interface RoomParseDynamicQRCode {
  qrcode: string, // 二维码url
  qrcodeImageUrl: string, // 二维码图片url
  roomName: string, // 群名称
}

/** @hidden */
export type RoomPayloadFilterFunction = (payload: RoomPayload)    => boolean

/** @hidden */
export type RoomPayloadFilterFactory  = (query: RoomQueryFilter)  => RoomPayloadFilterFunction
