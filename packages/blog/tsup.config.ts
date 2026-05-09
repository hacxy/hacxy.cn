import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'plugin/index': 'src/plugin/index.ts',
    'cli/index': 'src/cli/index.ts',
  },
  format: ['esm'],
  // DTS only for the public API (index), not for CLI/plugin internals
  dts: {
    entry: { index: 'src/index.ts', 'plugin/index': 'src/plugin/index.ts' },
  },
  clean: true,
  // Disable splitting so import.meta.url in plugin/index.js correctly points
  // to dist/plugin/index.js (not a shared chunk), preserving relative paths
  splitting: false,
  // Virtual modules and SCSS are resolved at runtime by Vite
  external: [/^virtual:/, /\.scss$/],
})
