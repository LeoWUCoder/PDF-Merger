import * as pdfjsLib from 'pdfjs-dist'

// 设置 pdf.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
}

// ============================================
// AI API Configuration
// ============================================

// SiliconFlow API (Free tier available)
const SILICONFLOW_API_URL = 'https://api.siliconflow.cn/v1/chat/completions'
const SILICONFLOW_MODEL = 'Qwen/Qwen2.5-7B-Instruct'

// Ollama local model
const OLLAMA_API_URL = 'http://localhost:11434/api/generate'
const OLLAMA_MODEL = 'qwen2.5:7b'

type Provider = 'siliconflow' | 'ollama'
const USE_PROVIDER: Provider = 'siliconflow'

// User-configurable API Key (loaded from UI)
let userApiKey: string | null = null

export function setApiKey(key: string) {
  userApiKey = key.trim()
}

export function getApiKey(): string | null {
  return userApiKey
}

export function hasApiKey(): boolean {
  return !!userApiKey && userApiKey.length > 0
}

interface ApiConfig {
  url: string
  headers: Record<string, string>
  model: string
  isOpenAiFormat: boolean
}

function getApiConfig(): ApiConfig {
  // Use user-provided API key for SiliconFlow
  const apiKey = userApiKey || ''

  switch (USE_PROVIDER) {
    case 'siliconflow':
      return {
        url: SILICONFLOW_API_URL,
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        model: SILICONFLOW_MODEL,
        isOpenAiFormat: true
      }
    case 'ollama':
      return {
        url: OLLAMA_API_URL,
        headers: { 'Content-Type': 'application/json' },
        model: OLLAMA_MODEL,
        isOpenAiFormat: false
      }
  }
}

// ============================================
// Types
// ============================================

export interface PdfSummary {
  pdfId: string
  summary: string
  keyPoints: string[]
  fileName: string  // 原始文件名
}

export interface TocEntry {
  title: string  // 中文标题
  pageNumber: number  // 起始页码
}

// ============================================
// Extract text from PDF
// ============================================

export async function extractTextFromPdf(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const maxPages = Math.min(pdf.numPages, 5)
    let fullText = ''

    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
      fullText += pageText + '\n'
    }

    if (fullText.length < 100) {
      console.log(`PDF "${file.name}" has little text`)
      const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
      return `文档: ${fileNameWithoutExt}`
    }

    return fullText.slice(0, 8000)
  } catch (error) {
    console.error('PDF text extraction failed:', error)
    const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
    return `文档: ${fileNameWithoutExt}`
  }
}

// ============================================
// Generate Chinese Summary
// ============================================

export async function generateChineseSummary(
  text: string,
  fileName: string,
  onProgress?: (status: string) => void
): Promise<PdfSummary> {
  onProgress?.('正在生成摘要...')

  const prompt = `请为以下文档生成简洁的中文摘要：

文件名: ${fileName}

文档内容:
${text.slice(0, 4000)}

请用2-3句话总结，并列出3-5个要点。
格式：
摘要: xxx
要点:
- xxx
- xxx
- xxx`

  try {
    const config = getApiConfig()

    let response: Response
    if (config.isOpenAiFormat) {
      response = await fetch(config.url, {
        method: 'POST',
        headers: config.headers,
        body: JSON.stringify({
          model: config.model,
          messages: [
            {
              role: 'system',
              content: '你是一个文档摘要助手。请用简洁准确的中文生成摘要。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 500,
          temperature: 0.5
        })
      })
    } else {
      response = await fetch(config.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          prompt: `你是文档摘要助手。请用简洁准确的中文生成摘要。\n\n${prompt}`,
          stream: false
        })
      })
    }

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API error: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    let result = ''

    if (config.isOpenAiFormat) {
      result = data.choices?.[0]?.message?.content || ''
    } else {
      result = data.response || ''
    }

    // 解析摘要
    const summaryMatch = result.match(/(?:摘要)[:：]\s*(.+)/i)
    const summary = summaryMatch ? summaryMatch[1].trim() : result.slice(0, 200)

    // 解析要点
    const keyPoints: string[] = []
    const lines = result.split('\n')
    let inKeyPointsSection = false
    for (const line of lines) {
      if (/^(?:要点)[:：]/.test(line)) {
        inKeyPointsSection = true
        continue
      }
      if (inKeyPointsSection && /^[-•*]\s*(.+)/.test(line)) {
        keyPoints.push(line.replace(/^[-•*]\s*/, '').trim())
      }
    }

    onProgress?.('摘要生成完成')

    return {
      pdfId: '',
      summary,
      keyPoints,
      fileName
    }
  } catch (error) {
    console.error('摘要生成失败:', error)
    onProgress?.('摘要生成失败')

    return {
      pdfId: '',
      summary: '无法生成摘要，请检查网络连接。',
      keyPoints: [],
      fileName
    }
  }
}

// ============================================
// Generate Chinese TOC (Table of Contents)
// ============================================

export async function generateChineseTOC(
  files: { id: string; name: string; summary: string; pageCount: number }[],
  onProgress?: (status: string, progress: number) => void
): Promise<TocEntry[]> {
  if (files.length === 0) return []

  onProgress?.('正在生成目录...', 50)

  // 构建每个文档的信息
  const docsInfo = files.map((f, idx) => {
    return `文档${idx + 1}: ${f.name}
摘要: ${f.summary || '无摘要'}
页数: ${f.pageCount}页`
  }).join('\n\n')

  const prompt = `以下是要合并的多个PDF文档的信息，请为整个合并文档生成一个中文目录结构。
根据每个文档的名称和摘要，判断其主要内容和主题，为合并后的文档生成合理的章节标题。

${docsInfo}

请生成目录结构，每个章节对应一个文档。
格式要求：
1. 只输出目录列表，不要其他内容
2. 每行格式: "章节标题 (页码)"
3. 目录应该反映文档的实际内容和阅读顺序
4. 使用简洁明了的中文标题

示例输出：
项目概述 (1)
技术方案详解 (5)
测试结果分析 (12)
总结与展望 (18)

目录:`

  try {
    const config = getApiConfig()

    let response: Response
    if (config.isOpenAiFormat) {
      response = await fetch(config.url, {
        method: 'POST',
        headers: config.headers,
        body: JSON.stringify({
          model: config.model,
          messages: [
            {
              role: 'system',
              content: '你是一个文档目录生成助手。请根据文档内容生成简洁准确的中文章节标题。只输出目录列表，每行一个章节。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 300,
          temperature: 0.3
        })
      })
    } else {
      response = await fetch(config.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          prompt: `你是文档目录生成助手。请根据文档内容生成简洁准确的中文章节标题。\n\n${prompt}`,
          stream: false
        })
      })
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    let result = ''

    if (config.isOpenAiFormat) {
      result = data.choices?.[0]?.message?.content || ''
    } else {
      result = data.response || ''
    }

    // 解析目录
    const tocEntries: TocEntry[] = []
    const lines = result.split('\n').filter(l => l.trim())

    // 计算每章的起始页码（根据实际文件页数）
    let currentPage = 2 // 目录页后开始（假设目录占1页）

    for (const line of lines) {
      // 匹配 "标题 (页码)" 或 "标题 页码" 格式
      const match = line.match(/^(.+?)\s*\(?(\d+)\)?$/)
      if (match) {
        tocEntries.push({
          title: match[1].trim(),
          pageNumber: currentPage
        })
        // 使用下一个文件的页数作为偏移
        const fileIndex = tocEntries.length - 1
        if (fileIndex < files.length) {
          currentPage += Math.max(1, files[fileIndex].pageCount)
        }
      }
    }

    // 如果没有解析到条目，使用文件名
    if (tocEntries.length === 0) {
      currentPage = 2
      for (const file of files) {
        const cleanName = file.name.replace(/\.pdf$/i, '').trim()
        tocEntries.push({
          title: cleanName,
          pageNumber: currentPage
        })
        currentPage += Math.max(1, file.pageCount)
      }
    }

    onProgress?.('目录生成完成', 100)

    return tocEntries
  } catch (error) {
    console.error('目录生成失败:', error)
    onProgress?.('目录生成失败', 100)

    // 使用文件名作为后备目录
    const tocEntries: TocEntry[] = []
    let currentPage = 2
    for (const file of files) {
      const cleanName = file.name.replace(/\.pdf$/i, '').trim()
      tocEntries.push({
        title: cleanName,
        pageNumber: currentPage
      })
      currentPage += Math.max(1, file.pageCount)
    }
    return tocEntries
  }
}

// ============================================
// Batch Generate Summaries
// ============================================

export async function generateBatchSummaries(
  files: { id: string; file: File; name: string }[],
  onProgress?: (fileName: string, progress: number) => void
): Promise<Map<string, PdfSummary>> {
  const results = new Map<string, PdfSummary>()

  for (let i = 0; i < files.length; i++) {
    const pdfFile = files[i]
    onProgress?.(pdfFile.name, (i / files.length) * 100)

    try {
      // 提取文本
      const text = await extractTextFromPdf(pdfFile.file)

      // 生成中文摘要
      const summary = await generateChineseSummary(text, pdfFile.name, () => {
        onProgress?.(pdfFile.name, ((i + 0.5) / files.length) * 100)
      })

      summary.pdfId = pdfFile.id
      results.set(pdfFile.id, summary)
    } catch (error) {
      console.error(`处理 ${pdfFile.name} 失败:`, error)
    }
  }

  onProgress?.('完成', 100)
  return results
}
