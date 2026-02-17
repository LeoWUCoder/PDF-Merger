export interface PdfFile {
  id: string
  file: File
  name: string
  size: number
  pageCount: number
  thumbnail?: string
  order: number
  summary?: string  // 中文摘要
  keyPoints?: string[]
}

export interface MergeOptions {
  autoRotate: boolean
  generateTOC: boolean  // 是否生成中文目录页
  tocEntries?: { title: string; pageNumber: number }[]  // AI生成的目录
}

export interface TocItem {
  title: string
  pageNumber: number
  level: number
  pageCount?: number
  children?: TocItem[]
}
