// ============================================
// MathType OCR - 公式识别模块
// 使用 SiliconFlow Qwen-VL 视觉模型识别图片中的数学公式
// ============================================

import { getApiKey } from './ai'

// SiliconFlow Qwen-VL API
const VL_API_URL = 'https://api.siliconflow.cn/v1/chat/completions'

// 存储用户选择的模型名称
let vlModelName: string = 'Qwen/Qwen3-VL-32B-Instruct'

export function setVlModelName(name: string) {
  vlModelName = name
}

export function getVlModelName(): string {
  return vlModelName
}

// ============================================
// Types
// ============================================

export interface MathRecognitionResult {
  formula: string
  latex?: string
  error?: string
}

// ============================================
// Utility Functions
// ============================================

// 将 File 转为 Base64
async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// ============================================
// Main Recognition Function
// ============================================

export async function recognizeMathFormula(
  imageFile: File,
  onProgress?: (status: string) => void
): Promise<MathRecognitionResult> {
  const apiKey = getApiKey()

  if (!apiKey || apiKey.trim().length === 0) {
    return { formula: '', error: '请先配置 SiliconFlow API Key' }
  }

  onProgress?.('正在识别公式...')

  try {
    // 将图片转为 Base64
    const base64Image = await fileToBase64(imageFile)
    const imageUrl = `data:image/png;base64,${base64Image}`

    // 使用 OpenAI 兼容格式
    const response = await fetch(VL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: vlModelName,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: '请识别图片中的数学公式，直接输出 MathType 格式的 LaTeX 代码。不要输出任何解释，只输出公式代码。用 $...$ 包裹 LaTeX。'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Math OCR API error:', errorText)
      return { formula: '', error: `API 错误: ${response.status} - ${errorText.slice(0, 100)}` }
    }

    const data = await response.json()
    const result = data.choices?.[0]?.message?.content || ''

    onProgress?.('识别完成')

    return { formula: result.trim() }
  } catch (error) {
    console.error('Math OCR failed:', error)
    onProgress?.('识别失败')
    return { formula: '', error: error instanceof Error ? error.message : '识别失败' }
  }
}

// ============================================
// Batch Recognition
// ============================================

export async function recognizeMultipleFormulas(
  files: File[],
  onProgress?: (current: number, total: number, status: string) => void
): Promise<MathRecognitionResult[]> {
  const results: MathRecognitionResult[] = []

  for (let i = 0; i < files.length; i++) {
    onProgress?.(i + 1, files.length, `正在识别第 ${i + 1} 张图片...`)
    const result = await recognizeMathFormula(files[i])
    results.push(result)
  }

  onProgress?.(files.length, files.length, '全部完成')
  return results
}
