# 任务

你当前位于分支 {{BRANCH}} ，而该分支已经由 main 创建。

## Issue #{{ISSUE_NUMBER}}: {{ISSUE_TITLE}}

{{ISSUE_BODY}}

## 评论

{{ISSUE_COMMENTS}}

## 最近 Ralph 提交（进度锚点）

{{RECENT_COMMITS}}

## 工作流程

1. **探索** —— 仔细阅读 issue。如果引用了父 PRD 或相关文档，先读完。
   - 阅读相关源码和测试后再编辑
2. **计划** —— 决定改什么、为什么。让改动尽可能小。
3. **执行** —— 使用 RGR（Red → Green → Repeat → Refactor）循环：先写失败测试，再写实现让它通过。
   - 除非已有合适的测试接缝，否则不要为了可测试性随意抽取新函数/新接口——那会制造意大利面条测试（spaghetti tests）
4. **验证** —— 提交前运行项目的验证命令（如 `npm run typecheck`、`npm run test`）。修复所有失败再继续。
5. **提交** —— 做一个 git commit。提交信息必须：
   - 使用 Conventional Commits 格式
   - 以 `Ralph: issue-{{ISSUE_NUMBER}}` 结尾（进度锚点）
   - 说明完成了什么、关键决策、改动的文件
     （git 身份已由宿主自动注入，无需手动配置）

# 提交

使用常规的提交信息，在 {{BRANCH}} 上进行一次或多次提交操作。

不要推动这个分支的发展。不要关闭该问题。不要编辑标签。不要创建或编辑 Pull Request。

完成之后，请输出 <promise>COMPLETE</promise> 。

在最后输出结构化结果（**必须**是合法 JSON，不能有 markdown 代码块包裹）：

```
<outcome>
{"status": "done", "summary": "用一两句话总结你做了什么"}
</outcome>
```

`status` 取值：

- `done` —— 已完成实现并提交（有 commit）
- `blocked` —— 被外部因素阻塞，无法继续（如缺关键上下文、依赖不可用）
- `skipped` —— 该任务不可无人值守（需要人工介入、HITL、父 PRD 未满足）

`summary` 外部阻塞原因或跳过任务的原因。
