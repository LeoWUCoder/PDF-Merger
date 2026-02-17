import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FolderOpen, FileText } from 'lucide-react'
import { cn } from '../lib/utils'
import type { PdfFile } from '../types'

interface FileUploaderProps {
  onFilesAdded: (files: PdfFile[]) => void
  className?: string
}

export function FileUploader({ onFilesAdded, className }: FileUploaderProps) {
  const [isDragActive, setIsDragActive] = useState(false)

  const processFiles = useCallback(async (fileList: FileList | File[]) => {
    const pdfFiles: PdfFile[] = []

    for (const file of fileList) {
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        try {
          const { getPdfInfo } = await import('../lib/pdf-utils')

          const info = await getPdfInfo(file)
          const pdfFile: PdfFile = {
            id: crypto.randomUUID(),
            file,
            name: file.name,
            size: file.size,
            pageCount: info.pageCount,
            order: pdfFiles.length
          }
          pdfFiles.push(pdfFile)
        } catch (error) {
          console.error(`读取PDF文件失败: ${file.name}`, error)
        }
      }
    }

    if (pdfFiles.length > 0) {
      onFilesAdded(pdfFiles)
    }
  }, [onFilesAdded])

  const { getRootProps, getInputProps, isDragReject } = useDropzone({
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    onDrop: (acceptedFiles) => {
      setIsDragActive(false)
      processFiles(acceptedFiles)
    },
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: true,
    noClick: false
  })

  return (
    <div
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200',
        isDragActive && 'border-blue-500 bg-blue-50',
        !isDragActive && 'border-gray-300 hover:border-gray-400',
        isDragReject && 'border-red-500 bg-red-50',
        className
      )}
      {...getRootProps()}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center gap-4">
        <div className={cn(
          'p-4 rounded-full transition-colors',
          isDragActive ? 'bg-blue-100' : 'bg-gray-100'
        )}>
          {isDragActive ? (
            <FolderOpen className="w-8 h-8 text-blue-600" />
          ) : (
            <Upload className="w-8 h-8 text-gray-600" />
          )}
        </div>

        <div>
          <p className="text-lg font-medium text-gray-700">
            {isDragActive ? '释放文件到此处' : '拖拽PDF文件到此处'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            支持批量上传PDF文件
          </p>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span className="flex items-center gap-1">
            <FileText className="w-4 h-4" />
            PDF 格式
          </span>
        </div>
      </div>
    </div>
  )
}
