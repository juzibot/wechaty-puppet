export enum ChannelFeedType {
  UNKNOWN = 0,
  PHOTO = 2,
  VIDEO = 4,
  LIVE = 9
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
}
