# 冲突解决（resolve run）

你当前位于分支 {{BRANCH}} 。该分支在与 `origin/main` 合并时产生了冲突，**合并正在进行中**（`git status` 会显示 unmerged paths）。你的任务是解决这些冲突并完成合并提交。

## Issue #{{ISSUE_NUMBER}}: {{ISSUE_TITLE}}

{{ISSUE_BODY}}

## 评论

{{ISSUE_COMMENTS}}

## 冲突信息

- 被合并的 `origin/main` 提交：`{{MERGED_SHA}}`
- 冲突文件（{{CONFLICT_COUNT}}）：

{{CONFLICT_FILES}}

## 边界约束（必须严格遵守）

1. **一次机会** —— 这是唯一一次解决机会。解决不了就如实输出 `blocked`/`skipped`，不要反复折腾。
2. **同一验收门槛** —— 解决后必须运行项目的全量回归（如 `pnpm typecheck`、`pnpm test:run`、`pnpm lint`），全部通过并在沙箱内自证后才提交。
3. **只解决冲突与必要连带修改** —— 只处理冲突文件；仅当解决冲突需要时才做最小连带修改（如接口签名变化引发的调用方适配）。
4. **禁止新功能/无关重构** —— 不得借机实现新功能、做无关重构或格式调整。
5. **必须产生提交** —— 解决冲突后必须 `git add` + `git commit` 完成合并（merge commit）。报告 `done` 但没有产生任何提交，按失败处理。

## 工作流程

1. **查看冲突** —— 运行 `git status` 查看未合并文件；逐个打开冲突标记（`<<<<<<<` / `=======` / `>>>>>>>`）。
2. **解决** —— 保留双方合理内容：分支的改动与 main 的改动都要考虑，不要只留一边。
3. **验证** —— 提交前运行项目的全量回归命令（如 `pnpm typecheck && pnpm test:run && pnpm lint`），修复所有失败再继续。
4. **提交** —— `git add` 已解决的文件后 `git commit` 完成合并。提交信息必须：
   - 使用 Conventional Commits 格式
   - 以 `Ralph: issue-{{ISSUE_NUMBER}}` 结尾（进度锚点）
   - 说明解决了哪些冲突文件
     （git 身份已由宿主自动注入，无需手动配置）

不要推动这个分支。不要关闭该问题。不要编辑标签。不要创建或编辑 Pull Request。

完成之后，请输出 <promise>COMPLETE</promise> 。

在最后输出结构化结果（**必须**是合法 JSON，不能有 markdown 代码块包裹）：

```
<outcome>
{"status": "done", "summary": "用一两句话总结你解决了哪些冲突"}
</outcome>
```

`status` 取值：

- `done` —— 冲突已解决并提交（有 commit）
- `blocked` —— 被外部因素阻塞，无法解决（如缺关键上下文、依赖不可用）
- `skipped` —— 该任务不可无人值守（需要人工介入、HITL、父 PRD 未满足）

`summary` 说明未解决冲突的原因。
