export enum ChannelFeedType {
  UNKNOWN = 0,
  PHOTO = 2,
  VIDEO = 4,
  LIVE = 9
}

/**
 * 视频号媒体资源，对应接收视频号 finderFeed.mediaList.media。
 * 个微（phoenix）转发视频号时需要完整的媒体列表。
 */
export interface ChannelMedia {
  mediaType: number,         // 2: 图片, 4: 视频
  url: string,               // 原始媒体流地址
  thumbUrl: string,          // 视频第一帧缩略图地址
  fullCoverUrl: string,      // 封面缩略图地址
  coverUrl: string,          // 封面地址
  width: number,             // 缩略图宽度，默认 1080
  height: number,            // 缩略图高度，默认 1920
  videoPlayDuration: number, // 视频播放时长（秒）
}

export interface ChannelPayload {
  avatar: string,
  coverUrl: string,
  desc: string,
  extras: string,
  feedType: ChannelFeedType,
  nickname: string,
  thumbUrl: string,
  url: string,

  /**
   * The following two fields are required for Live Channel only.
   */
  objectId?: string,
  objectNonceId?: string,

  /**
   * 个微（phoenix）转发视频号所需补充字段，来自接收视频号的 appmsg.finderFeed。
   * 其他 puppet（如企微）发送时可不填。
   */
  username?: string,         // 视频号 finder userName
  authIconType?: number,     // 认证类型
  authIconUrl?: string,      // 授权图标地址
  fromUserName?: string,     // 视频号转发自好友 userName
  mediaList?: ChannelMedia[], // 媒体资源列表
}
