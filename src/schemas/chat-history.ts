import type { MessageType } from './message'
import type { FileBoxInterface } from 'file-box'
import type { LocationPayload } from './location.js'
import type { UrlLinkPayload } from './url-link.js'
import type { MiniProgramPayload } from './mini-program.js'
import type { ChannelPayload } from './channel.js'

/**
 * Only type is MessageType.ChatHistory, message is typeof MessageTypeToContent<MessageType>[]
 */
export interface BaseChatHistoryPayload<T extends MessageType, F> {
  type: T,
  avatar: FileBoxInterface,
  senderName: string,
  corpName: string,
  time: number,
  title?: string,
  message: F,
}

export type ChatHistoryPayload = BaseChatHistoryPayload<MessageType.ChatHistory, ChatHistoryPayload[]>
  | BaseChatHistoryPayload<MessageType.Contact, string>
  | BaseChatHistoryPayload<MessageType.Text, string>
  | BaseChatHistoryPayload<MessageType.GroupNote, string>
  | BaseChatHistoryPayload<MessageType.Post, string>
  | BaseChatHistoryPayload<MessageType.Markdown, string>
  | BaseChatHistoryPayload<MessageType.CallRecord, string>
  | BaseChatHistoryPayload<MessageType.Attachment, FileBoxInterface>
  | BaseChatHistoryPayload<MessageType.Audio, FileBoxInterface>
  | BaseChatHistoryPayload<MessageType.Emoticon, FileBoxInterface>
  | BaseChatHistoryPayload<MessageType.Image, FileBoxInterface>
  | BaseChatHistoryPayload<MessageType.Location, LocationPayload>
  | BaseChatHistoryPayload<MessageType.MiniProgram, MiniProgramPayload>
  | BaseChatHistoryPayload<MessageType.Url, UrlLinkPayload>
  | BaseChatHistoryPayload<MessageType.Video, FileBoxInterface>
  | BaseChatHistoryPayload<MessageType.Channel, ChannelPayload>
  | BaseChatHistoryPayload<MessageType.Transfer, never>
  | BaseChatHistoryPayload<MessageType.RedEnvelope, never>
  | BaseChatHistoryPayload<MessageType.System, never>
  | BaseChatHistoryPayload<MessageType.Recalled, never>
  | BaseChatHistoryPayload<MessageType.Unknown, never>
