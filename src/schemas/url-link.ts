import type { FileBoxInterface } from 'file-box'

export interface UrlLinkPayload {
  description?    : string,
  thumbnailUrl?   : string,
  title           : string,
  url             : string,
  thumbnailFileBox: FileBoxInterface
}
