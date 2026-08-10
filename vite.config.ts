import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

import { postAssetsPlugin } from './vite-assets-plugin.ts'
import { postsPlugin } from './vite-posts-plugin.ts'

export default defineConfig({
  plugins: [react(), tailwindcss(), postsPlugin(), postAssetsPlugin()],
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/unit/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx'],
      reporter: ['text', 'html'],
    },
  },
})
