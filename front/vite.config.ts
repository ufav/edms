import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      stream: path.resolve(__dirname, 'src/utils/stream-polyfill.js'),
      'stream-browserify': path.resolve(__dirname, 'src/utils/stream-polyfill.js'),
      fs: path.resolve(__dirname, 'src/utils/fs-polyfill.js'),
    },
  },
  optimizeDeps: {
    exclude: ['stream', 'stream-browserify', 'fs'],
  },
  define: {
    global: 'globalThis',
  },
})
