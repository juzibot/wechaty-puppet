export interface ConsultCardAction {
  name: string                 // 操作名称
  actionType: number           // 操作类型：2-跳转等
  imComponent?: {              // 组件信息
    type: string
    componentId: number
    componentName: string
    extra: string
  }
}

export interface ConsultCardPayload {
  // 发送时必需的字段
  msgType: number
  componentType: number
  componentId: number

  // 从抖音 API 返回的详细信息（接收/查询时才有）
  id?: number                   // 卡片 ID
  cardType?: number             // 卡片类型：1-文字链接；5-电话收集等
  name?: string                 // 卡片名称
  content?: string              // 卡片内容
  status?: number               // 卡片状态
  statusMsg?: number            // 状态消息
  actions?: ConsultCardAction[] // 卡片操作
}

export abstract class ConsultCard {

  abstract msgType(): number
  abstract componentType(): number
  abstract componentId(): number
  abstract id(): number | undefined
  abstract cardType(): number | undefined
  abstract name(): string | undefined
  abstract content(): string | undefined
  abstract status(): number | undefined
  abstract statusMsg(): number | undefined
  abstract actions(): ConsultCardAction[] | undefined

}
