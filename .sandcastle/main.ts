/**
 * pi-afk 循环 —— plan → implement → review → merge（Matt Pocock 结构 + 沙箱隔离）
 *
 * 每轮迭代：
 *   Phase 1 Plan：planner agent 在沙箱内 `gh issue list` 拉取全部 open issues，
 *                 构建依赖图，输出 <plan> JSON（只含未阻塞的 issue + 分支名，Zod 校验 + 自动重试）
 *   Phase 2 Execute：对 plan 选出的 issue 并行实现（每 issue 独立分支 + 沙箱），
 *                 实现完成后同沙箱串行跑 review（reviewer 直接改代码 + 提交）
 *   Phase 3 Merge（DELIVERY=merge）：merger agent 把完成分支合并进 main、解冲突、
 *                 验证（typecheck/test/lint/e2e）、关 issue，宿主 push main
 *
 * 运行：npx tsx .sandcastle/main.ts
 *
 * 配置（环境变量，可放 .sandcastle/.env）：
 *   SANDBOX_IMAGE    沙箱镜像名         默认 sandcastle:pi-afk
 *   AGENT_MODEL      实现 agent 模型     默认 deepseek/deepseek-v4-flash
 *   PLANNER_MODEL    planner/merger 模型  默认同 AGENT_MODEL（Matt 用更强的模型做 plan）
 *   REVIEW_MODEL     review agent 模型   默认同 AGENT_MODEL
 *   AGENT_THINKING   pi 推理强度         默认 medium（off/minimal/low/medium/high/xhigh）
 *   MAX_PARALLEL     并行 issue 数       默认 2
 *   MAX_ITERATIONS   迭代轮数            默认 5（每轮重新 plan，消化依赖链）
 *   DELIVERY         完成策略            none=只留本地分支 / push=推送分支 / pr=推送并开 draft PR / merge=推送+迭代末合并 main+关 issue
 *   SKIP_LABELS      跳过带这些标签的 issue（逗号分隔）默认 agent:done
 *   GH_TOKEN         必须设置：planner 在沙箱里跑 gh 需要认证
 */
import * as sandcastle from '@ai-hero/sandcastle'
import { execSync } from 'node:child_process'

import { DELIVERY, MAX_ITERATIONS, MAX_PARALLEL, PLANNER_MODEL, THINKING } from './src/constants.js'
import {
  baseSandbox,
  cleanupResidue,
  implement,
  mergeToMain,
  planSchema,
  registerSignalHandlers,
  type PlannedIssue,
} from './src/index.js'

const originalToISOString = Date.prototype.toISOString
Date.prototype.toISOString = function (): string {
  const shifted = new Date(this.getTime() + 8 * 60 * 60 * 1000)
  return originalToISOString.call(shifted).replace('Z', '+08:00')
}

if (!process.env.GH_TOKEN) {
  console.warn('⚠ 未设置 GH_TOKEN——planner 在沙箱里跑 gh 会失败')
}

// ---------------------------------------------------------------------------
// 主循环（Matt 原版结构）
// ---------------------------------------------------------------------------

// 启动前清理残留 + 注册信号处理（宿主中断时杀容器）
cleanupResidue()
registerSignalHandlers()

// ---------------------------------------------------------------------------
// Merge-only 模式：跳过 plan/implement，直接合并指定分支（DELIVERY=push 观测轮之后的收尾）
// 用法：MERGE_ONLY_BRANCHES=sandcastle/issue-52-xxx,sandcastle/issue-53-xxx npx tsx .sandcastle/main.ts
// ---------------------------------------------------------------------------
const mergeOnly = (process.env.MERGE_ONLY_BRANCHES ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
if (mergeOnly.length > 0) {
  console.log('→ Merge-only 模式：跳过 plan/implement，直接合并指定分支')
  const completed: PlannedIssue[] = []
  for (const branch of mergeOnly) {
    const number = Number(branch.match(/issue-(\d+)/)?.[1])
    if (!number) {
      console.error(`  ✗ 无法从分支名解析 issue 号：${branch}（期望格式 sandcastle/issue-N-slug）`)
      continue
    }
    const title = execSync(`gh issue view ${number} --json title --jq .title`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    completed.push({ number, title, branch })
  }
  await mergeToMain(completed)
  process.exit(0)
}

for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
  console.log(`\n========== Iteration ${iteration}/${MAX_ITERATIONS} ==========`)

  // ---- Phase 1: Plan ----
  console.log('\n→ Planner：分析 open issues，构建依赖图，选择未阻塞 issue…')
  let plan: { output: { issues: PlannedIssue[] } }
  try {
    plan = await sandcastle.run({
      sandbox: baseSandbox({ GH_TOKEN: process.env.GH_TOKEN ?? '' }),
      name: 'Planner',
      // 结构化输出要求 maxIterations: 1（planner 只读分析，一轮足够）
      maxIterations: 1,
      agent: sandcastle.pi(PLANNER_MODEL, { thinking: THINKING }),
      promptFile: './.sandcastle/plan-prompt.md',
      // 内置结构化输出：fence-aware 解析 + schema 验证 + 自动重试（resume 同一 session）
      output: sandcastle.Output.object({ tag: 'plan', schema: planSchema, maxRetries: 2 }),
    })
  } catch (error) {
    // 连续重试后仍失败：记日志跳过本轮，不让整个脚本崩掉（S2 可靠性）
    console.error(
      `✗ Planner 失败（含重试）：${error instanceof Error ? error.message : error}。跳过本轮。`,
    )
    continue
  }

  const issues = plan.output.issues

  if (issues.length === 0) {
    console.log('没有可执行的 issue。结束。')
    break
  }
  console.log(`Plan 完成：${issues.length} 个未阻塞 issue：`)
  for (const i of issues) {
    console.log(`  #${i.number}: ${i.title} → ${i.branch}`)
  }

  // ---- Phase 2: Execute（信号量并发）----
  let running = 0
  const queue: (() => void)[] = []
  const acquire = () =>
    running < MAX_PARALLEL
      ? (running++, Promise.resolve())
      : new Promise<void>((resolve) => queue.push(resolve))
  const release = () => {
    running--
    queue.shift()?.()
  }

  const settled = await Promise.allSettled(
    issues.map(async (issue) => {
      await acquire()
      try {
        const commits = await implement(issue)
        return { issue, commits }
      } catch (error) {
        console.error(
          `  ✗ #${issue.number} 失败：${error instanceof Error ? error.message : error}`,
        )
        return { issue, commits: 0 }
      } finally {
        release()
      }
    }),
  )

  const done = settled.filter((s) => s.status === 'fulfilled')
  console.log(`\nIteration ${iteration} 完成：${done.length}/${issues.length} 个 issue 成功`)

  // ---- Phase 3: Merge（DELIVERY=merge 时，每轮迭代末合并 main）----
  const completed = settled
    .filter(
      (s): s is PromiseFulfilledResult<{ issue: PlannedIssue; commits: number }> =>
        s.status === 'fulfilled' && s.value.commits > 0,
    )
    .map((s) => s.value.issue)
  const completedBranches = completed.map((i) => i.branch)

  if (completedBranches.length === 0) {
    console.log('没有可合并的分支。')
    continue
  }

  if (DELIVERY === 'merge') {
    await mergeToMain(completed)
  }
}

console.log('\n全部结束。')
