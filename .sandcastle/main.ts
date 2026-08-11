/**
 * pi-afk 基础循环
 *
 * 流程：拉取 GitHub open issues → 每个 issue 独立分支 + Docker 沙箱 → pi agent 实现
 *       → 提交 → （可选）推送分支 / 开 draft PR
 *
 * 运行：npx tsx .sandcastle/main.ts
 *
 * 配置（环境变量，可放 .sandcastle/.env）：
 *   SANDBOX_IMAGE   沙箱镜像名         默认 sandcastle:pi-afk
 *   AGENT_MODEL     pi 使用的模型       默认 deepseek/deepseek-v4-flash
 *   AGENT_THINKING  pi 推理强度         默认 medium（off/minimal/low/medium/high/xhigh）
 *   MAX_PARALLEL    并行 issue 数       默认 2
 *   MAX_ROUNDS      循环轮数            默认 5（每轮重新拉取，可处理新 issue/失败重试）
 *   DELIVERY        完成策略            none=只留在本地分支 / push=推送分支 / pr=推送并开 draft PR
 *   SKIP_LABELS     跳过带这些标签的 issue（逗号分隔）默认 agent:done
 */
import * as sandcastle from '@ai-hero/sandcastle'
import { docker } from '@ai-hero/sandcastle/sandboxes/docker'
import { execSync } from 'node:child_process'

// ---------------------------------------------------------------------------
// 配置
// ---------------------------------------------------------------------------

const IMAGE = process.env.SANDBOX_IMAGE ?? 'sandcastle:pi-afk'
const MODEL = process.env.AGENT_MODEL ?? 'deepseek/deepseek-v4-flash'
const THINKING = (process.env.AGENT_THINKING ?? 'high') as sandcastle.PiOptions['thinking']
const MAX_PARALLEL = Number(process.env.MAX_PARALLEL ?? 2)
const MAX_ROUNDS = Number(process.env.MAX_ROUNDS ?? 5)
const DELIVERY = process.env.DELIVERY ?? 'pr' // none | push | pr
const SKIP_LABELS = (process.env.SKIP_LABELS ?? 'agent:done')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

// ---------------------------------------------------------------------------
// 宿主辅助函数（gh 在宿主跑，沙箱专注实现）
// ---------------------------------------------------------------------------

const gh = (args: string): string =>
  execSync(`gh ${args}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()

interface Issue {
  number: number
  title: string
  body: string
  labels: string[]
  comments: string[]
}

function fetchOpenIssues(): Issue[] {
  const json = gh(
    `issue list --state open --json number,title,body,labels,comments ` +
      `--jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`,
  )
  const issues = JSON.parse(json) as Issue[]
  const filtered = issues.filter((i) => !i.labels.some((l) => SKIP_LABELS.includes(l)))
  if (filtered.length !== issues.length) {
    console.log(`  （跳过 ${issues.length - filtered.length} 个带跳过标签的 issue）`)
  }
  return filtered
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

// ---------------------------------------------------------------------------
// 单个 issue 的实现 + 交付
// ---------------------------------------------------------------------------

async function implement(issue: Issue): Promise<number> {
  const branch = `sandcastle/issue-${issue.number}`
  console.log(`\n→ 实现 #${issue.number}: ${issue.title} (${branch})`)

  await using sandbox = await sandcastle.createSandbox({
    sandbox: docker({
      imageName: IMAGE,
      mounts: [
        // pi 的认证配置（~/.pi/agent/auth.json 里的 deepseek key）
        { hostPath: '~/.pi', sandboxPath: '/home/agent/.pi', readonly: true },
      ],
    }),
    branch,
  })

  const result = await sandbox.run({
    name: `issue-${issue.number}`,
    agent: sandcastle.pi(MODEL, { thinking: THINKING }),
    promptFile: './.sandcastle/prompt.md',
    promptArgs: {
      ISSUE_NUMBER: String(issue.number),
      ISSUE_TITLE: issue.title,
      ISSUE_BODY: issue.body || '(无正文)',
      ISSUE_COMMENTS: issue.comments.length ? issue.comments.join('\n---\n') : '(无评论)',
      RECENT_COMMITS: recentCommits(),
      BRANCH: branch,
    },
  })

  if (result.commits.length === 0) {
    console.log(`  ⚠ #${issue.number} 没有产生提交，跳过交付`)
    return 0
  }

  console.log(`  ✓ #${issue.number} 完成：${result.commits.length} 个提交`)
  try {
    deliver(issue)
  } catch (error) {
    console.error(
      `  ✗ #${issue.number} 交付失败（实现已完成）：${error instanceof Error ? error.message : error}`,
    )
  }
  return result.commits.length
}

function deliver(issue: Issue): void {
  const branch = `sandcastle/issue-${issue.number}`
  if (DELIVERY === 'push' || DELIVERY === 'pr') {
    execSync(`git push -u origin ${branch}`, { stdio: 'inherit' })
    console.log(`  ↑ 已推送 ${branch}`)
  }
  if (DELIVERY === 'pr') {
    const title = `Fix #${issue.number}: ${issue.title}`.slice(0, 256)
    execSync(
      `gh pr create --draft --base main --head ${branch} ` +
        `--title ${JSON.stringify(title)} ` +
        `--body "Closes #${issue.number}\\n\\nImplemented by the pi-afk agent."`,
      { stdio: 'inherit' },
    )
    console.log(`  ⏺ 已开 draft PR`)
  }
}

// ---------------------------------------------------------------------------
// 主循环
// ---------------------------------------------------------------------------

for (let round = 1; round <= MAX_ROUNDS; round++) {
  console.log(`\n========== Round ${round}/${MAX_ROUNDS} ==========`)

  const issues = fetchOpenIssues()
  if (issues.length === 0) {
    console.log('没有可处理的 open issues，结束。')
    break
  }
  console.log(
    `发现 ${issues.length} 个 issue：`,
    issues.map((i) => `#${i.number} ${i.title}`).join(' | '),
  )

  // 信号量并发控制
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
        return { issue, commits: 0, error: String(error) }
      } finally {
        release()
      }
    }),
  )

  const done = settled.filter((s) => s.status === 'fulfilled')
  console.log(`\nRound ${round} 完成：${done.length}/${issues.length} 个 issue 成功`)
}

console.log('\n全部结束。')
