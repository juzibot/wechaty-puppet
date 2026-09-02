export enum SameNetVerifyStatus {
  UNKNOWN   = 0,
  AVAILABLE = 1, // 每张登录码都附带验证 URL，仅供上游刷新展示
  REQUIRED  = 2, // 微信扫码后要求先做同网络验证
  CONNECTED = 3, // 验证工具 APK 已扫码并连接成功
  EXPIRED   = 4, // 登录码过期 / 取消 / 已登录，验证状态作废
}

export enum SameNetVerifyScene {
  UNKNOWN = 0,
  LOGIN   = 1,
}
