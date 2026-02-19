import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import { conversionQueue } from './services/queue.ts'
import { convertFile } from './services/converter.ts'

// 使用 createRequire 加载 pdf-parse
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const pdfParseLib = require('pdf-parse')
const PDFParse = pdfParseLib.PDFParse

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// 中间件
app.use(cors())
app.use(express.json())
app.use('/public', express.static(path.join(__dirname, 'public')))
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))
app.use('/outputs', express.static(path.join(__dirname, '../outputs')))

// 确保上传和输出目录存在
const uploadsDir = path.join(__dirname, '../uploads')
const outputsDir = path.join(__dirname, '../outputs')
fs.mkdirSync(uploadsDir, { recursive: true })
fs.mkdirSync(outputsDir, { recursive: true })

// Multer 配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + '-' + file.originalname)
  }
})

const upload = multer({ storage })

// 监听队列事件
conversionQueue.on('progress', (taskId, progress) => {
  console.log(`Task ${taskId}: ${progress}%`)
})

conversionQueue.on('completed', (taskId) => {
  console.log(`Task ${taskId} completed`)
})

conversionQueue.on('failed', (taskId, error) => {
  console.error(`Task ${taskId} failed:`, error)
})

// API 端点

// 获取支持的格式列表
app.get('/api/formats', (req, res) => {
  const formats = {
    source: ['pdf', 'png', 'jpg', 'jpeg', 'md', 'txt'],
    target: {
      pdf: ['docx'],
      png: ['pdf', 'jpg', 'jpeg', 'webp'],
      jpg: ['pdf', 'png', 'webp'],
      jpeg: ['pdf', 'png', 'webp'],
      md: ['pdf', 'txt'],
      txt: ['pdf', 'md']
    }
  }
  res.json(formats)
})

// 提交转换任务
app.post('/api/convert', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' })
    }

    const { sourceFormat, targetFormat, options } = req.body
    const fileName = req.file.originalname
    const inputPath = req.file.path

    if (!sourceFormat || !targetFormat) {
      return res.status(400).json({ error: '缺少 sourceFormat 或 targetFormat' })
    }

    // 生成任务 ID
    const taskId = await conversionQueue.add(async () => {
      const outputPath = await convertFile({
        inputPath,
        fileName,
        sourceFormat,
        targetFormat,
        options: options ? JSON.parse(options) : {}
      })
      return outputPath
    })

    res.json({
      taskId,
      status: 'pending',
      message: '转换任务已提交'
    })
  } catch (error) {
    console.error('提交转换任务失败:', error)
    res.status(500).json({ error: error.message })
  }
})

// 查询任务状态
app.get('/api/convert/status/:taskId', (req, res) => {
  const status = conversionQueue.getStatus(req.params.taskId)
  if (!status) {
    return res.status(404).json({ error: '任务不存在' })
  }
  res.json(status)
})

// 下载转换结果
app.get('/api/convert/download/:taskId', (req, res) => {
  const status = conversionQueue.getStatus(req.params.taskId)
  if (!status || status.status !== 'completed') {
    return res.status(404).json({ error: '文件不存在或转换未完成' })
  }

  const outputPath = status.outputPath
  if (!outputPath || !fs.existsSync(outputPath)) {
    return res.status(404).json({ error: '文件不存在' })
  }

  const fileName = path.basename(outputPath)
  res.download(outputPath, fileName)
})

// 取消任务
app.delete('/api/convert/:taskId', (req, res) => {
  const cancelled = conversionQueue.cancel(req.params.taskId)
  if (cancelled) {
    res.json({ message: '任务已取消' })
  } else {
    res.status(404).json({ error: '任务不存在或已完成' })
  }
})

// 获取所有任务状态
app.get('/api/convert/tasks', (req, res) => {
  const tasks = conversionQueue.getAllTasks()
  res.json(tasks)
})

// 提取 PDF 文本（供前端 AI 转换使用）
app.post('/api/extract-pdf-text', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' })
    }

    const inputPath = req.file.path

    // 使用 pdf-parse 提取文本
    const data = fs.readFileSync(inputPath)
    const pdfData = await new PDFParse(data)
    console.log('PDF 文本长度:', pdfData.text?.length || 0)

    // 处理 text 为 undefined 的情况
    const textContent = pdfData.text || ''

    // 删除临时文件
    fs.unlinkSync(inputPath)

    // 检查是否有可提取的文本
    if (!textContent.trim()) {
      console.log('警告：PDF 没有可提取的文本层，可能是扫描版图片 PDF')
      return res.json({ text: '', warning: '此 PDF 为扫描版，没有可提取的文本' })
    }

    res.json({ text: textContent.slice(0, 10000) }) // 限制文本长度
  } catch (error) {
    console.error('提取 PDF 文本失败:', error)
    res.status(500).json({ error: '提取 PDF 文本失败: ' + error.message })
  }
})

// PDF 转图片（供视觉模型 OCR 使用）
app.post('/api/pdf-to-images', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' })
    }

    const inputPath = req.file.path
    console.log('正在处理 PDF:', inputPath)

    // 读取 PDF 文件
    const pdfData = fs.readFileSync(inputPath)
    const pdfBase64 = pdfData.toString('base64')

    // 清理上传的临时文件
    fs.unlinkSync(inputPath)

    // 返回 PDF 的 base64 编码，视觉模型可直接处理
    res.json({
      images: [`data:application/pdf;base64,${pdfBase64}`],
      pageCount: 1
    })
  } catch (error) {
    console.error('PDF 处理失败:', error)
    res.status(500).json({ error: 'PDF 处理失败: ' + error.message })
  }
})

// ============================================
// 参考文献格式化 API
// ============================================

// DOI 格式检测
function isDOI(input: string): boolean {
  return /^10\.\d{4,}\/[-._;()/:A-Z0-9]+$/i.test(input.trim()) ||
    /^https?:\/\/doi\.org\/10\.\d{4,}\/.*$/i.test(input.trim())
}

// 参考文献格式化
app.post('/api/format-reference', async (req, res) => {
  try {
    const { source, style, isDOI: isDoiInput } = req.body

    if (!source || !source.trim()) {
      return res.status(400).json({ error: '请提供参考文献内容或 DOI 链接' })
    }

    // 获取前端传来的 API Key (Express 会将 header 转为小写)
    const apiKey = req.headers['x-api-key'] || req.headers['X-Api-Key'] as string
    if (!apiKey) {
      return res.status(401).json({ error: '缺少 API Key' })
    }

    // 构建 prompt
    let formatInstructions = ''
    switch (style) {
      case 'apa':
        formatInstructions = `APA 格式 (第七版):
- 作者. (年份). 标题. 期刊名称, 卷(期), 页码. DOI
- 作者姓, 名首字母. (年份). 标题. 期刊名称, 卷(期), 页码.`
        break
      case 'mla':
        formatInstructions = `MLA 格式 (第九版):
- 作者. "文章标题." 期刊名称, 卷.号 (年份): 页码.
- 作者姓, 名. "标题." 期刊名称, 卷, no. 号, 年份, 页码.`
        break
      case 'harvard':
        formatInstructions = `Harvard 格式:
- 作者 (年份) '文章标题', 期刊名称, 卷(期), pp. 页码.
- 作者, Initial(s). (年份) '文章标题', 期刊名称, 卷(期), pp. 页码.`
        break
      case 'gbt7714':
        formatInstructions = `GB/T 7714-2015 中国国家标准:
- [序号] 作者. 题名[J]. 刊名, 年, 卷(期): 起止页码.
- [序号] 作者. 题名[D]. 出版地: 出版单位, 出版年.`
        break
      case 'chicago':
        formatInstructions = `Chicago 格式:
- 作者. "文章标题." 期刊名称 卷, no. 期 (年份): 页码.
- Author. "Article Title." Journal Name vol, no. issue (Year): pages.`
        break
      case 'nature':
        formatInstructions = `Nature 期刊格式:
- 作者, 标题. 期刊名称 **年份**, 页码.
- Author, A. Title. Journal Name **Year**, pages.`
        break
      case 'ieee':
        formatInstructions = `IEEE 格式:
- [#] A. Author, "Title," Journal Name, vol, no, pp, year.
- [#] Author, "Title," Journal Name, vol. X, no. Y, pp. Z-W, year.`
        break
      default:
        formatInstructions = '按标准学术格式输出'
    }

    let systemPrompt = ''
    if (isDoiInput || isDOI(source)) {
      systemPrompt = `你是一个文献处理助手。用户提供了 DOI 链接或标识符，请：
1. 从 DOI 中提取文献信息（作者、标题、期刊、年份、卷期、页码等）
2. 按用户指定的格式重新格式化参考文献
3. 只输出格式化后的参考文献，不要其他说明`
    } else {
      systemPrompt = `你是一个文献处理助手。用户提供了参考文献内容，请：
1. 识别文献信息（作者、标题、期刊、年份、卷期、页码等）
2. 按用户指定的格式重新格式化参考文献
3. 如果信息不完整，尝试推断或标注 [信息缺失]
4. 只输出格式化后的参考文献，不要其他说明`
    }

    const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'Qwen/Qwen2.5-7B-Instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `请按以下格式格式化参考文献：

${formatInstructions}

输入内容：
${source}

只输出格式化后的参考文献，不要任何其他说明。`
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('参考文献格式化失败:', errorText)
      return res.status(500).json({ error: 'AI 处理失败: ' + errorText })
    }

    const data = await response.json()
    if (!data || !data.choices) {
      return res.status(500).json({ error: 'AI 返回数据格式错误' })
    }

    const result = data.choices?.[0]?.message?.content || ''

    res.json({ formatted: result.trim() })
  } catch (error: any) {
    console.error('参考文献格式化失败:', error)
    res.status(500).json({ error: '处理失败: ' + (error.message || '未知错误') })
  }
})

// 启动服务器
app.listen(PORT, () => {
  console.log(`转换服务已启动: http://localhost:${PORT}`)
})

export default app
