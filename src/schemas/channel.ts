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
   * The following two fields are required when posting Channel Live moment.
   * However sending Channel Live message without such fields is fine.
   */
  objectId?: string,
  objectNonceId?: string,
}
