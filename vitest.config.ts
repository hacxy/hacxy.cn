import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vitest/config'

// 测试时用 fixtures 替换虚拟模块，隔离真实 content/ 与网络依赖
const fixture = (name: string) =>
  path.resolve(fileURLToPath(new URL('.', import.meta.url)), 'test', 'fixtures', name)

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'virtual:blog-config': fixture('blog-config.ts'),
      'virtual:blog-posts': fixture('blog-posts.ts'),
      'virtual:blog-pages': fixture('blog-pages.ts'),
      'virtual:github-projects': fixture('github-projects.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'test/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/virtual.d.ts',
        'src/**/*.module.scss.d.ts',
        'src/plugins/**',
        'src/**/index.module.scss',
      ],
    },
  },
})
