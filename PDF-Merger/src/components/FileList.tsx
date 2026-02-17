import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { FileText, GripVertical, Trash2, FileType } from 'lucide-react'
import { cn } from '../lib/utils'
import type { PdfFile } from '../types'

interface FileListProps {
  files: PdfFile[]
  onRemove: (id: string) => void
  onReorder: (files: PdfFile[]) => void
  onSelect: (file: PdfFile) => void
  selectedId?: string
}

function SortableFileItem({
  file,
  onRemove,
  onSelect,
  isSelected
}: {
  file: PdfFile
  onRemove: () => void
  onSelect: () => void
  isSelected: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: file.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer',
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300',
        isDragging && 'shadow-lg'
      )}
      onClick={onSelect}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
      >
        <GripVertical className="w-4 h-4 text-gray-400" />
      </div>

      <div className="p-2 bg-red-50 rounded-lg">
        <FileType className="w-5 h-5 text-red-500" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-800 truncate">{file.name}</p>
        <p className="text-sm text-gray-500">
          {file.pageCount} 页 · {formatSize(file.size)}
        </p>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

export function FileList({ files, onRemove, onReorder, onSelect, selectedId }: FileListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = files.findIndex((f) => f.id === active.id)
      const newIndex = files.findIndex((f) => f.id === over.id)

      const newFiles = arrayMove(files, oldIndex, newIndex)
      // 更新order字段
      newFiles.forEach((file, index) => {
        file.order = index
      })

      onReorder(newFiles)
    }
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>暂无文件</p>
        <p className="text-sm">请添加要合并的PDF文件</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={files.map((f) => f.id)} strategy={rectSortingStrategy}>
          {files.map((file) => (
            <SortableFileItem
              key={file.id}
              file={file}
              onRemove={() => onRemove(file.id)}
              onSelect={() => onSelect(file)}
              isSelected={file.id === selectedId}
            />
          ))}
        </SortableContext>
      </DndContext>

      <div className="flex justify-between items-center pt-4 border-t">
        <span className="text-sm text-gray-500">
          共 {files.length} 个文件 · {files.reduce((acc, f) => acc + f.pageCount, 0)} 页
        </span>
      </div>
    </div>
  )
}
