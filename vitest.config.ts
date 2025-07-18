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
    globals: true,
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    globalSetup: ['./globalSetup.ts'],
    testTimeout: process.env.VSCODE_INSPECTOR_OPTIONS ? 1000 * 60 * 60 : 5000, // 2 minutes in VSCode, 1 minute otherwise
    environment: 'node',
    deps: {
      // This helps with dynamic requires
      interopDefault: true
    }
  },
})