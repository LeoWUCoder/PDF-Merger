export async function recognizeText(imageData: ImageData): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('OCR is not supported on server')
  }
  // 动态导入 tesseract.js
  const Tesseract = (await import('tesseract.js')).default
  const result = await Tesseract.recognize(imageData, 'eng+chi_sim', {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        console.log(`OCR进度: ${Math.round(m.progress * 100)}%`)
      }
    }
  })
  return result.data.text
}

export async function extractTextFromImage(imageFile: File): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('OCR is not supported on server')
  }
  const imageData = await fileToImageData(imageFile)
  return recognizeText(imageData)
}

// 将文件转换为ImageData
async function fileToImageData(file: File): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0)
        resolve(ctx.getImageData(0, 0, canvas.width, canvas.height))
      } else {
        reject(new Error('无法获取canvas上下文'))
      }
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}
