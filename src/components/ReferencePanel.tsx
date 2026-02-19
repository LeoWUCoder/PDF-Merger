import { useState } from 'react'
import {
  FileText,
  Copy,
  Download,
  Loader2,
  Sparkles,
  Link,
  AlertCircle
} from 'lucide-react'
import { hasApiKey } from '../lib/ai'
import { cn } from '../lib/utils'

// 支持的参考文献格式
const CITATION_STYLES = [
  { id: 'apa', name: 'APA', desc: 'American Psychological Association' },
  { id: 'mla', name: 'MLA', desc: 'Modern Language Association' },
  { id: 'harvard', name: 'Harvard', desc: 'Harvard Reference Style' },
  { id: 'gbt7714', name: 'GB/T 7714', desc: '中国国家标准' },
  { id: 'chicago', name: 'Chicago', desc: 'Chicago Style' },
  { id: 'nature', name: 'Nature', desc: 'Nature Journal Format' },
  { id: 'ieee', name: 'IEEE', desc: 'Institute of Electrical and Electronics Engineers' },
]

// DOI 格式检测
function isDOI(input: string): boolean {
  return /^10\.\d{4,}\/[-._;()/:A-Z0-9]+$/i.test(input.trim()) ||
    /^https?:\/\/doi\.org\/10\.\d{4,}\/.*$/i.test(input.trim())
}

export function ReferencePanel() {
  const [inputMode, setInputMode] = useState<'text' | 'doi'>('text')
  const [inputText, setInputText] = useState('')
  const [doiInput, setDoiInput] = useState('')
  const [selectedStyle, setSelectedStyle] = useState('apa')
  const [result, setResult] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  // 检查 API Key
  const apiKeyConfigured = hasApiKey()

  // 生成参考文献
  const handleGenerate = async () => {
    const sourceText = inputMode === 'doi' ? doiInput : inputText

    if (!sourceText.trim()) {
      setError('请输入参考文献内容或 DOI 链接')
      return
    }

    const apiKey = localStorage.getItem('pdf-merger-api-key')
    if (!apiKey) {
      setError('请先配置 API Key 才能使用此功能')
      return
    }

    setIsGenerating(true)
    setError('')
    setResult('')

    // 构建格式说明
    const formatInstructions: Record<string, string> = {
      apa: 'APA格式 (第七版): 作者. (年份). 标题. 期刊名称, 卷(期), 页码. DOI',
      mla: 'MLA格式 (第九版): 作者. "文章标题." 期刊名称, 卷.号 (年份): 页码.',
      harvard: 'Harvard格式: 作者 (年份) \'文章标题\', 期刊名称, 卷(期), pp. 页码.',
      gbt7714: 'GB/T 7714格式: [序号] 作者. 题名[J]. 刊名, 年, 卷(期): 起止页码.',
      chicago: 'Chicago格式: 作者. "文章标题." 期刊名称 vol, no. 期 (年份): 页码.',
      nature: 'Nature格式: 作者, 标题. 期刊名称 **年份**, 页码.',
      ieee: 'IEEE格式: [#] A. Author, "Title," Journal Name, vol, no, pp, year.'
    }

    const formatGuide = formatInstructions[selectedStyle] || formatInstructions['apa']

    try {
      // 直接调用 SiliconFlow API
      const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
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
              content: `你是一个文献格式化助手。用户提供了参考文献或DOI，请提取文献信息并按指定格式输出。只输出格式化后的参考文献，不要其他说明。`
            },
            {
              role: 'user',
              content: `请将以下参考文献格式化为 ${formatGuide}

输入内容：
${sourceText}

只输出格式化后的参考文献，不要任何其他说明。`
            }
          ],
          max_tokens: 500,
          temperature: 0.3
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        if (errorText.includes('Invalid token') || errorText.includes('401')) {
          throw new Error('API Key 无效，请检查配置')
        } else if (errorText.includes('insufficient')) {
          throw new Error('API Key 余额不足')
        }
        throw new Error('AI 处理失败')
      }

      const data = await response.json()
      const result = data.choices?.[0]?.message?.content || ''
      setResult(result.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败')
    } finally {
      setIsGenerating(false)
    }
  }

  // 复制到剪贴板
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('复制失败')
    }
  }

  // 下载为 txt 文件
  const handleDownload = () => {
    const blob = new Blob([result], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reference_${selectedStyle}_${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 清除结果
  const handleClear = () => {
    setInputText('')
    setDoiInput('')
    setResult('')
    setError('')
  }

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center gap-2 pb-2 border-b">
        <FileText className="w-5 h-5 text-blue-600" />
        <h2 className="font-medium text-gray-800">参考文献格式化</h2>
        <span className="text-xs text-gray-500 ml-auto">支持 APA/MLA/Harvard/GB-T 等格式</span>
      </div>

      {/* API Key 提示 */}
      {!apiKeyConfigured && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-yellow-600" />
          <span className="text-sm text-yellow-600">请先在页面底部配置 API Key 才能使用此功能</span>
        </div>
      )}

      {/* 输入模式切换 */}
      <div className="flex gap-2">
        <button
          onClick={() => setInputMode('text')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            inputMode === 'text'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
        >
          粘贴文献
        </button>
        <button
          onClick={() => setInputMode('doi')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1',
            inputMode === 'doi'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
        >
          <Link className="w-4 h-4" />
          DOI 链接
        </button>
      </div>

      {/* 输入区域 */}
      {inputMode === 'text' ? (
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            apiKeyConfigured
              ? '粘贴参考文献内容...\n支持：作者. 标题. 期刊, 年份, 页码等信息'
              : '请先配置 API Key'
          }
          disabled={!apiKeyConfigured}
          className="w-full h-40 p-4 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      ) : (
        <div className="space-y-2">
          <input
            type="text"
            value={doiInput}
            onChange={(e) => setDoiInput(e.target.value)}
            placeholder={apiKeyConfigured ? '输入 DOI 链接，例如：10.1038/nature12345' : '请先配置 API Key'}
            disabled={!apiKeyConfigured}
            className="w-full p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {doiInput && isDOI(doiInput) && (
            <p className="text-sm text-green-600 flex items-center gap-1">
              <Sparkles className="w-4 h-4" />
              检测到有效的 DOI 链接
            </p>
          )}
        </div>
      )}

      {/* 格式选择 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">选择引用格式</label>
        <select
          value={selectedStyle}
          onChange={(e) => setSelectedStyle(e.target.value)}
          disabled={!apiKeyConfigured}
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {CITATION_STYLES.map(style => (
            <option key={style.id} value={style.id}>
              {style.name} - {style.desc}
            </option>
          ))}
        </select>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !apiKeyConfigured}
          className={cn(
            'flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2',
            isGenerating
              ? 'bg-gray-300 text-gray-500 cursor-wait'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          )}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              生成参考文献
            </>
          )}
        </button>
        <button
          onClick={handleClear}
          disabled={isGenerating}
          className="px-6 py-3 border rounded-lg text-gray-700 hover:bg-gray-50"
        >
          清除
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-600">{error}</span>
        </div>
      )}

      {/* 结果展示 */}
      {result && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">格式化结果</label>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
              >
                <Copy className="w-4 h-4" />
                {copied ? '已复制!' : '复制'}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
              >
                <Download className="w-4 h-4" />
                下载
              </button>
            </div>
          </div>
          <div className="p-4 bg-gray-50 border rounded-lg whitespace-pre-wrap text-sm max-h-80 overflow-y-auto">
            {result}
          </div>
        </div>
      )}

      {/* 格式说明 */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-medium text-blue-800 mb-2">支持的输入格式</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>DOI 链接</strong>：自动从数据库获取文献信息并格式化</li>
          <li>• <strong>粘贴文献</strong>：粘贴完整的参考文献文本，AI 自动识别并格式化</li>
          <li>• <strong>支持的格式</strong>：{CITATION_STYLES.map(s => s.name).join('、')}</li>
        </ul>
      </div>
    </div>
  )
}
