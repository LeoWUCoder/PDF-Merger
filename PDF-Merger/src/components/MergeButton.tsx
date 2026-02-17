import { useState } from 'react'
import { FileDown, Loader2, Check, AlertCircle } from 'lucide-react'
import { cn } from '../lib/utils'
import type { PdfFile, MergeOptions } from '../types'

interface MergeButtonProps {
  files: PdfFile[]
  options: MergeOptions
  onMerge: () => Promise<Blob>
  disabled?: boolean
}

export function MergeButton({ files, onMerge, disabled }: MergeButtonProps) {
  const [isMerging, setIsMerging] = useState(false)
  const [result, setResult] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleClick = async () => {
    if (files.length === 0) return

    setIsMerging(true)
    setResult('idle')
    setErrorMsg('')

    try {
      const blob = await onMerge()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `merged_${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setResult('success')
      setTimeout(() => setResult('idle'), 3000)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('Merge failed:', error)
      setErrorMsg(msg)
      setResult('error')
      setTimeout(() => setResult('idle'), 5000)
    } finally {
      setIsMerging(false)
    }
  }

  const isDisabled = disabled || files.length === 0 || isMerging

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isDisabled}
        className={cn(
          'px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2',
          result === 'success' && 'bg-green-500 text-white',
          result === 'error' && 'bg-red-500 text-white',
          result === 'idle' && !isDisabled && 'bg-blue-600 text-white hover:bg-blue-700',
          isDisabled && 'bg-gray-300 text-gray-500 cursor-not-allowed'
        )}
      >
        {isMerging ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Merging...
          </>
        ) : result === 'success' ? (
          <>
            <Check className="w-5 h-5" />
            Download Complete!
          </>
        ) : result === 'error' ? (
          <>
            <AlertCircle className="w-5 h-5" />
            Merge Failed
          </>
        ) : (
          <>
            <FileDown className="w-5 h-5" />
            Merge & Download ({files.length} files)
          </>
        )}
      </button>
      {result === 'error' && errorMsg && (
        <p className="text-red-500 text-sm mt-2">Error: {errorMsg}</p>
      )}
    </>
  )
}

interface MergeOptionsPanelProps {
  options: MergeOptions
  onChange: (options: MergeOptions) => void
}

export function MergeOptionsPanel({ options, onChange }: MergeOptionsPanelProps) {
  return (
    <div className="bg-white rounded-lg border p-4 space-y-4">
      <h3 className="font-medium text-gray-800">Merge Options</h3>

      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            id="autoRotate"
            checked={options.autoRotate}
            onChange={(e) => onChange({ ...options, autoRotate: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <span className="text-sm text-gray-700">Auto-rotate pages</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            id="generateTOC"
            checked={options.generateTOC}
            onChange={(e) => onChange({ ...options, generateTOC: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <span className="text-sm text-gray-700">生成中文目录页</span>
        </label>
      </div>
    </div>
  )
}
