export enum WxxdProductSkuStatus {
  /** 初始值 */
  Initial = 0,
  /** 上架中 */
  OnSale = 5,
  /** 已下架 */
  OffShelf = 11,
  /** 预售结束后的删除态 */
  Deleted = 21,
}

export enum WxxdProductStatus {
  /** 初始值 */
  Initial = 0,
  /** 编辑中 */
  Editing = 1,
  /** 审核中 */
  Auditing = 2,
  /** 审核失败 */
  AuditFailed = 3,
  /** 审核成功 */
  AuditSuccess = 4,
  /** 上架 */
  OnSale = 5,
  /** 回收站 */
  Recycled = 6,
  /** 商品异步提交，上传中 */
  Uploading = 7,
  /** 商品异步提交，上传失败 */
  UploadFailed = 8,
  /** 彻底删除，商品无法再进行任何操作 */
  Deleted = 9,
  /** 冻结，审核通过但是不能上架 */
  Frozen = 10,
  /** 自主下架 */
  SelfOffShelf = 11,
  /** 售罄下架 */
  SoldOut = 12,
  /** 违规下架/风控系统下架 */
  ViolationOffShelf = 13,
  /** 保证金不足下架 */
  DepositInsufficient = 14,
  /** 品牌过期下架 */
  BrandExpired = 15,
  /** 商品被封禁 */
  Banned = 20,
  /** SKU逻辑删除 */
  SkuDeleted = 21,
  /** 商品不存在 */
  NotExist = 30,
  /** 质检不通过 */
  QualityCheckFailed = 71,
}

export interface WxxdProductDescInfoPayload {
  desc: string,
  imgs: string[],
}

export interface WxxdProductSkuPayload {
  skuId: string,
  outSkuId: string,
  thumbImage: string,
  salePrice: number,
  stockNum: number,
  skuCode: string,
  status: WxxdProductSkuStatus,
}

export interface WxxdProductExtraServicePayload {
  sevenDayReturn: number,
  payAfterUse: number,
  freightInsurance: number,
  damageGuarantee: number,
  fakeOnePayThree: number,
  exchangeSupport: number,
}

export interface WxxdProductPayload {
  productId: string,
  title: string,
  shortTitle: string,
  headImgs: string[],
  descInfo: WxxdProductDescInfoPayload,
  status: WxxdProductStatus,
  minPrice: number,
  totalSoldNum: number,
  skus: WxxdProductSkuPayload[],
  extraService: WxxdProductExtraServicePayload,
}
