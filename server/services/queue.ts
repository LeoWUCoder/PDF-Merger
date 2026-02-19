import { EventEmitter } from 'events'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface QueueItem {
  id: string
  task: () => Promise<string>
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  progress: number
  outputPath?: string
  error?: string
  createdAt: Date
  completedAt?: Date
}

interface TaskStatus {
  id: string
  status: QueueItem['status']
  progress: number
  outputPath?: string
  error?: string
}

class ConversionQueue extends EventEmitter {
  private queue: Map<string, QueueItem> = new Map()
  private processingCount = 0
  private maxConcurrent = 2
  private progressCallbacks: Map<string, (progress: number) => void> = new Map()

  async add(task: () => Promise<string>, priority = 0): Promise<string> {
    const id = this.generateId()

    const queueItem: QueueItem = {
      id,
      task: async () => {
        const progressCallback = this.progressCallbacks.get(id)
        return await task(progressCallback)
      },
      status: 'pending',
      progress: 0,
      createdAt: new Date()
    }

    this.queue.set(id, queueItem)
    this.processNext()

    return id
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
  }

  private async processNext() {
    if (this.processingCount >= this.maxConcurrent) return

    let nextItem: QueueItem | undefined

    for (const item of this.queue.values()) {
      if (item.status === 'pending') {
        nextItem = item
        break
      }
    }

    if (!nextItem) return

    this.processingCount++
    nextItem.status = 'processing'

    try {
      const outputPath = await nextItem.task(nextItem.id)
      nextItem.status = 'completed'
      nextItem.outputPath = outputPath
      nextItem.progress = 100
      nextItem.completedAt = new Date()
      this.emit('completed', nextItem.id, outputPath)
    } catch (error) {
      nextItem.status = 'failed'
      nextItem.error = error instanceof Error ? error.message : String(error)
      this.emit('failed', nextItem.id, error)
    } finally {
      this.processingCount--
      this.processNext()
    }
  }

  updateProgress(taskId: string, progress: number) {
    const item = this.queue.get(taskId)
    if (item && item.status === 'processing') {
      item.progress = progress
      this.emit('progress', taskId, progress)
    }
  }

  getStatus(taskId: string): TaskStatus | undefined {
    const item = this.queue.get(taskId)
    if (!item) return undefined

    return {
      id: item.id,
      status: item.status,
      progress: item.progress,
      outputPath: item.outputPath,
      error: item.error
    }
  }

  getAllTasks(): TaskStatus[] {
    return Array.from(this.queue.values()).map(item => ({
      id: item.id,
      status: item.status,
      progress: item.progress,
      outputPath: item.outputPath,
      error: item.error
    }))
  }

  cancel(taskId: string): boolean {
    const item = this.queue.get(taskId)
    if (item && (item.status === 'pending' || item.status === 'processing')) {
      item.status = 'cancelled'
      item.error = '用户取消'
      this.emit('cancelled', taskId)
      return true
    }
    return false
  }

  clearCompleted() {
    for (const [id, item] of this.queue.entries()) {
      if (item.status === 'completed' || item.status === 'failed' || item.status === 'cancelled') {
        // 清理临时文件
        if (item.outputPath && fs.existsSync(item.outputPath)) {
          // 保留文件，只删除队列条目
        }
        this.queue.delete(id)
      }
    }
  }
}

export const conversionQueue = new ConversionQueue()
