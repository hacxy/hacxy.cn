# .sandcastle/skills

沙箱内 agent 可用的 skill 集合（仓库内嵌，避免挂载宿主 `~/.pi`）。

## 来源与同步

本目录是 `~/.pi/agent/skills/*` 的**一次性拷贝**（112K）。沙箱内嵌是**有意为之**：

- 零挂载：worktree 本来就 bind-mount 进沙箱，skill 随仓库走，不需要挂载宿主配置
- 版本固定：流水线行为不随宿主 skill 更新静默漂移

**升级纪律**：全局 skill 更新后，如需流水线跟进，手动同步：

```bash
cp -r ~/.pi/agent/skills/* .sandcastle/skills/
```

## 当前清单

| skill           | 用途                                                                        | 何时被引用                             |
| --------------- | --------------------------------------------------------------------------- | -------------------------------------- |
| tdd             | 测试驱动开发（red-green-refactor）                                          | implement / review prompt 强制加载     |
| frontend-design | 视觉设计方向与排版指导                                                      | 涉及 UI/视觉的 issue（prompt 广告）    |
| research        | 一手来源调研                                                                | 需要查证文档/API 事实时（prompt 广告） |
| prd-to-plan     | PRD 拆解为多阶段计划                                                        | 预留（S4 后 PRD 流程用）               |
| 其余            | grill-me / grilling / teach / to-tickets / write-a-prd / writing-for-agents | 预留                                   |
