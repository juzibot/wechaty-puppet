export interface IMComponent {
  type: string
  componentId: number
  componentName: string
  extra: string
}

export interface ConsultCardAction {
  name: string                 // 操作名称
  actionType: number           // 操作类型：2-跳转等
  imComponent?: IMComponent
}

export interface ConsultCardPayload {
  id: number                    // 卡片 ID
  cardType: number              // 卡片类型：1-文字链接；5-电话收集等
  name: string                  // 卡片名称
  content: string               // 卡片内容
  status: number                // 卡片状态
  statusMsg: number             // 状态消息
  actions?: ConsultCardAction[] // 卡片操作
}

export interface ConsultCardListRequest {
  cardType: number         // 卡片类型：1-文字链接；5-电话收集等
  status?: number          // 卡片状态
  ids?: number[]           // 指定查询的卡片ID列表
  page: number             // 页码（从1开始）
  pageSize: number         // 每页数量（最多50）
}

export interface ConsultCardListResponse {
  total: number
  cards: ConsultCardPayload[]
}

export abstract class ConsultCard {

  abstract id(): number
  abstract cardType(): number
  abstract name(): string
  abstract content(): string
  abstract status(): number
  abstract statusMsg(): number
  abstract actions(): ConsultCardAction[] | undefined

}

export interface PremiumOnlineAppointmentCardPayload {
  componentId: number       // 组件ID
  titleImage: string        // 头图
  createTime: number        // 创建时间，单位：秒
  title: string             // 标题
  subTitle: string          // 子标题
}

export interface PremiumOnlineAppointmentCardSendPayload {
  msgType: number           // 消息类型
  componentType: number     // 组件类型
  componentId: number       // 组件ID
}

export interface PremiumOnlineAppointmentCardListRequest {
  linkTypes: number[]      // 组件类型
  page: number             // 页码（从1开始）
  pageSize: number         // 每页数量（最多50）
}

export interface PremiumOnlineAppointmentCardListResponse {
  total: number
  tools: PremiumOnlineAppointmentCardPayload[]
}

export enum ConsultCardComponentType {
  PremiumOnlineAppointmentCard    = 1,
  LeadCommodityCard               = 2,
  InvestmentFranchiseCard         = 3,
  PostSaleOrderCard               = 4,
  POICard                         = 5,
  PhoneCollectionCard             = 6,
  PhoneCollectionWithOneClickCard = 8,
}

export enum ConsultCardMsgType {
  PremiumOnlineAppointmentCard    = 16,
  PhoneCollectionWithOneClickCard = 20,
  LeadCommodityCard               = 21,
  POICard                         = 22,
  InvestmentFranchiseCard         = 23,
  PostSaleOrderCard               = 24,
  PhoneCollectionCard             = 25,
}

export abstract class PremiumOnlineAppointmentCard {

  abstract componentId(): number
  abstract titleImage(): string
  abstract createTime(): number
  abstract title(): string
  abstract subTitle(): string

}
