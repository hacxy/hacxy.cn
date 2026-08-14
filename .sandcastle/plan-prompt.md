# 问题（ISSUES）

以下是仓库中未解决的问题：

<issues-json>

!`gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`

</issues-json>

# 任务（TASK）

分析未解决的问题并构建依赖关系图。针对每个问题，判断它是否**阻塞（blocks）**或**被阻塞（is blocked by）**其他未解决的问题。

如果满足以下任一条件，则问题 B **被**问题 A **阻塞**：

- B 需要 A 引入的代码或基础设施
- B 与 A 修改重叠的文件或模块，导致并行开发可能产生合并冲突
- B 的需求依赖于 A 将确定的决策或 API 形态

如果一个问题对其他未解决问题没有任何阻塞依赖，则它是**无阻塞的（unblocked）**。

为每个无阻塞的问题分配一个分支名，格式为 `sandcastle/issue-{number}-{slug}`。

如果某个问题看起来是 PRD（产品需求文档），且存在链接到它的实现类问题，则该 PRD 不可作为工作项处理。

# 输出（OUTPUT）

将你的计划以 JSON 对象形式输出，包裹在 `<plan>` 标签中：

<plan>
{"issues": [{"number": 42, "title": "修复认证漏洞", "branch": "sandcastle/issue-42-fix-auth-bug"}]}
</plan>

只包含无阻塞的问题。如果所有问题都被阻塞，则包含唯一一个优先级最高的候选问题（即依赖最少或最弱的那一个）。
