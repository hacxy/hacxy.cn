# Skill 机制

这是 [`writing-for-agents`](SKILL.md) 的 skill 特有分支：当文档是一个 skill 时，什么会变——frontmatter、调用方式的选择，以及路由 skill。关于写作的其他一切，都在 `SKILL.md` 的通用参考中。

## 调用方式

两种选择，在两种负荷之间取舍：

- **模型调用型** skill 保留 `description`，这样 agent 可以自主触发它——其他 skill 也能到达它。你仍然可以输入它的名字：模型调用总是_包含_用户的触达；`description` 只会增加 agent 的发现，绝不会移除人类的触达。`description` 是 skill 的顶层上下文指针，被迫时刻保持加载——用永久的上下文负荷换取可发现性。内容全是参考的模型调用型 skill，也是共享参考的一个家：另一个 skill 可以调用它，所以多个 skill 需要的参考就放在一处。机制：省略 `disable-model-invocation`，写一个面向模型的、携带触发分支的 `description`（`SKILL.md` 中的指针写作规则完全适用）。
- **用户调用型** skill 把 `description` 从 agent 的触达范围内剥离：只有输入它名字的人类可以调用它，其他 skill 都不能。零上下文负荷，但它花费认知负荷——你是必须记住它存在的索引。机制：设置 `disable-model-invocation: true`；`description` 变成面向人类的——一行摘要，去掉触发词列表。

只有当 agent 必须自己到达该 skill、或另一个 skill 必须到达它时，才选择模型调用。如果它只靠手动触发，就把它做成用户调用型，不付上下文负荷。

两个用户调用型 skill 都需要的共享参考，不能住在任何一个里——没有 `description`，谁也触发不了谁。把它推到 skill 系统之外的普通文件中：任何 skill 都可以指向的外部参考。

## 按调用方式拆分

拆分的调用切口（序列切口在 `SKILL.md` 中）：当你有一个应该独立触发它的、独特的引导词——一个你实际在 prompts 中使用的触发词——或者另一个 skill 必须到达它时，就拆分出一个模型调用型 skill。你为新的、始终加载的 `description` 付出上下文负荷，所以这种独立的触达必须配得上它。

## 路由 skill

当用户调用型 skills 多到超出你的记忆时，堆积起来的认知负荷由**路由 skill**治愈：一个用户调用型 skill，它列出其他 skills 以及何时取用哪一个，这样人类只需要记住一个 skill，而不是很多个。它只能提示，绝不能触发它们：用户调用型 skills 没有 `description`，所以除了人类以外，没有任何东西能到达它们。
