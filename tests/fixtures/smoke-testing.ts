#!/usr/bin/env ts-node

import assert from 'assert'

import * as PUPPET from '@juzi/wechaty-puppet'
import type {
  FileBoxInterface,
}                     from 'file-box'

import * as FILTERS from '@juzi/wechaty-puppet/filters'
import * as IMPLS from '@juzi/wechaty-puppet/impls'
import * as PAYLOADS from '@juzi/wechaty-puppet/payloads'
import * as TYPES from '@juzi/wechaty-puppet/types'

class PuppetTest extends PUPPET.Puppet {

  override async onStart () : Promise<void> { return {} as any }
  override async onStop ()  : Promise<void> { return {} as any }

  override async ding (data?: string): Promise<void> { return data as any as void }
  override async logout () : Promise<void> { return {} as any }

  override async enterVerifyCode () : Promise<void> { return {} as any }

  /**
   *
   * ContactSelf
   *
   */
  override async contactSelfQRCode ()                     : Promise<string> { return '' }
  override async contactSelfName (name: string)           : Promise<void> { void name }
  override async contactSelfSignature (signature: string) : Promise<void> { void signature }

  /**
   *
   * Tag
   *
   */
  override async tagContactTagAdd(tagIds: string[], contactIds: string[]): Promise<void> {
    void { tagIds, contactIds }
  }

  override async tagContactTagRemove(tagIds: string[], contactIds: string[]): Promise<void> {
    void { tagIds, contactIds }
  }

  override async tagGroupAdd(groupName: string): Promise<string | void> {
    void { groupName }
  }

  override async tagGroupDelete(groupId: string): Promise<void> {
    void { groupId }
  }

  override async tagTagAdd(tagName: string, groupId?: string): Promise<string | void> {
    void { groupId, tagName }
  }

  override async tagTagDelete(tagId: string): Promise<void> {
    void { tagId }
  }

  override async tagGroupList(): Promise<string[]> {
    return []
  }

  override async tagGroupTagList(groupId?: string): Promise<string[]> {
    void { groupId }
    return []
  }

  override async tagGroupPayloadPuppet(tagGroup: string): Promise<PAYLOADS.TagGroup> {
    return tagGroup as any
  }

  override async tagTagList(): Promise<string[]> {
    return []
  }

  override async tagContactTagList(contactId: string): Promise<string[]> {
    void { contactId }
    return []
  }

  override async tagTagContactList(tagId: string): Promise<string[]> {
    void { tagId }
    return []
  }

  override async tagPayloadPuppet(tagId: string): Promise<PAYLOADS.Tag> {
    return tagId as any
  }
  /**
   *
   * Contact
   *
   */
  override async contactAlias (contactId: string)                        : Promise<string>
  override async contactAlias (contactId: string, alias: string | null)  : Promise<void>
  override async contactAlias (contactId: string, alias?: string | null) : Promise<string | void> { return { alias, contactId } as any }

  override async contactAvatar (contactId: string)                 : Promise<FileBoxInterface>
  override async contactAvatar (contactId: string, file: FileBoxInterface)  : Promise<void>
  override async contactAvatar (contactId: string, file?: FileBoxInterface) : Promise<void | FileBoxInterface> { return { contactId, file } as any }

  override async contactPhone (contactId: string, phoneList: string[]): Promise<void> { return { contactId, phoneList } as any }

  override async contactList () : Promise<string[]> { return {} as any }

  override async contactCorporationRemark (contactId: string, corporationRemark: string | null) : Promise<void> { return { contactId, corporationRemark } as any }

  override async contactDescription (contactId: string, description: string | null): Promise<void> { return { contactId, description } as any }

  override async contactRawPayload (id: string)            : Promise<any> { return { id } as any }
  override async contactRawPayloadParser (rawPayload: any) : Promise<PUPPET.payloads.Contact> { return { rawPayload } as any }

  /**
   *
   * Friendship
   *
   */
  override async friendshipRawPayload (id: string)            : Promise<any> { return { id } as any }
  override async friendshipRawPayloadParser (rawPayload: any) : Promise<PUPPET.payloads.Friendship> { return rawPayload }

  override async friendshipSearchPhone (phone: string)             : Promise<string | null> { return phone }
  override async friendshipSearchWeixin (weixin: string)           : Promise<string | null> { return weixin }
  override async friendshipAdd (contactId: string, hello?: string) : Promise<void> { return { contactId, hello } as any }
  override async friendshipAccept (friendshipId: string)           : Promise<void> { return { friendshipId } as any }

  /**
   *
   * Message
   *
   */
  override async messageFile (messageId: string)                                  : Promise<FileBoxInterface>             { return { messageId } as any }
  override async messageUrl (messageId: string)                                   : Promise<PUPPET.payloads.UrlLink>      { return { messageId } as any }
  override async messageImage (messageId: string, imageType: PUPPET.types.Image)  : Promise<FileBoxInterface>             { return { imageType, messageId } as any }
  override async messageContact (messageId: string)                               : Promise<string>                       { return { messageId } as any }
  override async messageMiniProgram (messageId: string)                           : Promise<PUPPET.payloads.MiniProgram>  { return { messageId } as any }
  override async messageLocation (messageId: string)                              : Promise<PUPPET.payloads.Location>     { return { messageId } as any }
  override async messageCallRecord  (messageId: string)                           : Promise<PUPPET.payloads.CallRecord> { return { messageId } as any }
  override async messageChatHistory (messageId: string)                           : Promise<PUPPET.payloads.ChatHistory[]> { return { messageId } as any }

  override async messageForward (to: string, messageId: string | string[])                                : Promise<void | string> { return { messageId, to } as any }
  override async messageSendContact (receiver: string, contactId: string)                                 : Promise<void | string> { return { contactId, receiver } as any }
  override async messageSendFile (to: string, file: FileBoxInterface)                                     : Promise<void | string> { return { file, to } as any }
  override async messageSendText (to: string, text: string)                                               : Promise<void | string> { return { text, to } as any }
  override async messageSendUrl (to: string, urlLinkPayload: PUPPET.payloads.UrlLink)                     : Promise<void | string> { return { to, urlLinkPayload } as any }
  override async messageSendMiniProgram (to: string, miniProgramPayload: PUPPET.payloads.MiniProgram)     : Promise<void | string> { return { miniProgramPayload, to } as any }
  override async messageSendLocation (conversationId: string, locationPayload: PUPPET.payloads.Location)  : Promise<void | string> { return { conversationId, locationPayload } as any }

  override async messageRecall (messageId: string) : Promise<boolean> { void messageId; return true }

  override async messageRawPayload (id: string)            : Promise<any> { return { id } as any }
  override async messageRawPayloadParser (rawPayload: any) : Promise<PUPPET.payloads.Message> { return { rawPayload } as any }

  /**
   *
   * Conversation
   *
   */
  override async conversationReadMark (conversationId: string, hasRead?: boolean) : Promise<void | boolean> { void conversationId, void hasRead }

  /**
   *
   * Room Invitation
   *
   */
  override async roomInvitationAccept (roomInvitationId: string): Promise<void> { void roomInvitationId }

  override async roomInvitationRawPayload (roomInvitationId: string) : Promise<any> { return { roomInvitationId } as any }
  override async roomInvitationRawPayloadParser (rawPayload: any)    : Promise<PUPPET.payloads.RoomInvitation> { return rawPayload }

  /**
   *
   * Room
   *
   */
  override async roomAnnounce (roomId: string)                : Promise<string>
  override async roomAnnounce (roomId: string, text: string)  : Promise<void>
  override async roomAnnounce (roomId: string, text?: string) : Promise<void | string> { return { roomId, text } as any }

  override async roomAdd (roomId: string, contactId: string)          : Promise<void> { return { contactId, roomId } as any }
  override async roomAvatar (roomId: string)                          : Promise<FileBoxInterface> { return { roomId } as any }
  override async roomCreate (contactIdList: string[], topic?: string) : Promise<string> { return { contactIdList, topic } as any }
  override async roomDel (roomId: string, contactId: string)          : Promise<void> { return { contactId, roomId } as any }
  override async roomQuit (roomId: string)                            : Promise<void> { return { roomId } as any }
  override async roomQRCode (roomId: string)                          : Promise<string> { return { roomId } as any }

  override async roomTopic (roomId: string)                 : Promise<string>
  override async roomTopic (roomId: string, topic: string)  : Promise<void>
  override async roomTopic (roomId: string, topic?: string) : Promise<string | void> { return { roomId, topic } as any }

  override async roomList ()                     : Promise<string[]> { return {} as any }
  override async roomMemberList (roomId: string) : Promise<string[]> { return { roomId } as any }

  override async roomRawPayload (id: string)            : Promise<any> { return { id } as any }
  override async roomRawPayloadParser (rawPayload: any) : Promise<PUPPET.payloads.Room> { return { rawPayload } as any }

  override async roomMemberRawPayload (roomId: string, contactId: string) : Promise<any> { return { contactId, roomId } as any }
  override async roomMemberRawPayloadParser (rawPayload: any)             : Promise<PUPPET.payloads.RoomMember> { return rawPayload }

  /**
   * expose to public for internal methods:
   */
  public override roomQueryFilterFactory (
    query: PUPPET.filters.Room,
  ): any {
    return super.roomQueryFilterFactory(query)
  }

  public override contactQueryFilterFactory (
    query: PUPPET.filters.Contact,
  ): any {
    return super.contactQueryFilterFactory(query)
  }

}

async function main () {
  const puppetInstance: PUPPET.Puppet = new PuppetTest()

  const payload: PAYLOADS.EventHeartbeat = { data: 'payload' }
  const type: TYPES.ContactGender        = TYPES.ContactGender.Male
  const filter: FILTERS.Contact          = { id: 'id' }
  const puppet: IMPLS.PuppetAbstract     = puppetInstance

  assert.ok(payload,  'should get valid PAYLOADS')
  assert.ok(type,     'should get valid TYPES')
  assert.ok(filter,   'should get valid FilTERS')
  assert.ok(puppet,   'should get valid IMPLS')

  if (PUPPET.VERSION === '0.0.0' || puppetInstance.name() === 'NONAME') {
    throw new Error('the `src/package-json.ts` has not been generated correctly.')
  }

  assert.strictEqual(puppetInstance.name(), '@juzi/wechaty-puppet', 'should get base class name')
  assert.notStrictEqual(puppetInstance.version(), '0.0.0', 'version should not be 0.0.0 when publishing')

  console.info(`Puppet v${puppetInstance.version()} smoking test passed.`)
  return 0
}

main()
  .then(process.exit)
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
