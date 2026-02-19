import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  Upload,
  Copy,
  Download,
  Loader2,
  Sparkles,
  FileText,
  Image,
  X,
  AlertCircle
} from 'lucide-react'
import { cn } from '../lib/utils'
import { hasApiKey, getVisionModel } from '../lib/ai'

// 将 File 转换为 base64
async function convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

interface ExtractItem {
  id: string
  file: File
  preview: string
  targetFormat: 'md' | 'txt' | 'plain'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result?: string
  error?: string
}

export function TextExtractPanel() {
  const [items, setItems] = useState<ExtractItem[]>([])
  const [selectedFormat, setSelectedFormat] = useState<'md' | 'txt' | 'plain'>('md')
  const [isExtracting, setIsExtracting] = useState(false)
  const [error, setError] = useState('')
  // 用于显示复制成功的状态
  const [_copiedId, setCopiedId] = useState<string | null>(null)

  const apiKeyConfigured = hasApiKey()

  // 处理粘贴事件（支持 Ctrl+V 粘贴图片）
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      const newItems: ExtractItem[] = []

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (!file) continue

          const preview = URL.createObjectURL(file)
          newItems.push({
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            file,
            preview,
            targetFormat: selectedFormat,
            status: 'pending'
          })
        }
      }

      if (newItems.length > 0) {
        setItems(prev => [...prev, ...newItems])
      }
    }

    document.addEventListener('paste', handlePaste as any)
    return () => document.removeEventListener('paste', handlePaste as any)
  }, [selectedFormat])

  // 处理文件选择
  const processFiles = useCallback((fileList: FileList | File[]) => {
    const newItems: ExtractItem[] = []

    for (const file of fileList) {
      if (!file.type.startsWith('image/')) continue

      const preview = URL.createObjectURL(file)
      newItems.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        preview,
        targetFormat: selectedFormat,
        status: 'pending'
      })
    }

    setItems(prev => [...prev, ...newItems])
  }, [selectedFormat])

  // Dropzone 配置
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: processFiles,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/webp': ['.webp']
    },
    multiple: true
  })

  // 更新单个项目的目标格式
  const handleItemFormatChange = (id: string, format: 'md' | 'txt' | 'plain') => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, targetFormat: format } : item
    ))
  }

  // 移除单个项目
  const removeItem = (id: string) => {
    setItems(prev => {
      const item = prev.find(i => i.id === id)
      if (item?.preview) {
        URL.revokeObjectURL(item.preview)
      }
      return prev.filter(i => i.id !== id)
    })
  }

  // 批量提取文字
  const handleExtract = async () => {
    const pendingItems = items.filter(item => item.status === 'pending')
    if (pendingItems.length === 0) {
      setError('请先上传图片')
      return
    }

    if (!apiKeyConfigured) {
      setError('请先配置 API Key 才能使用 AI 识别功能')
      return
    }

    setIsExtracting(true)
    setError('')

    for (const item of pendingItems) {
      try {
        // 更新状态
        setItems(prev => prev.map(i =>
          i.id === item.id ? { ...i, status: 'processing' as const } : i
        ))

        // 转换图片为 base64
        const base64Image = await convertFileToBase64(item.file)

        // 构建 prompt
        let prompt = ''
        if (item.targetFormat === 'md') {
          prompt = `请识别这张图片中的所有文字内容，并转换为 Markdown 格式。要求：
1. 保持原有段落结构和标题层级
2. 使用 # ## ### 等标题标记
3. 使用 **加粗**、*斜体*等格式
4. 如果有列表，使用 - 或 1. 2. 格式
5. 只输出转换后的 Markdown 内容，不要其他说明`
        } else if (item.targetFormat === 'txt') {
          prompt = `请识别这张图片中的所有文字内容，并转换为纯文本格式。要求：
1. 保持段落结构和换行
2. 不要任何 Markdown 格式标记
3. 不要其他说明，只输出文字内容`
        } else {
          prompt = `请识别这张图片中的所有文字内容，提取纯文本。保持段落结构，只输出文字内容。`
        }

        // 调用 SiliconFlow API
        const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('pdf-merger-api-key') || ''}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: getVisionModel(),
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
          throw new Error(`API 错误: ${response.status} - ${errorText}`)
        }

        const data = await response.json()
        const result = data.choices?.[0]?.message?.content || ''

        setItems(prev => prev.map(i =>
          i.id === item.id ? { ...i, status: 'completed' as const, result } : i
        ))
      } catch (err) {
        setItems(prev => prev.map(i =>
          i.id === item.id
            ? { ...i, status: 'failed' as const, error: err instanceof Error ? err.message : '识别失败' }
            : i
        ))
      }
    }

    setIsExtracting(false)
  }

  // 复制结果
  const handleCopy = async (item: ExtractItem) => {
    if (!item.result) return
    try {
      await navigator.clipboard.writeText(item.result)
      setCopiedId(item.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      setError('复制失败')
    }
  }

  // 下载结果
  const handleDownload = (item: ExtractItem) => {
    if (!item.result) return
    const blob = new Blob([item.result], {
      type: item.targetFormat === 'md' ? 'text/markdown' : 'text/plain'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${item.file.name.replace(/[^.]+/, '')}_extracted.${item.targetFormat === 'plain' ? 'txt' : item.targetFormat}`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 清除所有
  const clearAll = () => {
    items.forEach(item => {
      if (item.preview) URL.revokeObjectURL(item.preview)
    })
    setItems([])
    setError('')
  }

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center gap-2 pb-2 border-b">
        <FileText className="w-5 h-5 text-blue-600" />
        <h2 className="font-medium text-gray-800">图片文字提取</h2>
        <span className="text-xs text-gray-500 ml-auto">支持 PNG/JPG/WEBP</span>
      </div>

      {/* API Key 提示 */}
      {!apiKeyConfigured && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-yellow-600" />
          <span className="text-sm text-yellow-600">请先配置 API Key 才能使用此功能</span>
        </div>
      )}

      {/* 上传区域 */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200',
          isDragActive && 'border-blue-500 bg-blue-50',
          !isDragActive && 'border-gray-300 hover:border-gray-400'
        )}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-3">
          <div className={cn(
            'p-4 rounded-full transition-colors',
            isDragActive ? 'bg-blue-100' : 'bg-gray-100'
          )}>
            {isDragActive ? (
              <Image className="w-8 h-8 text-blue-600" />
            ) : (
              <Upload className="w-8 h-8 text-gray-500" />
            )}
          </div>

          <div>
            <p className="text-lg font-medium text-gray-700">
              {isDragActive ? '释放图片到此处' : '拖拽图片或 Ctrl+V 粘贴'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              支持 PNG、JPG、WEBP 格式，也支持 Ctrl+V 粘贴截图
            </p>
          </div>
        </div>
      </div>

      {/* 批量格式设置 */}
      {items.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-600">默认输出格式:</span>
          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value as typeof selectedFormat)}
            className="text-sm border rounded px-3 py-1"
          >
            <option value="md">Markdown (.md)</option>
            <option value="txt">TXT 格式 (.txt)</option>
            <option value="plain">纯文字 (.txt)</option>
          </select>
          <button
            onClick={clearAll}
            className="ml-auto text-sm text-red-500 hover:text-red-600"
          >
            清除全部
          </button>
        </div>
      )}

      {/* 图片列表 */}
      {items.length > 0 && (
        <div className="space-y-4">
          {items.map(item => (
            <div
              key={item.id}
              className={cn(
                'p-4 rounded-lg border flex gap-4',
                item.status === 'completed' && 'bg-green-50 border-green-200',
                item.status === 'failed' && 'bg-red-50 border-red-200',
                item.status === 'processing' && 'bg-blue-50 border-blue-200',
                item.status === 'pending' && 'bg-white border-gray-200'
              )}
            >
              {/* 图片预览 */}
              <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={item.preview}
                  alt={item.file.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* 文件信息 */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {item.file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(item.file.size / 1024).toFixed(1)} KB
                </p>

                {/* 格式选择 */}
                <div className="mt-2 flex items-center gap-2">
                  <select
                    value={item.targetFormat}
                    onChange={(e) => handleItemFormatChange(item.id, e.target.value as typeof item.targetFormat)}
                    disabled={item.status !== 'pending'}
                    className="text-xs border rounded px-2 py-1"
                  >
                    <option value="md">Markdown</option>
                    <option value="txt">TXT 格式</option>
                    <option value="plain">纯文字</option>
                  </select>

                  {item.status === 'processing' && (
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                  )}
                </div>

                {/* 错误信息 */}
                {item.status === 'failed' && item.error && (
                  <p className="text-xs text-red-500 mt-1">{item.error}</p>
                )}
              </div>

              {/* 操作按钮 */}
              <div className="flex flex-col gap-2">
                {item.status === 'pending' && (
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-2 text-gray-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                {item.status === 'completed' && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleCopy(item)}
                      className="p-2 text-gray-500 hover:text-blue-600"
                      title="复制"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDownload(item)}
                      className="p-2 text-gray-500 hover:text-green-600"
                      title="下载"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* 提取结果 */}
              {item.status === 'completed' && item.result && (
                <div className="col-span-full mt-2">
                  <div className="p-3 bg-white rounded border text-sm max-h-40 overflow-y-auto whitespace-pre-wrap">
                    {item.result}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* 提取按钮 */}
          <button
            onClick={handleExtract}
            disabled={isExtracting || !items.some(i => i.status === 'pending')}
            className={cn(
              'w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2',
              isExtracting
                ? 'bg-gray-300 text-gray-500 cursor-wait'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            )}
          >
            {isExtracting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                提取中...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                提取选中图片的文字
              </>
            )}
          </button>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-600">{error}</span>
        </div>
      )}

      {/* 功能说明 */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-medium text-blue-800 mb-2">功能说明</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>AI 识别</strong>：使用 SiliconFlow 视觉模型（Qwen3-VL-32B）识别图片中的文字</li>
          <li>• <strong>输出格式</strong>：支持 Markdown、TXT、纯文字三种格式</li>
          <li>• <strong>复制/下载</strong>：提取完成后可以复制到剪贴板或下载为文件</li>
          <li>• <strong>粘贴输入</strong>：支持 Ctrl+V 直接粘贴截图</li>
        </ul>
      </div>
    </div>
  )
}
