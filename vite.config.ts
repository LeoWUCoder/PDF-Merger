import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 3000,
    open: true
  },
  assetsInclude: ['**/*.woff2', '**/*.ttf', '**/*.otf'],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'pdf-lib': ['pdf-lib', '@pdf-lib/standard-fonts', '@pdf-lib/upng'],
          'tesseract': ['tesseract.js'],
          'pdfjs': ['pdfjs-dist'],
          'vendor-react': ['react', 'react-dom', 'react-dropzone', 'react-pdf']
        }
      }
    }
  }
})
