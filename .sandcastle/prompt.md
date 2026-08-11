# 任务

你当前位于分支 {{BRANCH}}，该分支已经由 main 创建。

## Issue #{{ISSUE_NUMBER}}: {{ISSUE_TITLE}}

{{ISSUE_BODY}}

## 评论

{{ISSUE_COMMENTS}}

## 最近提交（进度锚点）

{{RECENT_COMMITS}}

## 项目背景

这是一个 React 19 + Vite + TypeScript + Tailwind CSS 的个人网站（hacxy.cn）。

## 工作流程

1. **探索** —— 仔细阅读 issue。如果引用了父 PRD 或相关文档，先读完。
   - 阅读相关源码和测试后再编辑
2. **计划** —— 决定改什么、为什么。让改动尽可能小。
3. **执行** —— 使用 RGR（Red → Green → Repeat → Refactor）循环：先写失败测试，再写实现让它通过。
   - 除非已有合适的测试接缝，否则不要为了可测试性随意抽取新函数/新接口——那会制造意大利面条测试（spaghetti tests）
4. **验证** —— 提交前运行项目的验证命令，修复所有失败再继续：
   - `pnpm run typecheck`（类型检查）
   - `pnpm run test`（单元测试）
   - `pnpm run lint`（代码规范）
   - 如果依赖缺失，先运行 `pnpm install --frozen-lockfile`
5. **提交** —— 做一个 git commit。提交信息必须：
   - 使用 Conventional Commits 格式（feat:/fix:/refactor:/chore: 等）
   - 以 `Ralph: issue-{{ISSUE_NUMBER}}` 结尾（进度锚点）
   - 说明完成了什么、关键决策、改动的文件
   - git 身份已自动注入，无需手动配置

## 约束

- 只实现本 issue 描述的工作，不要顺手改无关代码
- 不要修改 package.json 的依赖版本（除非本 issue 明确要求）
- 如果遇到阻塞（需求不明、依赖缺失、方案冲突），在提交信息中说明，不要强行实现

## 完成

当所有工作完成、测试通过、提交已创建后，输出：

<promise>COMPLETE</promise>
