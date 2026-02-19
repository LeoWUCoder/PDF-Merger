// 格式转换 API 客户端

import { getApiKey, getVisionModel, isVisionModel } from './ai'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'

const API_BASE = '/api'
const SILICONFLOW_API_URL = 'https://api.siliconflow.cn/v1/chat/completions'

export interface ConvertTask {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  outputPath?: string
  error?: string
}

export interface FormatList {
  source: string[]
  target: Record<string, string[]>
}

// 获取支持的格式列表
export async function getFormats(): Promise<FormatList> {
  const res = await fetch(`${API_BASE}/formats`)
  if (!res.ok) throw new Error('获取格式列表失败')
  return res.json()
}

// 提交转换任务
export async function submitConversion(
  file: File,
  sourceFormat: string,
  targetFormat: string,
  options?: { quality?: number; ocr?: boolean; preserveLayout?: boolean }
): Promise<{ taskId: string }> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('sourceFormat', sourceFormat)
  formData.append('targetFormat', targetFormat)
  if (options) {
    formData.append('options', JSON.stringify(options))
  }

  const res = await fetch(`${API_BASE}/convert`, {
    method: 'POST',
    body: formData
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || '提交转换任务失败')
  }

  return res.json()
}

// 查询任务状态
export async function getTaskStatus(taskId: string): Promise<ConvertTask> {
  const res = await fetch(`${API_BASE}/convert/status/${taskId}`)
  if (!res.ok) throw new Error('查询任务状态失败')
  return res.json()
}

// 获取所有任务
export async function getAllTasks(): Promise<ConvertTask[]> {
  const res = await fetch(`${API_BASE}/convert/tasks`)
  if (!res.ok) throw new Error('获取任务列表失败')
  return res.json()
}

// 下载转换结果
export async function downloadResult(taskId: string): Promise<Blob> {
  const res = await fetch(`${API_BASE}/convert/download/${taskId}`)
  if (!res.ok) throw new Error('下载失败')
  return res.blob()
}

// 取消任务
export async function cancelTask(taskId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/convert/${taskId}`, {
    method: 'DELETE'
  })
  if (!res.ok) throw new Error('取消任务失败')
}

// 轮询任务状态
export async function pollTaskStatus(
  taskId: string,
  onProgress?: (status: ConvertTask) => void,
  onComplete?: (task: ConvertTask) => void,
  onError?: (error: string) => void
): Promise<void> {
  const poll = async () => {
    try {
      const task = await getTaskStatus(taskId)
      onProgress?.(task)

      if (task.status === 'completed') {
        onComplete?.(task)
        return true
      }

      if (task.status === 'failed') {
        onError?.(task.error || '转换失败')
        return true
      }

      // 继续轮询
      setTimeout(poll, 500)
    } catch (err) {
      onError?.(err instanceof Error ? err.message : '查询失败')
    }
  }

  poll()
}

// 保存文件到本地
export async function saveFile(blob: Blob, fileName: string): Promise<void> {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ============================================
// AI 转换功能
// ============================================

// 提取 PDF 文本（通过服务器端）
export async function extractPdfText(file: File): Promise<{ text: string; isScanned: boolean }> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${API_BASE}/extract-pdf-text`, {
    method: 'POST',
    body: formData
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || '提取 PDF 文本失败')
  }

  const data = await res.json()

  // 如果服务器返回警告，说明是扫描版 PDF
  if (data.warning) {
    return { text: '', isScanned: true }
  }

  return { text: data.text || '', isScanned: false }
}

// 使用视觉模型转换 PDF（扫描版）- 通过服务器端处理
async function convertWithVisionModel(
  file: File,
  apiKey: string,
  model: string,
  targetFormat: string,
  onProgress?: (status: string, progress: number) => void
): Promise<string> {
  onProgress?.('正在上传 PDF 到服务器...', 10)

  // 1. 将 PDF 上传到服务器，服务器将 PDF 转为图片并返回
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${API_BASE}/pdf-to-images`, {
    method: 'POST',
    body: formData
  })

  if (!res.ok) {
    throw new Error('PDF 转图片失败')
  }

  const data = await res.json()
  const images: string[] = data.images || []

  if (images.length === 0) {
    throw new Error('PDF 页面转图片失败')
  }

  onProgress?.(`已获取 ${images.length} 张图片，正在调用 AI 识别...`, 50)

  // 2. 构建视觉模型的 prompt
  let prompt = ''
  if (targetFormat === 'md') {
    prompt = `请识别以下 PDF 页面的图片中的文字内容，并将全部内容转换为 Markdown 格式。要求：1. 保持原有段落结构和标题层级 2. 使用 # ## ### 等标题标记 3. 使用 **加粗**、*斜体*等格式 4. 只输出转换后的 Markdown 内容`
  } else if (targetFormat === 'docx') {
    prompt = `请识别以下 PDF 页面图片中的文字内容，并将全部内容转换为 Word 文档结构。按以下格式返回：- 一级标题: <H1>标题内容</H1> - 二级标题: <H2>标题内容</H2> - 列表项: <LI>列表内容</LI> - 普通段落: <P>段落内容</P>`
  } else {
    prompt = `请识别以下 PDF 页面图片中的文字内容，提取纯文本。保持段落结构，不要任何格式标记。`
  }

  // 3. 构建消息内容（支持多图）
  const imageContent = images.map(img => ({
    type: 'image_url',
    image_url: { url: img }
  }))

  // 4. 调用 SiliconFlow 视觉模型 API
  const response = await fetch(SILICONFLOW_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: '你是一个文档识别助手，准确地从图片中提取文字并转换为指定格式。'
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            ...imageContent
          ]
        }
      ],
      max_tokens: 8192,
      temperature: 0.3
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`AI API 错误: ${response.status} - ${errorText}`)
  }

  const responseData = await response.json()
  const result = responseData.choices?.[0]?.message?.content || ''

  return result
}

// AI 转换 PDF 到文本格式
export async function aiConvertPdf(
  file: File,
  targetFormat: 'md' | 'txt' | 'docx',
  model?: string,
  onProgress?: (status: string, progress: number) => void
): Promise<Blob> {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error('请先在设置中配置 API Key')
  }

  // 使用传入的模型，或使用视觉模型
  const visionModel = model || getVisionModel()

  // 检查是否为视觉模型
  if (isVisionModel(visionModel)) {
    onProgress?.('正在使用视觉模型识别 PDF...', 10)

    // 视觉模型直接处理 PDF（通过服务器转图片）
    const result = await convertWithVisionModel(file, apiKey, visionModel, targetFormat, onProgress)

    onProgress?.('正在生成文件...', 90)

    // 生成文件
    if (targetFormat === 'docx') {
      const paragraphs = parseDocxContent(result)
      const doc = new Document({
        sections: [{
          properties: {},
          children: paragraphs
        }]
      })
      const docxBuffer = await Packer.toBuffer(doc)
      return new Blob([new Uint8Array(docxBuffer)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    } else {
      const blob = new Blob([result], { type: targetFormat === 'md' ? 'text/markdown' : 'text/plain' })
      return blob
    }
  }

  // 非视觉模型：先尝试提取文本
  onProgress?.('正在提取 PDF 文本...', 20)

  const { text, isScanned } = await extractPdfText(file)

  if (isScanned || !text.trim()) {
    throw new Error('此 PDF 为扫描版图片文档，没有可提取的文本层。请选择视觉模型（如 Qwen/Qwen2-VL-7B-Instruct）进行转换。')
  }

  onProgress?.('正在调用 AI 模型...', 40)

  // 构建 prompt
  let prompt = ''
  if (targetFormat === 'md') {
    prompt = `请将以下 PDF 文档内容转换为 Markdown 格式：

${text}

要求：
1. 保持原有段落结构和标题层级
2. 使用 # ## ### 等标题标记
3. 使用 **加粗**、*斜体*等格式
4. 如果有列表，使用 - 或 1. 2. 格式
5. 只输出转换后的 Markdown 内容，不要其他说明`
  } else if (targetFormat === 'docx') {
    prompt = `请将以下 PDF 文档内容转换为 Word 文档结构，按以下格式返回：

分析文档结构，为每个段落/标题添加标记：
- 以 "#标题" 开头的为一级标题
- 以 "##标题" 开头的为二级标题
- 以 "-标题" 开头的为列表项
- 普通段落直接输出

PDF 内容：
${text}

请返回结构化的内容，使用特殊标记标明标题和列表，我会用程序解析这些标记生成 Word 文档。
格式说明：
- 一级标题: <H1>标题内容</H1>
- 二级标题: <H2>标题内容</H2>
- 三级标题: <H3>标题内容</H3>
- 列表项: <LI>列表内容</LI>
- 普通段落: <P>段落内容</P>

只输出标记后的内容，不要其他说明。`
  } else {
    prompt = `请提取以下 PDF 文档的纯文本内容：

${text}

要求：
1. 只输出纯文本内容
2. 保持段落结构
3. 不要任何格式标记
4. 不要其他说明`
  }

  // 调用 SiliconFlow API
  const response = await fetch(SILICONFLOW_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'Qwen/Qwen2.5-7B-Instruct',
      messages: [
        {
          role: 'system',
          content: '你是一个文档转换助手，请准确地将 PDF 内容转换为指定格式。只输出转换结果，使用我指定的标记格式。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 8192,
      temperature: 0.3
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`AI API 错误: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const result = data.choices?.[0]?.message?.content || ''

  onProgress?.('正在生成文件...', 80)

  // 生成文件
  if (targetFormat === 'docx') {
    // 解析 AI 返回的内容，生成 DOCX
    const paragraphs = parseDocxContent(result)
    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs
      }]
    })
    const docxBuffer = await Packer.toBuffer(doc)
    return new Blob([new Uint8Array(docxBuffer)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
  } else {
    const blob = new Blob([result], { type: targetFormat === 'md' ? 'text/markdown' : 'text/plain' })
    return blob
  }
}

// ============================================
// 图片 AI 识别功能
// ============================================

// 将 File 转换为 base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// AI 转换图片到文本格式（支持 OCR 识别）
export async function aiConvertImage(
  file: File,
  targetFormat: 'txt' | 'md',
  model?: string,
  onProgress?: (status: string, progress: number) => void
): Promise<Blob> {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error('请先在设置中配置 API Key')
  }

  const visionModel = model || getVisionModel()
  onProgress?.('正在读取图片...', 10)

  // 将图片转换为 base64
  const base64Image = await fileToBase64(file)

  onProgress?.('正在调用 AI 识别图片...', 30)

  // 构建 prompt
  let prompt = ''
  if (targetFormat === 'md') {
    prompt = `请识别这张图片中的所有文字内容，并转换为 Markdown 格式。要求：
1. 保持原有段落结构和标题层级
2. 使用 # ## ### 等标题标记
3. 使用 **加粗**、*斜体*等格式
4. 如果有列表，使用 - 或 1. 2. 格式
5. 只输出转换后的 Markdown 内容，不要其他说明`
  } else {
    prompt = `请识别这张图片中的所有文字内容，提取纯文本。保持段落结构，只输出纯文本内容，不要任何格式标记。`
  }

  // 调用 SiliconFlow 视觉模型 API
  const response = await fetch(SILICONFLOW_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: visionModel,
      messages: [
        {
          role: 'system',
          content: '你是一个图片OCR识别助手，准确地从图片中提取文字并转换为指定格式。'
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: base64Image }
            }
          ]
        }
      ],
      max_tokens: 8192,
      temperature: 0.3
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`AI API 错误: ${response.status} - ${errorText}`)
  }

  const responseData = await response.json()
  const result = responseData.choices?.[0]?.message?.content || ''

  onProgress?.('正在生成文件...', 90)

  const blob = new Blob([result], { type: targetFormat === 'md' ? 'text/markdown' : 'text/plain' })
  return blob
}

// 解析 AI 返回的内容生成 DOCX 段落
function parseDocxContent(content: string): Paragraph[] {
  const paragraphs: Paragraph[] = []

  // 分割内容为行
  const lines = content.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // 解析标记
    if (trimmed.startsWith('<H1>') && trimmed.endsWith('</H1>')) {
      const text = trimmed.replace('<H1>', '').replace('</H1>', '')
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text, bold: true, size: 32 })],
        heading: HeadingLevel.HEADING_1
      }))
    } else if (trimmed.startsWith('<H2>') && trimmed.endsWith('</H2>')) {
      const text = trimmed.replace('<H2>', '').replace('</H2>', '')
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text, bold: true, size: 28 })],
        heading: HeadingLevel.HEADING_2
      }))
    } else if (trimmed.startsWith('<H3>') && trimmed.endsWith('</H3>')) {
      const text = trimmed.replace('<H3>', '').replace('</H3>', '')
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text, bold: true, size: 24 })],
        heading: HeadingLevel.HEADING_3
      }))
    } else if (trimmed.startsWith('<LI>') && trimmed.endsWith('</LI>')) {
      const text = trimmed.replace('<LI>', '').replace('</LI>', '')
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: '• ' + text })],
        indent: { left: 720 }
      }))
    } else if (trimmed.startsWith('<P>') && trimmed.endsWith('</P>')) {
      const text = trimmed.replace('<P>', '').replace('</P>', '')
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text })]
      }))
    } else {
      // 普通段落（没有标记的内容也作为普通段落）
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: trimmed })]
      }))
    }
  }

  return paragraphs
}
