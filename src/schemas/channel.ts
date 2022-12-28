export interface ChannelPayload {
  avatar: string,
  coverUrl: string,
  desc: string,
  extras: string,
  feedType: number,
  nickname: string,
  thumbUrl: string,
  url: string,

  /**
   * The following two fields are required for Live Channel only.
   */
  objectId?: string,
  objectNonceId?: string,
}
