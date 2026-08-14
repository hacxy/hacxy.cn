# 任务

把以下分支合并进当前分支（当前分支由 main 创建，最终会合回 main）：

{{BRANCHES}}

对每个分支：

1. **拉取并合并**：`git fetch origin <branch>`，然后 `git merge FETCH_HEAD --no-edit`
2. **若合并冲突**：读两边的意图再选择解法——用 `git log -p --follow -- <path>` 看双方各自如何走到这一步，读提交信息（引用 issue 的用 `gh issue view <n>`）。选**保留双方意图**的解法；意图不兼容时，选最符合 PR/issue 目标的一边，并在提交信息中说明权衡。
   - **不要发明新行为**——你的职责是调和，不是做新功能。如果合理解法需要写两边都没有的新逻辑，那是该标记不确定性的信号，而不是发挥创造力
3. **合并后验证**：`pnpm run typecheck` 和 `pnpm run test`；失败就修
4. **下一个分支前**：确保当前工作树干净

# 全部合并完成后

运行完整验证，全部必须通过：

- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run lint`
- `pnpm run test:e2e`（Playwright，慢但必须）

如有失败，修复后再继续。

# 冲突处理上限

单个分支合并后验证**反复失败**（比如解错方向）：保留该分支，在其 issue 上留言说明情况，跳过它继续其他分支。不要卡住整轮。

# 关闭 issue

本迭代完成的 issue 清单（合并成功一个就关一个）：

{{ISSUES}}

对每个**成功合并**的分支，关闭其 issue：

`gh issue close <number> --reason completed`

如果关闭某个 issue 后其父 issue（如 PRD）也随之完成，一并关闭父 issue。

# 清理分支

对每个成功合并的分支：

- `git push origin --delete <branch>`
- `git branch -d <branch>`

# 提交

合并与修复产生的提交使用 Conventional Commits 格式（如 `merge: ...`、`fix: ...`）。

# 完成

当所有分支处理完毕、验证通过、issue 已关闭后，输出：

<promise>COMPLETE</promise>
