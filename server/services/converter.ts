import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { conversionQueue } from './queue.ts'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import sharp from 'sharp'
import { Document, Packer, Paragraph, TextRun } from 'docx'

// 使用 createRequire 加载 pdf-parse
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const pdfParseLib = require('pdf-parse')
const PDFParse = pdfParseLib.PDFParse

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface ConvertOptions {
  quality?: number
  ocr?: boolean
  preserveLayout?: boolean
}

interface ConvertParams {
  inputPath: string
  fileName: string
  sourceFormat: string
  targetFormat: string
  options?: ConvertOptions
}

// 生成输出文件路径
function generateOutputPath(fileName: string, targetFormat: string): string {
  const outputsDir = path.join(__dirname, '../outputs')
  const nameWithoutExt = path.parse(fileName).name
  const timestamp = Date.now()
  const outputFileName = `${nameWithoutExt}_${timestamp}.${targetFormat}`
  return path.join(outputsDir, outputFileName)
}

// ============================================
// 图片格式转换
// ============================================
async function convertImage(inputPath: string, outputPath: string, targetFormat: string, quality?: number): Promise<string> {
  let pipeline = sharp(inputPath)

  switch (targetFormat) {
    case 'png':
      pipeline = pipeline.png()
      break
    case 'jpg':
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality: quality || 90 })
      break
    case 'webp':
      pipeline = pipeline.webp({ quality: quality || 90 })
      break
    default:
      throw new Error(`不支持的图片格式: ${targetFormat}`)
  }

  await pipeline.toFile(outputPath)
  return outputPath
}

// ============================================
// 图片转 PDF
// ============================================
async function imageToPdf(inputPath: string, outputPath: string): Promise<string> {
  const pdfDoc = await PDFDocument.create()
  const imageBytes = fs.readFileSync(inputPath)
  let image

  const ext = path.extname(inputPath).toLowerCase()
  if (ext === '.png') {
    image = await pdfDoc.embedPng(imageBytes)
  } else {
    image = await pdfDoc.embedJpg(imageBytes)
  }

  const page = pdfDoc.addPage([image.width, image.height])
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: image.width,
    height: image.height
  })

  await fs.promises.writeFile(outputPath, await pdfDoc.save())
  return outputPath
}

// ============================================
// 文本/Markdown 转 PDF
// ============================================
async function textToPdf(inputPath: string, outputPath: string, isMarkdown = false): Promise<string> {
  const content = await fs.promises.readFile(inputPath, 'utf-8')

  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  let lines: string[] = []

  if (isMarkdown) {
    const paragraphs = content.split('\n\n')
    for (const para of paragraphs) {
      if (para.startsWith('# ')) {
        lines.push(para.substring(2).toUpperCase())
        lines.push('')
      } else if (para.startsWith('## ')) {
        lines.push(para.substring(3).toUpperCase())
        lines.push('')
      } else if (para.startsWith('- ')) {
        const items = para.split('\n- ')
        for (const item of items) {
          lines.push('• ' + item.substring(2))
        }
        lines.push('')
      } else if (para.trim()) {
        lines.push(para)
        lines.push('')
      }
    }
  } else {
    lines = content.split('\n')
  }

  const pageWidth = 595.28
  const pageHeight = 841.89
  const margin = 50
  const fontSize = 12
  const lineHeight = fontSize * 1.5
  const maxWidth = pageWidth - margin * 2

  let y = pageHeight - margin
  let currentPage = pdfDoc.addPage([pageWidth, pageHeight])

  for (const line of lines) {
    if (y < margin + lineHeight) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight])
      y = pageHeight - margin
    }

    const words = line.split(' ')
    let currentLine = ''

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const testWidth = font.widthOfTextAtSize(testLine, fontSize)

      if (testWidth > maxWidth) {
        if (currentLine) {
          currentPage.drawText(currentLine, {
            x: margin,
            y,
            size: fontSize,
            font
          })
          y -= lineHeight
        }
        currentLine = word
      } else {
        currentLine = testLine
      }
    }

    if (currentLine) {
      currentPage.drawText(currentLine, {
        x: margin,
        y,
        size: fontSize,
        font
      })
      y -= lineHeight
    }
  }

  await fs.promises.writeFile(outputPath, await pdfDoc.save())
  return outputPath
}

// ============================================
// Markdown 转纯文本
// ============================================
async function markdownToText(inputPath: string, outputPath: string): Promise<string> {
  const content = await fs.promises.readFile(inputPath, 'utf-8')
  const plainText = content
    .replace(/^#+ /gm, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`/g, '')
    .replace(/```[\s\S]*?```/g, '')
  await fs.promises.writeFile(outputPath, plainText)
  return outputPath
}

// ============================================
// PDF 转 DOCX（仅限文字版PDF）
// ============================================
async function pdfToDocx(inputPath: string, outputPath: string): Promise<string> {
  const paragraphs: Paragraph[] = []

  const buffer = fs.readFileSync(inputPath)
  const pdfData = await new PDFParse(buffer)
  console.log('[pdfToDocx] PDF 文本长度:', pdfData.text?.length || 0)

  const textContent = pdfData.text || ''

  if (!textContent.trim()) {
    console.log('[pdfToDocx] PDF 没有可提取的文本层，可能是扫描版 PDF')
    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: '提示：此 PDF 为扫描版图片文档，没有可提取的文本层。', bold: true })]
    }))
    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: '如需转换扫描版 PDF，请使用 AI 转换模式（需要配置 API Key）。' })]
    }))
  } else {
    const lines = textContent.split('\n')
    for (const line of lines) {
      const text = line.trim()
      if (text) {
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text })]
        }))
      }
    }
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children: paragraphs
    }]
  })

  const docBuffer = await Packer.toBuffer(doc)
  fs.writeFileSync(outputPath, docBuffer)
  console.log('[pdfToDocx] DOCX 已保存:', outputPath)
  return outputPath
}

// ============================================
// 主转换函数
// ============================================
export async function convertFile(params: ConvertParams): Promise<string> {
  const { inputPath, fileName, sourceFormat, targetFormat, options } = params

  if (!fs.existsSync(inputPath)) {
    throw new Error('输入文件不存在')
  }

  const outputPath = generateOutputPath(fileName, targetFormat)

  const source = sourceFormat.toLowerCase()
  const target = targetFormat.toLowerCase()

  // 图片格式转换：png/jpg/jpeg <-> webp
  if (['png', 'jpg', 'jpeg', 'webp'].includes(source) && ['png', 'jpg', 'jpeg', 'webp'].includes(target)) {
    return await convertImage(inputPath, outputPath, target, options?.quality)
  }

  // 图片转 PDF
  if (['png', 'jpg', 'jpeg'].includes(source) && target === 'pdf') {
    return await imageToPdf(inputPath, outputPath)
  }

  // Markdown 转 PDF
  if (source === 'md' && target === 'pdf') {
    return await textToPdf(inputPath, outputPath, true)
  }

  // 纯文本转 PDF
  if (source === 'txt' && target === 'pdf') {
    return await textToPdf(inputPath, outputPath, false)
  }

  // Markdown 转纯文本
  if (source === 'md' && target === 'txt') {
    return await markdownToText(inputPath, outputPath)
  }

  // PDF 转 DOCX
  if (source === 'pdf' && target === 'docx') {
    return await pdfToDocx(inputPath, outputPath)
  }

  throw new Error(`不支持从 ${source.toUpperCase()} 转换为 ${target.toUpperCase()}`)
}
