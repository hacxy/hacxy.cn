import { hacxy } from '@hacxy/eslint-config'

export default [
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
