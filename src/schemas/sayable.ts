/* eslint-disable sort-keys */
import { createAction } from 'typesafe-actions'
import type { FileBoxInterface } from 'file-box'

import { MessageType }              from './message.js'
import type { LocationPayload }     from './location.js'
import type { UrlLinkPayload }      from './url-link.js'
import type { MiniProgramPayload }  from './mini-program.js'
import type { ChannelPayload }      from './channel.js'
import type { ChannelCardPayload } from './channel-card.js'
import type {
  PostPayload,
  SayablePayloadPost,
}                                     from './post.js'
import type { ConsultCardPayload, PremiumOnlineAppointmentCardPayload } from './consult-card.js'
import type { WxxdProductPayload } from './wxxd-product.js'
import type { WxxdOrderPayload } from './wxxd-order.js'

const payloadContact     = (contactId: string)                      => ({ contactId })
const payloadFilebox     = (filebox: string | FileBoxInterface)     => ({ filebox })
const payloadText        = (text: string, mentions: string[] = [])  => ({ text, mentions })
const payloadSystem      = (text: string)                           => ({ text })
const payloadMarkdown    = (text: string)                           => ({ text })
/**
 * expand/merge the payload altogether
 */
const payloadLocation                     = (locationPayload: LocationPayload)                                         => ({ ...locationPayload })
const payloadMiniProgram                  = (miniProgramPayload: MiniProgramPayload)                                   => ({ ...miniProgramPayload })
const payloadUrlLink                      = (urlLinkPayload: UrlLinkPayload)                                           => ({ ...urlLinkPayload })
const payloadPost                         = (postPayload: PostPayload)                                                 => ({ ...postPayload })
const payloadChannel                      = (channelPayload: ChannelPayload)                                           => ({ ...channelPayload })
const payloadChannelCard                  = (channelCardPayload: ChannelCardPayload)                                   => ({ ...channelCardPayload })
const payloadConsultCard                  = (consultCardPayload: ConsultCardPayload)                                   => ({ ...consultCardPayload })
const payloadPremiumOnlineAppointmentCard = (premiumOnlineAppointmentCardPayload: PremiumOnlineAppointmentCardPayload) => ({
  ...premiumOnlineAppointmentCardPayload,
})
const payloadWxxdProduct                  = (wxxdProductPayload: WxxdProductPayload)                                   => ({ ...wxxdProductPayload })
const payloadWxxdOrder                    = (wxxdOrderPayload: WxxdOrderPayload)                                   => ({ ...wxxdOrderPayload })
/**
 * using `types` as a static typed string name list for `createAction`
 *
 *  Huan(202201): if we remove the `(() => ({}))()`, then the typing will fail.
 *    FIXME: remove the `(() => ({}))()` after we fix the issue.
 */
const sayableTypes = (() => ({
  ...Object.keys(MessageType)
    .filter(k => isNaN(Number(k)))
    .reduce((acc, cur) => ({
      ...acc,
      [cur]: cur,
    }), {}),
} as  {
  [k in keyof typeof MessageType]: k
}))()

/**
 * Simple data
 */
const contact  = createAction(sayableTypes.Contact, payloadContact)()
const text     = createAction(sayableTypes.Text,    payloadText)()
const system   = createAction(sayableTypes.System, payloadSystem)()
const markdown = createAction(sayableTypes.Markdown, payloadMarkdown)()
// (conversationId: string, text: string, mentionIdList?: string[]) => ({ conversationId, mentionIdList, text }
/**
 * FileBoxs
 */
const attachment  = createAction(sayableTypes.Attachment,  payloadFilebox)()
const audio       = createAction(sayableTypes.Audio,       payloadFilebox)()
const emoticon    = createAction(sayableTypes.Emoticon,    payloadFilebox)()
const image       = createAction(sayableTypes.Image,       payloadFilebox)()
const video       = createAction(sayableTypes.Video,       payloadFilebox)()

/**
 * Payload data
 */
const location                     = createAction(sayableTypes.Location,                     payloadLocation)()
const miniProgram                  = createAction(sayableTypes.MiniProgram,                  payloadMiniProgram)()
const url                          = createAction(sayableTypes.Url,                          payloadUrlLink)()
const post                         = createAction(sayableTypes.Post,                         payloadPost)()
const channel                      = createAction(sayableTypes.Channel,                      payloadChannel)()
const channelCard                  = createAction(sayableTypes.ChannelCard,                  payloadChannelCard)()
const consultCard                  = createAction(sayableTypes.ConsultCard,                  payloadConsultCard)()
const premiumOnlineAppointmentCard = createAction(sayableTypes.PremiumOnlineAppointmentCard, payloadPremiumOnlineAppointmentCard)()
const wxxdProduct                  = createAction(sayableTypes.WxxdProduct,                  payloadWxxdProduct)()
const wxxdOrder                    = createAction(sayableTypes.WxxdOrder,                    payloadWxxdOrder)()
/**
 * Huan(202201): Recursive type references
 *  @link https://github.com/microsoft/TypeScript/pull/33050#issuecomment-1002455128
 */
const sayablePayloadsNoPost = {
  attachment,
  audio,
  contact,
  emoticon,
  image,
  location,
  miniProgram,
  text,
  url,
  video,
  channel,
  system,
  markdown,
  channelCard,
  consultCard,
  premiumOnlineAppointmentCard,
  wxxdProduct,
  wxxdOrder,
} as const

/**
 *
 * Huan(202201): Recursive type references
 *  @link https://github.com/microsoft/TypeScript/pull/33050#issuecomment-1002455128
 *  @link https://github.com/wechaty/puppet/issues/180
 */
const sayablePayloads = {
  ...sayablePayloadsNoPost,
  post,
} as const

type SayablePayloadNoPost = ReturnType<typeof sayablePayloadsNoPost[keyof typeof sayablePayloadsNoPost]>
type SayablePayload       = SayablePayloadNoPost | SayablePayloadPost

// TODO: add an unit test to confirm that all unsupported type are listed here
type SayablePayloadUnsupportedType =
  | 'ChatHistory'
  | 'GroupNote'
  | 'Recalled'
  | 'RedEnvelope'
  | 'Transfer'
  | 'Unknown'
  | 'CallRecord'
  | 'AppRaw'
  | 'WeChatNote'

export {
  sayablePayloads,
  sayableTypes,
  type SayablePayloadNoPost,
  type SayablePayload,
  type SayablePayloadUnsupportedType,
}
