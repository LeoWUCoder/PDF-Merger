import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true
      }
    }
  },
  assetsInclude: ['**/*.woff2', '**/*.ttf', '**/*.otf'],
  define: {
    // 解决 pdfjs-dist 浏览器兼容问题
    'global': 'window'
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'pdf-lib': ['pdf-lib', '@pdf-lib/standard-fonts', '@pdf-lib/upng'],
          'tesseract': ['tesseract.js'],
          'vendor-react': ['react', 'react-dom', 'react-dropzone', 'react-pdf']
        }
      }
    }
  }
})
