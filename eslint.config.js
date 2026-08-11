import { hacxy } from '@hacxy/eslint-config'

export default [
  // 忽略运行时产物目录（沙箱 worktree、日志）
  {
    ignores: ['.sandcastle/worktrees/**', '.sandcastle/logs/**'],
  },
  ...hacxy({
    react: true,
  }),
  {
    files: ['.sandcastle/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
]
