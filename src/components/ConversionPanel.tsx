import { useCallback, useState, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  Upload,
  ArrowRight,
  Loader2,
  Check,
  X,
  Download,
  RefreshCw,
  Sparkles
} from 'lucide-react'
import { cn } from '../lib/utils'
import {
  submitConversion,
  downloadResult,
  saveFile,
  pollTaskStatus,
  aiConvertPdf,
  aiConvertImage
} from '../lib/converter'
import { hasApiKey, getAiModel } from '../lib/ai'

const SOURCE_FORMATS = ['pdf', 'png', 'jpg', 'jpeg', 'md', 'txt']

const TARGET_FORMATS: Record<string, string[]> = {
  pdf: ['docx'],
  png: ['pdf', 'jpg', 'jpeg', 'webp'],
  jpg: ['pdf', 'png', 'webp'],
  jpeg: ['pdf', 'png', 'webp'],
  md: ['pdf', 'txt'],
  txt: ['pdf', 'md']
}

const FORMAT_ICONS: Record<string, string> = {
  pdf: '📄',
  png: '🖼️',
  jpg: '🖼️',
  jpeg: '🖼️',
  md: '📋',
  txt: '📃',
  webp: '🖼️',
  docx: '📝'
}

interface ConversionItem {
  id: string
  file: File
  sourceFormat: string
  targetFormat: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  error?: string
  taskId?: string
}

export function ConversionPanel() {
  const [items, setItems] = useState<ConversionItem[]>([])
  const [selectedFormat, setSelectedFormat] = useState<string>('')
  const [targetFormat, setTargetFormat] = useState<string>('')
  const [isConverting, setIsConverting] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [serverStatus, setServerStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking')
  const [useAiConvert, setUseAiConvert] = useState(false)

  // 检查服务器连接状态
  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await fetch('/api/formats')
        if (res.ok) {
          setServerStatus('connected')
        } else {
          setServerStatus('disconnected')
        }
      } catch {
        setServerStatus('disconnected')
      }
    }
    checkServer()
  }, [])

  // 获取文件格式
  const getFileFormat = (file: File): string => {
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    return SOURCE_FORMATS.includes(ext) ? ext : ''
  }

  // 处理文件选择
  const processFiles = useCallback((fileList: FileList | File[]) => {
    const validFiles: ConversionItem[] = []

    for (const file of fileList) {
      const format = getFileFormat(file)
      if (format) {
        validFiles.push({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          sourceFormat: format,
          targetFormat: '',
          status: 'pending',
          progress: 0
        })
      }
    }

    setItems(prev => [...prev, ...validFiles])
  }, [])

  // Dropzone 配置
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: processFiles,
    accept: {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'text/markdown': ['.md'],
      'text/plain': ['.txt']
    },
    multiple: true
  })

  // 更新目标格式
  const handleSourceFormatChange = (id: string, format: string) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, sourceFormat: format, targetFormat: '' } : item
    ))
  }

  // 移除单个项目
  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  // 清除所有
  const clearAll = () => {
    setItems([])
    setSelectedFormat('')
    setTargetFormat('')
    setError('')
    setSuccess('')
  }

  // 开始转换
  const handleConvert = async () => {
    const pendingItems = items.filter(item => item.targetFormat && item.status !== 'completed')
    if (pendingItems.length === 0) {
      setError('请先选择目标格式')
      return
    }

    // AI 转换需要 API Key
    if (useAiConvert && !hasApiKey()) {
      setError('请先配置 API Key 才能使用 AI 转换功能')
      return
    }

    setIsConverting(true)
    setError('')
    setSuccess('')

    for (const item of pendingItems) {
      try {
        // 更新状态为 processing
        setItems(prev => prev.map(i =>
          i.id === item.id ? { ...i, status: 'processing' as const, progress: 0 } : i
        ))

        // AI 转换（支持 PDF -> MD/TXT/DOCX，图片 -> TXT/MD）
        if (useAiConvert && (
          (item.sourceFormat === 'pdf' && (item.targetFormat === 'md' || item.targetFormat === 'txt' || item.targetFormat === 'docx')) ||
          (['png', 'jpg', 'jpeg'].includes(item.sourceFormat) && (item.targetFormat === 'txt' || item.targetFormat === 'md'))
        )) {
          const model = getAiModel()

          let blob: Blob
          if (['png', 'jpg', 'jpeg'].includes(item.sourceFormat)) {
            // 图片 AI 识别
            blob = await aiConvertImage(
              item.file,
              item.targetFormat as 'txt' | 'md',
              model,
              (_status, progress) => {
                setItems(prev => prev.map(i =>
                  i.id === item.id ? { ...i, progress } : i
                ))
              }
            )
          } else {
            // PDF AI 转换
            blob = await aiConvertPdf(
              item.file,
              item.targetFormat as 'md' | 'txt' | 'docx',
              model,
              (_status, progress) => {
                setItems(prev => prev.map(i =>
                  i.id === item.id ? { ...i, progress } : i
                ))
              }
            )
          }

          // 保存文件
          const fileName = item.file.name.replace(/\.[^/.]+$/, '') + '.' + item.targetFormat
          await saveFile(blob, fileName)

          setItems(prev => prev.map(i =>
            i.id === item.id ? { ...i, status: 'completed' as const, progress: 100, taskId: 'ai-converted' } : i
          ))
        } else {
          // 普通转换
          const { taskId } = await submitConversion(
            item.file,
            item.sourceFormat,
            item.targetFormat
          )

          // 更新任务 ID
          setItems(prev => prev.map(i =>
            i.id === item.id ? { ...i, taskId } : i
          ))

          // 轮询状态
          await pollTaskStatus(
            taskId,
            (status) => {
              setItems(prev => prev.map(i =>
                i.id === item.id ? { ...i, progress: status.progress } : i
              ))
            },
            () => {
              setItems(prev => prev.map(i =>
                i.id === item.id ? { ...i, status: 'completed' as const, progress: 100 } : i
              ))
            },
            (err) => {
              setItems(prev => prev.map(i =>
                i.id === item.id ? { ...i, status: 'failed' as const, error: err } : i
              ))
            }
          )
        }
      } catch (err) {
        setItems(prev => prev.map(i =>
          i.id === item.id ? { ...i, status: 'failed' as const, error: err instanceof Error ? err.message : '转换失败' } : i
        ))
      }
    }

    setIsConverting(false)
    setSuccess('转换完成！点击下载按钮保存文件。')
  }

  // 下载结果
  const handleDownload = async (item: ConversionItem) => {
    if (!item.taskId) return

    try {
      const blob = await downloadResult(item.taskId)
      const fileName = item.file.name.replace(/\.[^/.]+$/, '') + '.' + item.targetFormat
      await saveFile(blob, fileName)
    } catch (err) {
      setError(err instanceof Error ? err.message : '下载失败')
    }
  }

  // 批量设置格式
  const handleBatchFormat = (format: string) => {
    setSelectedFormat(format)
    setItems(prev => prev.map(item => ({
      ...item,
      sourceFormat: format,
      targetFormat: ''
    })))
  }

  // 批量设置目标格式
  const handleBatchTargetFormat = (format: string) => {
    setTargetFormat(format)
    setItems(prev => prev.map(item => ({
      ...item,
      targetFormat: format
    })))
  }

  // 格式图标
  const formatIcon = (format: string) => FORMAT_ICONS[format] || '📄'

  return (
    <div className="space-y-4">
      {/* 标题 */}
      <div className="flex items-center gap-2 pb-2 border-b">
        <RefreshCw className="w-5 h-5 text-green-600" />
        <h2 className="font-medium text-gray-800">格式转换</h2>
        <span className="text-xs text-gray-500 ml-auto">支持 PDF/图片/Markdown/TXT</span>
      </div>

      {/* 服务器状态 */}
      {serverStatus === 'checking' && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
          <span className="text-sm text-blue-600">正在连接转换服务...</span>
        </div>
      )}
      {serverStatus === 'disconnected' && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <X className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-600">无法连接到转换服务，请确保服务已启动</span>
        </div>
      )}

      {/* 上传区域 */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200',
          isDragActive && 'border-green-500 bg-green-50',
          !isDragActive && 'border-gray-300 hover:border-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-green-500'
        )}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-3">
          <div className={cn(
            'p-4 rounded-full transition-colors',
            isDragActive ? 'bg-green-100' : 'bg-gray-100'
          )}>
            {isDragActive ? (
              <Upload className="w-8 h-8 text-green-600" />
            ) : (
              <Upload className="w-8 h-8 text-gray-500" />
            )}
          </div>

          <div>
            <p className="text-lg font-medium text-gray-700">
              {isDragActive ? '释放文件到此处' : '拖拽文件到此处转换'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              支持 PDF、图片、Markdown、TXT 格式
            </p>
          </div>
        </div>
      </div>

      {/* 文件列表 */}
      {items.length > 0 && (
        <div className="space-y-3">
          {/* 批量操作栏 */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg flex-wrap">
            <span className="text-sm text-gray-600">批量设置:</span>
            <select
              className="text-sm border rounded px-2 py-1"
              value={selectedFormat}
              onChange={(e) => handleBatchFormat(e.target.value)}
            >
              <option value="">源格式</option>
              {SOURCE_FORMATS.map(f => (
                <option key={f} value={f}>{formatIcon(f)} {f.toUpperCase()}</option>
              ))}
            </select>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <select
              className="text-sm border rounded px-2 py-1"
              value={targetFormat}
              onChange={(e) => handleBatchTargetFormat(e.target.value)}
            >
              <option value="">目标格式</option>
              {TARGET_FORMATS[selectedFormat]?.map(f => (
                <option key={f} value={f}>{formatIcon(f)} {f.toUpperCase()}</option>
              ))}
            </select>

            {/* AI 转换开关 */}
            <div className="flex items-center gap-2 ml-auto">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useAiConvert}
                  onChange={(e) => setUseAiConvert(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded"
                />
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="text-sm text-purple-600">AI 转换</span>
              </label>
            </div>

            <button
              onClick={clearAll}
              className="text-sm text-red-500 hover:text-red-600"
            >
              清除全部
            </button>
          </div>

          {/* AI 转换提示 */}
          {useAiConvert && (
            <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-purple-600">
                AI 转换模式：使用硅基流动 AI 视觉模型，PDF/图片 → Markdown/TXT（支持扫描版PDF和图片OCR识别）
              </span>
            </div>
          )}

          {/* 文件列表 */}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {items.map(item => (
              <div
                key={item.id}
                className={cn(
                  'p-3 rounded-lg border flex items-center gap-3',
                  item.status === 'completed' && 'bg-green-50 border-green-200',
                  item.status === 'failed' && 'bg-red-50 border-red-200',
                  item.status === 'processing' && 'bg-blue-50 border-blue-200',
                  item.status === 'pending' && 'bg-white border-gray-200'
                )}
              >
                {/* 文件图标 */}
                <span className="text-2xl">{formatIcon(item.sourceFormat)}</span>

                {/* 文件信息 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {item.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(item.file.size / 1024).toFixed(1)} KB
                  </p>

                  {/* 进度条 */}
                  {item.status === 'processing' && (
                    <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}

                  {/* 错误信息 */}
                  {item.status === 'failed' && item.error && (
                    <p className="text-xs text-red-500 mt-1">{item.error}</p>
                  )}
                </div>

                {/* 格式选择 */}
                <div className="flex items-center gap-2">
                  <select
                    className="text-xs border rounded px-2 py-1"
                    value={item.sourceFormat}
                    onChange={(e) => handleSourceFormatChange(item.id, e.target.value)}
                    disabled={item.status !== 'pending'}
                  >
                    {SOURCE_FORMATS.map(f => (
                      <option key={f} value={f}>{f.toUpperCase()}</option>
                    ))}
                  </select>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <select
                    className="text-xs border rounded px-2 py-1"
                    value={item.targetFormat}
                    onChange={(e) => setItems(prev => prev.map(i =>
                      i.id === item.id ? { ...i, targetFormat: e.target.value } : i
                    ))}
                    disabled={item.status !== 'pending'}
                  >
                    <option value="">目标</option>
                    {(TARGET_FORMATS[item.sourceFormat] || []).map(f => (
                      <option key={f} value={f}>{f.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                {/* 状态/操作 */}
                <div className="flex items-center gap-2">
                  {item.status === 'pending' && (
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  {item.status === 'processing' && (
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                  )}

                  {item.status === 'completed' && (
                    <div className="flex items-center gap-1">
                      <Check className="w-4 h-4 text-green-500" />
                      <button
                        onClick={() => handleDownload(item)}
                        className="p-1 text-green-600 hover:text-green-700"
                        title="下载"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {item.status === 'failed' && (
                    <button
                      onClick={() => setItems(prev => prev.map(i =>
                        i.id === item.id ? { ...i, status: 'pending' as const, error: undefined } : i
                      ))}
                      className="p-1 text-red-500 hover:text-red-600"
                      title="重试"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 转换按钮 */}
          <button
            onClick={handleConvert}
            disabled={isConverting || !items.some(i => i.targetFormat)}
            className={cn(
              'w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2',
              isConverting
                ? 'bg-gray-300 text-gray-500 cursor-wait'
                : items.some(i => i.targetFormat)
                  ? useAiConvert
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            )}
          >
            {isConverting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {useAiConvert ? 'AI 转换中...' : '转换中...'}
              </>
            ) : (
              <>
                {useAiConvert ? <Sparkles className="w-5 h-5" /> : <RefreshCw className="w-5 h-5" />}
                {useAiConvert ? 'AI 转换' : '开始转换'}
              </>
            )}
          </button>

          {/* 成功消息 */}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <Check className="w-4 h-4 text-green-500" />
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}
        </div>
      )}

      {/* 错误消息 */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <X className="w-4 h-4 text-red-500" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  )
}
