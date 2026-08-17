import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

import { postAssetsPlugin } from './vite-assets-plugin.ts'
import { feedPlugin } from './vite-feed-plugin.ts'
import { postsPlugin } from './vite-posts-plugin.ts'
import { siteMetaPlugin } from './vite-site-meta-plugin.ts'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    postsPlugin(),
    feedPlugin(),
    postAssetsPlugin(),
    siteMetaPlugin(),
  ],
  server: {
    watch: {
      // 排除 pi-afk 运行时产物（.pi/afk/worktrees 等），避免 .html 文件触发整页 reload
      ignored: ['**/.pi/**', '**/.sandcastle/**'],
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.{ts,tsx}', '.sandcastle/*.test.ts'],
    exclude: ['**/node_modules/**', '.sandcastle/worktrees/**'],
    setupFiles: ['tests/unit/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx'],
      reporter: ['text', 'html'],
    },
  },
})
