export interface ContactIdExternalUserIdPair {
  contactId: string,
  externalUserId: string
}

export interface RoomAntiSpamStrategy {
  id: string,
  name: string,

  // detail to be added later
}

export enum CorpMessageInterceptionType {
  Hard = 0, // 拦截并警告
  Soft = 1, // 仅警告
}

export interface CorpMessageInterceptionStrategy {
  name: string,
  words: string[],
  phoneNumber: boolean,
  email: boolean,
  redPacket: boolean,
  type: CorpMessageInterceptionType
}
