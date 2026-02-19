import { useState, useCallback, useEffect } from 'react'
import { FileText, Image, BookOpen } from 'lucide-react'
import { FileUploader } from './components/FileUploader'
import { FileList } from './components/FileList'
import { MergeButton, MergeOptionsPanel } from './components/MergeButton'
import { AiSummaryPanel } from './components/AiSummaryPanel'
import { MathTypePanel } from './components/MathTypePanel'
import { ReferencePanel } from './components/ReferencePanel'
import { TextExtractPanel } from './components/TextExtractPanel'
import { ApiKeyPanel } from './components/ApiKeyPanel'
import { mergePdfs, generatePdfBlob } from './lib/pdf-utils'
import { setApiKey } from './lib/ai'
import type { PdfFile, MergeOptions } from './types'

type TabType = 'pdf-merger' | 'math-ocr' | 'reference' | 'text-extract'

function App() {
  const [files, setFiles] = useState<PdfFile[]>([])
  const [selectedFile, setSelectedFile] = useState<PdfFile | null>(null)
  const [options, setOptions] = useState<MergeOptions>({
    autoRotate: true,
    generateTOC: true,
    tocEntries: []
  })
  const [activeTab, setActiveTab] = useState<TabType>('pdf-merger')

  // Restore API key from localStorage on app start
  useEffect(() => {
    const savedKey = localStorage.getItem('pdf-merger-api-key')
    if (savedKey) {
      setApiKey(savedKey)
    }
  }, [])

  const handleFilesAdded = useCallback((newFiles: PdfFile[]) => {
    setFiles((prev) => [...prev, ...newFiles])
    if (!selectedFile && newFiles.length > 0) {
      setSelectedFile(newFiles[0])
    }
  }, [selectedFile])

  const handleRemoveFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
    if (selectedFile?.id === id) {
      setSelectedFile(null)
    }
  }, [selectedFile])

  const handleReorderFiles = useCallback((reorderedFiles: PdfFile[]) => {
    setFiles(reorderedFiles)
  }, [])

  const handleUpdateFile = useCallback((id: string, updates: Partial<PdfFile>) => {
    setFiles(prev => prev.map(f =>
      f.id === id ? { ...f, ...updates } : f
    ))
  }, [])

  const handleMerge = useCallback(async () => {
    if (files.length === 0) {
      throw new Error('No files to merge')
    }
    const mergedPdf = await mergePdfs(files, {
      ...options,
      tocEntries: options.generateTOC ? options.tocEntries : undefined
    })
    return generatePdfBlob(mergedPdf)
  }, [files, options])

  // Tab 配置
  const tabs = [
    { id: 'pdf-merger' as const, icon: FileText, label: 'PDF 合并', color: 'blue' },
    { id: 'math-ocr' as const, icon: Image, label: '公式识别', color: 'green' },
    { id: 'reference' as const, icon: BookOpen, label: '参考文献', color: 'purple' },
    { id: 'text-extract' as const, icon: FileText, label: '文字提取', color: 'orange' },
  ]

  const getTabColor = (color: string, active: boolean) => {
    if (active) {
      return {
        bg: `bg-${color}-600`,
        text: 'text-white',
        icon: `bg-${color}-100`,
        iconColor: `text-${color}-600`
      }
    }
    return {
      bg: 'bg-gray-100',
      text: 'text-gray-700 hover:bg-gray-200',
      icon: '',
      iconColor: ''
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            {activeTab === 'math-ocr' ? (
              <div className="p-2 bg-green-100 rounded-lg">
                <Image className="w-6 h-6 text-green-600" />
              </div>
            ) : activeTab === 'reference' ? (
              <div className="p-2 bg-purple-100 rounded-lg">
                <BookOpen className="w-6 h-6 text-purple-600" />
              </div>
            ) : activeTab === 'text-extract' ? (
              <div className="p-2 bg-orange-100 rounded-lg">
                <FileText className="w-6 h-6 text-orange-600" />
              </div>
            ) : (
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            )}
            <h1 className="text-xl font-bold text-gray-800">
              {activeTab === 'math-ocr' ? 'Math Type OCR' :
                activeTab === 'reference' ? '参考文献格式化' :
                  activeTab === 'text-extract' ? '图片文字提取' : 'PDF Merger'}
            </h1>
          </div>
        </div>
      </header>

      {/* Tab 切换按钮 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2 py-2">
            {tabs.map(tab => {
              const active = activeTab === tab.id
              const colors = getTabColor(tab.color, active)
              const Icon = tab.icon

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${colors.bg} ${active ? '' : colors.text}`}
                >
                  <div className={`p-1 rounded ${active ? colors.icon : ''}`}>
                    <Icon className={`w-4 h-4 ${active ? colors.iconColor : ''}`} />
                  </div>
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'pdf-merger' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <FileUploader onFilesAdded={handleFilesAdded} />

              <div className="bg-white rounded-lg border p-4">
                <h2 className="font-medium text-gray-800 mb-3">Files</h2>
                <FileList
                  files={files}
                  onRemove={handleRemoveFile}
                  onReorder={handleReorderFiles}
                  onSelect={setSelectedFile}
                  selectedId={selectedFile?.id}
                />
              </div>

              <ApiKeyPanel />
            </div>

            <div className="lg:col-span-2 space-y-4">
              <AiSummaryPanel
                files={files}
                onUpdateFile={handleUpdateFile}
                onUpdateOptions={setOptions}
                tocEntries={options.tocEntries || []}
              />

              <MergeOptionsPanel options={options} onChange={setOptions} />

              <MergeButton
                files={files}
                options={options}
                onMerge={handleMerge}
              />

              <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                <h3 className="font-medium text-blue-800 mb-2">Tips</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>1. Drag & drop PDF files to upload</li>
                  <li>2. Enter your API key to enable AI features</li>
                  <li>3. Drag files to reorder</li>
                  <li>4. Click merge to download</li>
                </ul>
              </div>
            </div>
          </div>
        ) : activeTab === 'math-ocr' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <ApiKeyPanel />
            </div>

            <div className="lg:col-span-2">
              <MathTypePanel />
            </div>
          </div>
        ) : activeTab === 'reference' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <ApiKeyPanel />
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border p-6">
                <ReferencePanel />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <ApiKeyPanel />
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border p-6">
                <TextExtractPanel />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
