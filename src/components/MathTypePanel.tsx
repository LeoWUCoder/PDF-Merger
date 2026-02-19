import { useCallback, useState, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  Upload,
  Image as ImageIcon,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  X,
  Settings
} from 'lucide-react'
import { recognizeMathFormula, setVlModelName, getVlModelName } from '../lib/math-ocr'
import { hasApiKey } from '../lib/ai'
import { cn } from '../lib/utils'

// 可选视觉模型列表
const VISION_MODELS = [
  { value: 'Qwen/Qwen3-VL-32B-Instruct', label: 'Qwen3-VL-32B (推荐)' },
  { value: 'Qwen/Qwen2-VL-7B-Instruct', label: 'Qwen2-VL-7B' },
  { value: 'Qwen/Qwen2-VL-2B-Instruct', label: 'Qwen2-VL-2B' },
  { value: 'LLaVA-7B-v1.5', label: 'LLaVA-7B' },
  { value: 'LLaVA-13B-v1.5', label: 'LLaVA-13B' },
  { value: 'MiniCPM-V', label: 'MiniCPM-V' },
]

export function MathTypePanel() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [result, setResult] = useState<string>('')
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [status, setStatus] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [showModelSelect, setShowModelSelect] = useState(false)

  // 加载已保存的模型
  useEffect(() => {
    const savedModel = getVlModelName()
    if (savedModel) {
      setSelectedModel(savedModel)
    } else {
      setSelectedModel(VISION_MODELS[0].value)
    }
  }, [])

  // 处理图片选择
  const processFiles = useCallback(async (fileList: FileList | File[]) => {
    const file = fileList[0]
    if (!file) return

    // 检查是否为图片
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件 (PNG, JPG, JPEG等)')
      return
    }

    setSelectedImage(file)
    setPreviewUrl(URL.createObjectURL(file))
    setResult('')
    setError('')
    setStatus('')
  }, [])

  // Dropzone 配置
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: processFiles,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp']
    },
    multiple: false,
    noClick: false
  })

  // 识别公式
  const handleRecognize = async () => {
    if (!selectedImage) return

    if (!hasApiKey()) {
      setError('请先配置 SiliconFlow API Key')
      return
    }

    setIsRecognizing(true)
    setError('')

    try {
      const result = await recognizeMathFormula(selectedImage, (msg) => {
        setStatus(msg)
      })

      if (result.error) {
        setError(result.error)
      } else {
        setResult(result.formula)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '识别失败')
    } finally {
      setIsRecognizing(false)
      setStatus('')
    }
  }

  // 清除选择
  const handleClear = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setSelectedImage(null)
    setPreviewUrl(null)
    setResult('')
    setStatus('')
    setError('')
  }

  // 复制结果
  const handleCopy = async () => {
    if (!result) return

    try {
      await navigator.clipboard.writeText(result)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  // 切换模型
  const handleModelChange = (model: string) => {
    setVlModelName(model)
    setSelectedModel(model)
    setShowModelSelect(false)
  }

  return (
    <div className="space-y-4">
      {/* 标题 */}
      <div className="flex items-center gap-2 pb-2 border-b">
        <ImageIcon className="w-5 h-5 text-blue-600" />
        <h2 className="font-medium text-gray-800">公式识别</h2>
        <span className="text-xs text-gray-500 ml-auto">MathType 格式</span>
      </div>

      {/* 模型选择 */}
      <div className="relative">
        <button
          onClick={() => setShowModelSelect(!showModelSelect)}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 transition-colors"
        >
          <span className="text-gray-700">
            模型: <span className="font-medium text-blue-600">
              {VISION_MODELS.find(m => m.value === selectedModel)?.label || selectedModel}
            </span>
          </span>
          <Settings className="w-4 h-4 text-gray-400" />
        </button>

        {showModelSelect && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
            {VISION_MODELS.map((model) => (
              <button
                key={model.value}
                onClick={() => handleModelChange(model.value)}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors',
                  model.value === selectedModel
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700'
                )}
              >
                {model.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 上传区域 */}
      {!selectedImage ? (
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200',
            isDragActive && 'border-blue-500 bg-blue-50',
            !isDragActive && 'border-gray-300 hover:border-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-blue-500'
          )}
        >
          <input {...getInputProps()} />

          <div className="flex flex-col items-center gap-3">
            <div className={cn(
              'p-4 rounded-full transition-colors',
              isDragActive ? 'bg-blue-100' : 'bg-gray-100'
            )}>
              {isDragActive ? (
                <Upload className="w-8 h-8 text-blue-600" />
              ) : (
                <Upload className="w-8 h-8 text-gray-500" />
              )}
            </div>

            <div>
              <p className="text-lg font-medium text-gray-700">
                {isDragActive ? '释放图片到此处' : '拖拽公式图片到此处'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                支持 PNG、JPG、GIF、WebP 格式
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* 预览区域 */
        <div className="space-y-4">
          {/* 图片预览 */}
          <div className="relative bg-gray-100 rounded-lg p-4">
            <button
              onClick={handleClear}
              className="absolute top-2 right-2 p-1 bg-gray-800/50 rounded-full text-white hover:bg-gray-800/70 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {previewUrl && (
              <img
                src={previewUrl}
                alt="Formula preview"
                className="max-w-full max-h-64 mx-auto rounded-lg"
              />
            )}
          </div>

          {/* 识别按钮 */}
          <button
            onClick={handleRecognize}
            disabled={isRecognizing || !hasApiKey()}
            className={cn(
              'w-full py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2',
              isRecognizing
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : hasApiKey()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-amber-500 text-white hover:bg-amber-600'
            )}
          >
            {isRecognizing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {status || '正在识别...'}
              </>
            ) : (
              <>
                <ImageIcon className="w-4 h-4" />
                {hasApiKey() ? '识别公式' : '需要配置 API Key'}
              </>
            )}
          </button>

          {/* 状态消息 */}
          {status && !isRecognizing && (
            <p className="text-sm text-blue-600 text-center">{status}</p>
          )}

          {/* 错误消息 */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* 识别结果 */}
          {result && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                识别结果
              </label>

              <div className="relative">
                <textarea
                  value={result}
                  readOnly
                  className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono bg-gray-50 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="识别结果将显示在这里..."
                />

                <button
                  onClick={handleCopy}
                  disabled={!result}
                  className={cn(
                    'absolute bottom-2 right-2 p-1.5 rounded transition-colors',
                    copied
                      ? 'bg-green-100 text-green-600'
                      : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                  )}
                  title="复制到剪贴板"
                >
                  {copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              <p className="text-xs text-gray-500">
                提示: 直接复制结果到 MathType 或支持 LaTeX 的编辑器中使用
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
