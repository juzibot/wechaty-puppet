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

/**
 * Org (admin) broadcast plan: a wecom broadcast created by the corp admin
 * (official groupmsg API or the admin console), which has to be executed by the member
 */
export enum OrgBroadcastConversationType {
  Contact = 0,
  Room = 1,
}

export enum OrgBroadcastTargetStatus {
  Unsent = 0,
  Sent = 1,
  NotFriend = 2,
  Occupied = 3,
  Unconfirmed = 4,
  Confirmed = 5,
  Expired = 6,
  Canceled = 7,
  NewUnsent = 8,
}

export interface OrgBroadcastTarget {
  contactId?: string, // set when conversationType is Contact
  roomId?: string,    // set when conversationType is Room
  status: OrgBroadcastTargetStatus,
}

export interface OrgBroadcastPayload {
  id: string,
  sendType: number,           // 0: official (org admin), 1: personal, 2: special
  conversationType: OrgBroadcastConversationType,
  creatorId?: string,
  execTime: number,           // milliseconds timestamp of the scheduled sending, 0 means immediately
  status: number,             // 0: checking, 1: check succeeded, 2: check failed, 3: delayed send succeeded, 4: delayed send canceled
  canCancel: boolean,
  allowSelect: boolean,       // members may adjust targets before sending
  sent: boolean,
  totalCount: number,
  sentCount: number,
  contentListJson: string,    // raw wecom content list
  targets: OrgBroadcastTarget[],
}
