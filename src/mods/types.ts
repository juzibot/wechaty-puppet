import {
  type FriendshipAddOptions,
  type MessageSendTextOptions,
  type PuppetEventName,
  type ChatEventName,
  TagEventType,
  TagGroupEventType,
  ContactGender,
  ContactType,
  DirtyType,
  RoomMemberJoinSceneType,
  FriendshipSceneType,
  FriendshipType,
  ImageType,
  MessageType,
  BroadcastStatus,
  BroadcastTargetStatus,
  PostType,
  TapType,
  TagType,
  sayableTypes,

  CHAT_EVENT_DICT,
  PUPPET_EVENT_DICT,

  ScanStatus,
  YOU,
}                       from '../schemas/mod.js'

export {
  type PuppetEventName,
  type ChatEventName,
  ContactGender,
  RoomMemberJoinSceneType as RoomMemberJoinScene,
  ContactType             as Contact,
  FriendshipSceneType     as FriendshipScene,
  FriendshipType          as Friendship,
  ImageType               as Image,
  MessageType             as Message,
  PostType                as Post,
  TapType                 as Tap,
  TagType                 as Tag,
  sayableTypes            as Sayable,
  TagEventType            as TagEvent,
  TagGroupEventType       as TagGroupEvent,
  /**
   * Huan(202201): `DirtyType as Payload` will be removed after Dec 31, 2023
   * @deprecated: use Dirty instead of Payload
   */
  DirtyType               as Payload,
  DirtyType               as Dirty,
}

export {
  ScanStatus,
  BroadcastStatus,
  BroadcastTargetStatus,
  type FriendshipAddOptions,
  type MessageSendTextOptions,
  YOU,
  CHAT_EVENT_DICT,
  PUPPET_EVENT_DICT,
}
