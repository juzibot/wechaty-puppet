import type { MessageType } from './message'
import type { FileBoxInterface } from 'file-box'
import type { LocationPayload } from './location.js'
import type { UrlLinkPayload } from './url-link.js'
import type { MiniProgramPayload } from './mini-program.js'
import type { ChannelPayload } from './channel.js'

type MessageTypeToContent<T extends MessageType> = T extends MessageType.Unknown
  ? never
  : T extends MessageType.Attachment
  ? FileBoxInterface
  : T extends MessageType.Audio
  ? FileBoxInterface
  : T extends MessageType.Contact
  ? string
  : T extends MessageType.ChatHistory
  ? ChatHistoryPayload
  : T extends MessageType.Emoticon
  ? FileBoxInterface
  : T extends MessageType.Image
  ? FileBoxInterface
  : T extends MessageType.Text
  ? string
  : T extends MessageType.Location
  ? LocationPayload
  : T extends MessageType.MiniProgram
  ? MiniProgramPayload
  : T extends MessageType.GroupNote
  ? string
  : T extends MessageType.Transfer
  ? string
  : T extends MessageType.RedEnvelope
  ? string
  : T extends MessageType.Recalled
  ? never
  : T extends MessageType.Url
  ? UrlLinkPayload
  : T extends MessageType.Video
  ? FileBoxInterface
  : T extends MessageType.Post
  ? string
  : T extends MessageType.Channel
  ? ChannelPayload
  : T extends MessageType.System
  ? never
  : T extends MessageType.Markdown
  ? string
  : T extends MessageType.CallRecord
  ? string
  : never;

/**
 * Only type is MessageType.ChatHistory, message is typeof MessageTypeToContent<MessageType>[]
 */
export interface ChatHistoryPayload {
  type: MessageType,
  avatar: FileBoxInterface,
  senderName: string,
  corpName: string,
  time: string,
  message: MessageTypeToContent<MessageType> | MessageTypeToContent<MessageType>[],
}
