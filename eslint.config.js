import { hacxy } from '@hacxy/eslint-config'

export default [
  ...hacxy({ react: true, node: true }),
  {
    rules: {
      // 项目组件目录使用 PascalCase 惯例（AISummary/CodeStreamBg 等）
      'unicorn/filename-case': 'off',
      // 项目大量使用非空断言（getElementById/Map.get 等），保持旧配置行为
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
]
