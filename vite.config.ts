import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

import { postAssetsPlugin } from './vite-assets-plugin.ts'
import { postsPlugin } from './vite-posts-plugin.ts'
import { siteMetaPlugin } from './vite-site-meta-plugin.ts'

export default defineConfig({
  plugins: [react(), tailwindcss(), postsPlugin(), postAssetsPlugin(), siteMetaPlugin()],
  server: {
    watch: {
      // pi-afk 运行时产物(.pi/afk/worktrees 等)不在模块图内,但 worktree 里的
      // index.html 等 .html 文件会触发整页 reload;直接排除,避免无谓热更新
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
