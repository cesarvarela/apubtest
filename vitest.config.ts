import { defineConfig } from 'vitest/config'
import 'dotenv'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  test: {
    watch: false,
  },
})