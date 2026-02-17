import { PDFDocument, degrees, rgb, StandardFonts, PDFFont } from 'pdf-lib'
import type { PdfFile, MergeOptions } from '../types'
import type { TocEntry } from './ai'

// 字体文件路径
const FONT_URL = '/fonts/NotoSansSC-Regular.woff2'

// fontkit 实例缓存
let fontkitInstance: any = null

// 获取 fontkit 实例
async function getFontkit() {
  if (fontkitInstance) return fontkitInstance
  try {
    // 使用动态导入获取 fontkit
    const fontkitModule = await import('fontkit')
    // 获取 create 函数
    const create = fontkitModule.create || fontkitModule.default?.create
    if (!create) {
      throw new Error('fontkit create function not found')
    }
    // 创建 Fontkit 接口对象
    fontkitInstance = { create }
    return fontkitInstance
  } catch (error) {
    console.error('[Font] Failed to load fontkit:', error)
    throw error
  }
}

// 字体缓存
let cachedFont: PDFFont | null = null

// 加载中文字体
async function loadChineseFont(pdf: PDFDocument): Promise<PDFFont> {
  if (cachedFont) return cachedFont

  try {
    // 加载 fontkit 并直接设置到 pdf 实例
    const fontkit = await getFontkit()
    ;(pdf as any).fontkit = fontkit

    const fontUrl = new URL(FONT_URL, window.location.origin).toString()
    const response = await fetch(fontUrl)

    if (!response.ok) {
      throw new Error(`Failed to fetch font: ${response.status}`)
    }

    const fontBytes = await response.arrayBuffer()

    // 嵌入字体
    cachedFont = await pdf.embedFont(fontBytes)

    return cachedFont
  } catch (error) {
    console.error('[Font] Failed to load Chinese font:', error)
    throw error
  }
}

export async function getPdfInfo(file: File): Promise<{ pageCount: number }> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
  return { pageCount: pdf.getPageCount() }
}

export async function mergePdfs(files: PdfFile[], options: MergeOptions): Promise<PDFDocument> {
  const mergedPdf = await PDFDocument.create()

  // 收集每个文件的起始页码
  const fileStartPages: { name: string; pageNumber: number; summary?: string }[] = []

  if (options.generateTOC) {
    // 预留第一页作为目录页
    fileStartPages.push({ name: 'TOC Page', pageNumber: 1 })
  }

  // 记录每个文件的起始页码
  let currentPage = options.generateTOC ? 2 : 1
  for (const pdfFile of files) {
    fileStartPages.push({
      name: pdfFile.name,
      pageNumber: currentPage,
      summary: pdfFile.summary
    })
    currentPage += pdfFile.pageCount
  }

  // 如果需要生成目录页
  if (options.generateTOC && options.tocEntries) {
    await addTOCPage(mergedPdf, options.tocEntries)
  }

  // 合并所有PDF
  for (const pdfFile of files) {
    const arrayBuffer = await pdfFile.file.arrayBuffer()
    const srcPdf = await PDFDocument.load(arrayBuffer)
    const pageIndices = srcPdf.getPageIndices()
    const copiedPages = await mergedPdf.copyPages(srcPdf, pageIndices)

    copiedPages.forEach((page) => {
      if (options.autoRotate) {
        const rotation = page.getRotation().angle
        if (rotation !== 0) {
          page.setRotation(degrees(rotation))
        }
      }
      mergedPdf.addPage(page)
    })
  }

  return mergedPdf
}

// 添加中文目录页
async function addTOCPage(pdf: PDFDocument, tocEntries: TocEntry[]) {
  if (tocEntries.length === 0) return

  // 加载中文字体
  const chineseFont = await loadChineseFont(pdf)

  // 使用 Helvetica 用于数字和英文
  const helvetica = await pdf.embedFont(StandardFonts.Helvetica)

  const pageWidth = 595.28
  const pageHeight = 841.89
  const marginLeft = 50
  const marginRight = 50
  const marginTop = 50
  const marginBottom = 50
  const lineHeight = 28  // 增大行间距防止文字重叠

  let currentPage = pdf.addPage([pageWidth, pageHeight])
  let y = pageHeight - marginTop

  // 标题
  currentPage.drawText('目 录', {
    x: marginLeft,
    y,
    size: 32,
    font: chineseFont,
    color: rgb(0.2, 0.2, 0.2)
  })
  y -= 30

  // 分割线
  currentPage.drawLine({
    start: { x: marginLeft, y },
    end: { x: pageWidth - marginRight, y },
    thickness: 2,
    color: rgb(0.3, 0.3, 0.3)
  })
  y -= 25

  for (const entry of tocEntries) {
    // 检查是否需要新页面（预留足够空间）
    if (y < marginBottom + 50) {
      currentPage = pdf.addPage([pageWidth, pageHeight])
      y = pageHeight - marginTop

      // 标题
      currentPage.drawText('目 录（续）', {
        x: marginLeft,
        y,
        size: 28,
        font: chineseFont,
        color: rgb(0.2, 0.2, 0.2)
      })
      y -= 40

      // 分割线
      currentPage.drawLine({
        start: { x: marginLeft, y },
        end: { x: pageWidth - marginRight, y },
        thickness: 1,
        color: rgb(0.5, 0.5, 0.5)
      })
      y -= 25
    }

    // 章节标题（中文）- 使用中文字体
    currentPage.drawText(entry.title, {
      x: marginLeft,
      y,
      size: 14,
      font: chineseFont,
      color: rgb(0.2, 0.2, 0.2)
    })

    // 页码 - 使用 Helvetica
    const pageText = `${entry.pageNumber}`
    const pageNumWidth = helvetica.widthOfTextAtSize(pageText, 11)

    // 绘制点线（使用小圆点）
    const dotLineStart = marginLeft + chineseFont.widthOfTextAtSize(entry.title, 14) + 10
    const dotLineEnd = pageWidth - marginRight - pageNumWidth - 10
    const dotCount = Math.max(1, Math.floor((dotLineEnd - dotLineStart) / 8))
    for (let i = 0; i < dotCount; i++) {
      currentPage.drawCircle({
        x: dotLineStart + i * 8,
        y: y + 5,
        size: 1.5,
        color: rgb(0.6, 0.6, 0.6)
      })
    }

    // 绘制页码（蓝色）
    currentPage.drawText(pageText, {
      x: pageWidth - marginRight - pageNumWidth,
      y,
      size: 11,
      font: helvetica,
      color: rgb(0.2, 0.4, 0.8)
    })

    y -= lineHeight
  }

  // 更新底部页码 - 使用中文字体
  const pages = pdf.getPages()
  const totalPages = pages.length
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]
    const text = `第 ${i + 1} 页 / 共 ${totalPages} 页`
    const textWidth = chineseFont.widthOfTextAtSize(text, 9)
    page.drawText(text, {
      x: (pageWidth - textWidth) / 2,
      y: marginBottom - 10,
      size: 9,
      font: chineseFont,
      color: rgb(0.5, 0.5, 0.5)
    })
  }
}

export async function generatePdfBlob(pdf: PDFDocument): Promise<Blob> {
  const bytes = await pdf.save()
  return new Blob([bytes as unknown as ArrayBuffer], { type: 'application/pdf' })
}
