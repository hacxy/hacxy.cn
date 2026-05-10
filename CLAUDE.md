# Project Rules

## ESLint

- 禁止使用 `eslint-disable`、`eslint-disable-next-line`、`eslint-disable-line` 等注释来抑制 ESLint 规则。遇到 lint 报错时必须从代码层面修复问题，或在 `eslint.config.js` 中调整规则配置。
