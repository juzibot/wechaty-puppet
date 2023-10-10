import type { MessageType } from './message'
import type { FileBoxInterface } from 'file-box'
import type { LocationPayload } from './location.js'
import type { UrlLinkPayload } from './url-link.js'
import type { MiniProgramPayload } from './mini-program.js'
import type { ChannelPayload } from './channel.js'

/**
 * Only type is MessageType.ChatHistory, message is typeof MessageTypeToContent<MessageType>[]
 */
export interface BaseChatHistoryPayload<T, F> {
  type: T,
  avatar: FileBoxInterface,
  senderName: string,
  corpName: string,
  time: string,
  message: F,
}

export type ChatHistoryPayload = BaseChatHistoryPayload<MessageType.ChatHistory, ChatHistoryPayload[]>
  | BaseChatHistoryPayload<MessageType.Attachment, FileBoxInterface>
  | BaseChatHistoryPayload<MessageType.Audio, FileBoxInterface>
  | BaseChatHistoryPayload<MessageType.Contact, string>
  | BaseChatHistoryPayload<MessageType.Emoticon, FileBoxInterface>
  | BaseChatHistoryPayload<MessageType.Image, FileBoxInterface>
  | BaseChatHistoryPayload<MessageType.Text, string>
  | BaseChatHistoryPayload<MessageType.Location, LocationPayload>
  | BaseChatHistoryPayload<MessageType.MiniProgram, MiniProgramPayload>
  | BaseChatHistoryPayload<MessageType.GroupNote, string>
  | BaseChatHistoryPayload<MessageType.Transfer, string>
  | BaseChatHistoryPayload<MessageType.RedEnvelope, string>
  | BaseChatHistoryPayload<MessageType.Recalled, never>
  | BaseChatHistoryPayload<MessageType.Url, UrlLinkPayload>
  | BaseChatHistoryPayload<MessageType.Video, FileBoxInterface>
  | BaseChatHistoryPayload<MessageType.Post, string>
  | BaseChatHistoryPayload<MessageType.Channel, ChannelPayload>
  | BaseChatHistoryPayload<MessageType.System, never>
  | BaseChatHistoryPayload<MessageType.Markdown, string>
  | BaseChatHistoryPayload<MessageType.CallRecord, string>
