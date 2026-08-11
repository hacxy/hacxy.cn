/**
 * pi-afk 循环 —— 按 Matt Pocock 原版结构还原（plan → implement）
 *
 * 每轮迭代：
 *   Phase 1 Plan：planner agent 在沙箱内 `gh issue list` 拉取全部 open issues，
 *                 构建依赖图，输出 <plan> JSON（只含未阻塞的 issue + 分支名）
 *   Phase 2 Execute：对 plan 选出的 issue 并行实现（每 issue 独立分支 + 沙箱）
 *
 * 运行：npx tsx .sandcastle/main.ts
 *
 * 配置（环境变量，可放 .sandcastle/.env）：
 *   SANDBOX_IMAGE    沙箱镜像名         默认 sandcastle:pi-afk
 *   AGENT_MODEL      实现 agent 模型     默认 deepseek/deepseek-v4-flash
 *   PLANNER_MODEL    planner 模型        默认同 AGENT_MODEL（Matt 用更强的模型做 plan）
 *   AGENT_THINKING   pi 推理强度         默认 medium（off/minimal/low/medium/high/xhigh）
 *   MAX_PARALLEL     并行 issue 数       默认 2
 *   MAX_ITERATIONS   迭代轮数            默认 5（每轮重新 plan，消化依赖链）
 *   DELIVERY         完成策略            none=只留本地分支 / push=推送分支 / pr=推送并开 draft PR
 *   SKIP_LABELS      跳过带这些标签的 issue（逗号分隔）默认 agent:done
 *   GH_TOKEN         必须设置：planner 在沙箱里跑 gh 需要认证
 */
import * as sandcastle from '@ai-hero/sandcastle'
import { docker } from '@ai-hero/sandcastle/sandboxes/docker'
import { execSync } from 'node:child_process'

const originalToISOString = Date.prototype.toISOString
Date.prototype.toISOString = function (): string {
  const shifted = new Date(this.getTime() + 8 * 60 * 60 * 1000)
  return originalToISOString.call(shifted).replace('Z', '+08:00')
}

// ---------------------------------------------------------------------------
// 配置
// ---------------------------------------------------------------------------

const IMAGE = process.env.SANDBOX_IMAGE ?? 'sandcastle:pi-afk'
const MODEL = process.env.AGENT_MODEL ?? 'deepseek/deepseek-v4-flash'
const PLANNER_MODEL = process.env.PLANNER_MODEL ?? MODEL
const THINKING = (process.env.AGENT_THINKING ?? 'medium') as sandcastle.PiOptions['thinking']
const MAX_PARALLEL = Number(process.env.MAX_PARALLEL ?? 2)
const MAX_ITERATIONS = Number(process.env.MAX_ITERATIONS ?? 5)
const DELIVERY = process.env.DELIVERY ?? 'pr' // none | push | pr
const SKIP_LABELS = (process.env.SKIP_LABELS ?? 'agent:done')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

if (!process.env.GH_TOKEN) {
  console.warn('⚠ 未设置 GH_TOKEN——planner 在沙箱里跑 gh 会失败')
}

// ---------------------------------------------------------------------------
// 宿主辅助函数
// ---------------------------------------------------------------------------

const gh = (args: string): string =>
  execSync(`gh ${args}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()

interface PlannedIssue {
  number: number
  title: string
  branch: string
}

interface IssueDetail {
  number: number
  title: string
  body: string
  labels: string[]
  comments: string[]
}

function fetchIssueDetail(number: number): IssueDetail {
  const json = gh(
    `issue view ${number} --json number,title,body,labels,comments ` +
      `--jq '{number, title, body, labels: [.labels[].name], comments: [.comments[].body]}'`,
  )
  return JSON.parse(json) as IssueDetail
}

function recentCommits(): string {
  try {
    return execSync('git log -n 5 --format=%H%n%ad%n%B--- --date=short', {
      encoding: 'utf8',
    }).trim()
  } catch {
    return '(no commits)'
  }
}

/** 基础沙箱：pi 配置挂载（可写，pi 要写 sessions/锁文件），可附加 env */
function baseSandbox(env?: Record<string, string>): sandcastle.SandboxProvider {
  return docker({
    imageName: IMAGE,
    mounts: [{ hostPath: '~/.pi', sandboxPath: '/home/agent/.pi' }],
    env,
  })
}

// ---------------------------------------------------------------------------
// Phase 2：单个 issue 的实现 + 交付
// ---------------------------------------------------------------------------

async function implement(planned: PlannedIssue): Promise<number> {
  // 宿主补拉 issue 详情（body/comments/labels）注入 prompt，沙箱专注实现
  const detail = fetchIssueDetail(planned.number)
  if (detail.labels.some((l) => SKIP_LABELS.includes(l))) {
    console.log(`  ⏭ 跳过 #${planned.number}（带跳过标签）`)
    return 0
  }

  const branch = planned.branch
  console.log(`\n→ 实现 #${planned.number}: ${planned.title} (${branch})`)

  await using sandbox = await sandcastle.createSandbox({
    sandbox: baseSandbox(),
    branch,
  })

  const result = await sandbox.run({
    name: `issue-${planned.number}`,
    agent: sandcastle.pi(MODEL, { thinking: THINKING }),
    promptFile: './.sandcastle/prompt.md',
    promptArgs: {
      ISSUE_NUMBER: String(planned.number),
      ISSUE_TITLE: planned.title,
      ISSUE_BODY: detail.body || '(无正文)',
      ISSUE_COMMENTS: detail.comments.length ? detail.comments.join('\n---\n') : '(无评论)',
      RECENT_COMMITS: recentCommits(),
      BRANCH: branch,
    },
  })

  if (result.commits.length === 0) {
    console.log(`  ⚠ #${planned.number} 没有产生提交，跳过交付`)
    return 0
  }

  console.log(`  ✓ #${planned.number} 完成：${result.commits.length} 个提交`)
  deliver(planned)
  return result.commits.length
}

/**
 * 从 planner 输出中提取 <plan> 标签内的 issues 列表。
 * 容错处理：去 ```json 代码块标记、清理多余空白；解析失败抛出带原始内容的清晰错误。
 */
function extractPlanIssues(stdout: string): PlannedIssue[] {
  const match = stdout.match(/<plan>([\s\S]*?)<\/plan>/)
  if (!match) {
    throw new Error('Planner 未产出 <plan> 标签。\n\n' + stdout)
  }
  const raw = (match[1] ?? '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
  try {
    const { issues } = JSON.parse(raw) as { issues?: PlannedIssue[] }
    return issues ?? []
  } catch (error) {
    throw new Error(
      `Planner 的 <plan> JSON 解析失败：${error instanceof Error ? error.message : error}\n\n原始内容：\n${raw}`,
    )
  }
}

function deliver(issue: PlannedIssue): void {
  if (DELIVERY === 'push' || DELIVERY === 'pr') {
    execSync(`git push -u origin ${issue.branch}`, { stdio: 'inherit' })
    console.log(`  ↑ 已推送 ${issue.branch}`)
  }
  if (DELIVERY === 'pr') {
    const title = `Fix #${issue.number}: ${issue.title}`.slice(0, 256)
    execSync(
      `gh pr create --draft --base main --head ${issue.branch} ` +
        `--title ${JSON.stringify(title)} ` +
        `--body "Closes #${issue.number}\\n\\nImplemented by the pi-afk agent."`,
      { stdio: 'inherit' },
    )
    console.log(`  ⏺ 已开 draft PR`)
  }
}

// ---------------------------------------------------------------------------
// 主循环（Matt 原版结构）
// ---------------------------------------------------------------------------

for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
  console.log(`\n========== Iteration ${iteration}/${MAX_ITERATIONS} ==========`)

  // ---- Phase 1: Plan ----
  console.log('\n→ Planner：分析 open issues，构建依赖图，选择未阻塞 issue…')
  const plan = await sandcastle.run({
    sandbox: baseSandbox({ GH_TOKEN: process.env.GH_TOKEN ?? '' }),
    name: 'Planner',
    agent: sandcastle.pi(PLANNER_MODEL, { thinking: THINKING }),
    promptFile: './.sandcastle/plan-prompt.md',
  })

  const issues = extractPlanIssues(plan.stdout)

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
}

console.log('\n全部结束。')
