import { useState, useCallback, useEffect } from 'react'
import { Sparkles, Loader2, Check, List, Trash2, Plus, ChevronDown, ChevronUp, Settings } from 'lucide-react'
import { generateBatchSummaries, generateChineseTOC, setAiModel, getAiModel, type TocEntry } from '../lib/ai'
import type { PdfFile, MergeOptions } from '../types'
import { cn } from '../lib/utils'

// 可选文本模型列表
const TEXT_MODELS = [
  { value: 'Qwen/Qwen2.5-7B-Instruct', label: 'Qwen2.5-7B (推荐)' },
  { value: 'Qwen/Qwen2.5-3B-Instruct', label: 'Qwen2.5-3B' },
  { value: 'Qwen/Qwen2-7B-Instruct', label: 'Qwen2-7B' },
  { value: 'Qwen/Qwen2-1.5B-Instruct', label: 'Qwen2-1.5B' },
  { value: 'deepseek-ai/DeepSeek-V2', label: 'DeepSeek-V2' },
  { value: '01-ai/Yi-1.5-9B-Chat', label: 'Yi-1.5-9B' },
]

interface AiSummaryPanelProps {
  files: PdfFile[]
  onUpdateFile: (id: string, updates: Partial<PdfFile>) => void
  onUpdateOptions: React.Dispatch<React.SetStateAction<MergeOptions>>
  tocEntries: TocEntry[]
  disabled?: boolean
}

export function AiSummaryPanel({ files, onUpdateFile, onUpdateOptions, tocEntries, disabled }: AiSummaryPanelProps) {
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [isGeneratingTOC, setIsGeneratingTOC] = useState(false)
  const [progress, setProgress] = useState<{ fileName: string; percent: number } | null>(null)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [editableToc, setEditableToc] = useState<TocEntry[]>([])
  const [showTocEditor, setShowTocEditor] = useState(false)
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [showModelSelect, setShowModelSelect] = useState(false)

  // 加载已保存的模型
  useEffect(() => {
    const savedModel = getAiModel()
    if (savedModel) {
      setSelectedModel(savedModel)
    } else {
      setSelectedModel(TEXT_MODELS[0].value)
    }
  }, [])

  // 切换模型
  const handleModelChange = (model: string) => {
    setAiModel(model)
    setSelectedModel(model)
    setShowModelSelect(false)
  }

  const handleGenerateSummaries = useCallback(async () => {
    if (files.length === 0 || isGeneratingSummary) return

    setIsGeneratingSummary(true)
    setProgress({ fileName: '准备中...', percent: 0 })
    setCompletedIds(new Set())

    try {
      const summaries = await generateBatchSummaries(
        files.map(f => ({ id: f.id, file: f.file, name: f.name })),
        (fileName, percent) => {
          setProgress({ fileName, percent })
        }
      )

      // 更新文件的摘要信息
      summaries.forEach((summary, id) => {
        onUpdateFile(id, {
          summary: summary.summary,
          keyPoints: summary.keyPoints
        })
        setCompletedIds(prev => new Set([...prev, id]))
      })
    } catch (error) {
      console.error('批量生成摘要失败:', error)
    } finally {
      setIsGeneratingSummary(false)
      setProgress(null)
    }
  }, [files, isGeneratingSummary, onUpdateFile])

  const handleGenerateTOC = useCallback(async () => {
    if (files.length === 0 || isGeneratingTOC) return

    // 检查是否所有文件都有摘要
    const filesWithSummary = files.filter(f => f.summary)
    if (filesWithSummary.length === 0) {
      alert('请先生成摘要后再生成目录')
      return
    }

    setIsGeneratingTOC(true)
    setProgress({ fileName: '正在生成目录...', percent: 50 })

    try {
      const newTocEntries = await generateChineseTOC(
        files.map(f => ({
          id: f.id,
          name: f.name,
          summary: f.summary || '',
          pageCount: f.pageCount
        })),
        (status, percent) => {
          setProgress({ fileName: status, percent })
        }
      )

      // 保存目录到选项和编辑状态
      onUpdateOptions(prev => ({ ...prev, tocEntries: newTocEntries }))
      setEditableToc(newTocEntries)
      setShowTocEditor(true)

      setProgress({ fileName: '目录生成完成', percent: 100 })
    } catch (error) {
      console.error('生成目录失败:', error)
    } finally {
      setIsGeneratingTOC(false)
      setTimeout(() => setProgress(null), 2000)
    }
  }, [files, isGeneratingTOC, onUpdateOptions])

  // 更新 TOC 条目
  const handleUpdateTocEntry = useCallback((index: number, updates: Partial<TocEntry>) => {
    const newToc = [...editableToc]
    newToc[index] = { ...newToc[index], ...updates }
    setEditableToc(newToc)
    onUpdateOptions(prev => ({ ...prev, tocEntries: newToc }))
  }, [editableToc, onUpdateOptions])

  // 删除 TOC 条目
  const handleDeleteTocEntry = useCallback((index: number) => {
    const newToc = editableToc.filter((_, i) => i !== index)
    setEditableToc(newToc)
    onUpdateOptions(prev => ({ ...prev, tocEntries: newToc }))
  }, [editableToc, onUpdateOptions])

  // 添加 TOC 条目
  const handleAddTocEntry = useCallback(() => {
    const newEntry: TocEntry = { title: '新章节', pageNumber: editableToc.length > 0 ? editableToc[editableToc.length - 1].pageNumber + 1 : 2 }
    const newToc = [...editableToc, newEntry]
    setEditableToc(newToc)
    onUpdateOptions(prev => ({ ...prev, tocEntries: newToc }))
  }, [editableToc, onUpdateOptions])

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-800 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          AI 智能功能
        </h3>
        <span className="text-sm text-gray-500">
          {files.length} 个文件
        </span>
      </div>

      {/* 模型选择 */}
      <div className="relative mb-4">
        <button
          onClick={() => setShowModelSelect(!showModelSelect)}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 transition-colors"
        >
          <span className="text-gray-700">
            模型: <span className="font-medium text-purple-600">
              {TEXT_MODELS.find(m => m.value === selectedModel)?.label || selectedModel}
            </span>
          </span>
          <Settings className="w-4 h-4 text-gray-400" />
        </button>

        {showModelSelect && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
            {TEXT_MODELS.map((model) => (
              <button
                key={model.value}
                onClick={() => handleModelChange(model.value)}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors',
                  model.value === selectedModel
                    ? 'bg-purple-50 text-purple-600 font-medium'
                    : 'text-gray-700'
                )}
              >
                {model.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {/* 生成摘要按钮 */}
        <button
          onClick={handleGenerateSummaries}
          disabled={disabled || isGeneratingSummary || files.length === 0}
          className={cn(
            'w-full py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors',
            isGeneratingSummary
              ? 'bg-purple-100 text-purple-700 cursor-wait'
              : 'bg-purple-600 text-white hover:bg-purple-700'
          )}
        >
          {isGeneratingSummary ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {progress ? `${Math.round(progress.percent)}%` : '处理中...'}
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              生成中文摘要
            </>
          )}
        </button>

        {/* 生成目录按钮 */}
        <button
          onClick={handleGenerateTOC}
          disabled={disabled || isGeneratingTOC || completedIds.size === 0}
          className={cn(
            'w-full py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors',
            isGeneratingTOC
              ? 'bg-blue-100 text-blue-700 cursor-wait'
              : completedIds.size === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
          )}
        >
          {isGeneratingTOC ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {progress ? `${Math.round(progress.percent)}%` : '处理中...'}
            </>
          ) : (
            <>
              <List className="w-4 h-4" />
              生成中文目录
            </>
          )}
        </button>
      </div>

      {progress && (
        <div className="mt-3 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>{progress.fileName}</span>
          </div>
          <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      )}

      {completedIds.size > 0 && (
        <div className="mt-3 p-2 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2 text-green-700 text-sm">
            <Check className="w-4 h-4" />
            <span>已为 {completedIds.size} 个文件生成摘要</span>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
        {files.map(file => (
          <div
            key={file.id}
            className={cn(
              'p-3 rounded-lg border text-sm',
              completedIds.has(file.id)
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-200'
            )}
          >
            <div className="font-medium text-gray-800 truncate">{file.name}</div>
            {file.summary ? (
              <div className="mt-1 text-gray-600">
                <div className="text-xs font-medium text-purple-600 mb-1">摘要</div>
                <p className="text-xs line-clamp-2">{file.summary}</p>
                {file.keyPoints && file.keyPoints.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs font-medium text-purple-600">要点</div>
                    <ul className="mt-1 space-y-1">
                      {file.keyPoints.slice(0, 3).map((point, idx) => (
                        <li key={idx} className="text-xs text-gray-600 flex items-start gap-1">
                          <span className="text-purple-400">•</span>
                          <span className="line-clamp-1">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-1 text-xs text-gray-400">
                {completedIds.has(file.id) ? '摘要生成中...' : '未生成摘要'}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 目录预览和编辑 */}
      {tocEntries.length > 0 && (
        <div className="mt-4 border-t pt-4">
          <button
            onClick={() => setShowTocEditor(!showTocEditor)}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="font-medium text-gray-800 flex items-center gap-2">
              <List className="w-4 h-4 text-blue-600" />
              目录预览 ({tocEntries.length} 项)
            </span>
            {showTocEditor ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {showTocEditor && (
            <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
              {tocEntries.map((entry, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                >
                  <span className="w-6 text-xs text-gray-400">{index + 1}.</span>
                  <input
                    type="text"
                    value={entry.title}
                    onChange={(e) => handleUpdateTocEntry(index, { title: e.target.value })}
                    className="flex-1 text-sm border rounded px-2 py-1"
                    placeholder="章节标题"
                  />
                  <span className="text-xs text-gray-400">页码</span>
                  <input
                    type="number"
                    value={entry.pageNumber}
                    onChange={(e) => handleUpdateTocEntry(index, { pageNumber: parseInt(e.target.value) || 1 })}
                    className="w-16 text-sm border rounded px-2 py-1"
                    min="1"
                  />
                  <button
                    onClick={() => handleDeleteTocEntry(index)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <button
                onClick={handleAddTocEntry}
                className="flex items-center gap-1 w-full p-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                <Plus className="w-4 h-4" />
                添加章节
              </button>
            </div>
          )}
        </div>
      )}

      <p className="mt-3 text-xs text-gray-500">
        提示：先生成摘要，再点击"生成中文目录"，目录将添加到合并后的PDF开头。
      </p>
    </div>
  )
}
