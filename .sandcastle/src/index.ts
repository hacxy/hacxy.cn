import * as sandcastle from '@ai-hero/sandcastle'
import { docker } from '@ai-hero/sandcastle/sandboxes/docker'
import { execSync } from 'node:child_process'
import { existsSync, readdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod'

import { DELIVERY, IMAGE, MODEL, SKIP_LABELS, THINKING, WORKTREES_DIR } from './constants'

/** 清理上次异常中断可能残留的沙箱容器（docker）与 worktree 目录 */
export function cleanupResidue(): void {
  // 1. 残留沙箱容器：容器命名固定为 sandcastle-<uuid>（见 sandcastle 源码）
  try {
    const containers = execSync('docker ps -aq --filter name=sandcastle', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    if (containers) {
      execSync(`docker rm -f ${containers}`, { stdio: 'ignore' })
      const count = containers.split(/\s+/).length
      console.log(`🧹 清理 ${count} 个残留沙箱容器`)
    }
  } catch {
    // docker 不可用/无残留时忽略
  }

  // 2. 残留 worktree：prune 元数据 + 删除未注册的 .sandcastle/worktrees/* 目录
  try {
    execSync('git worktree prune', { stdio: 'ignore' })
    const registered = new Set(
      execSync('git worktree list --porcelain', { encoding: 'utf8' })
        .split('\n')
        .filter((l) => l.startsWith('worktree '))
        .map((l) => l.slice('worktree '.length)),
    )
    if (existsSync(WORKTREES_DIR)) {
      for (const entry of readdirSync(WORKTREES_DIR)) {
        const abs = resolve(WORKTREES_DIR, entry)
        if (!registered.has(abs)) {
          rmSync(abs, { recursive: true, force: true })
          console.log(`🧹 清理残留 worktree：${abs}`)
        }
      }
    }
  } catch {
    // 非 git 仓库等场景忽略
  }
}

/** 信号处理：宿主被中断时先杀掉沙箱容器再退出，杜绝失控 agent 继续跑 */
export function registerSignalHandlers(): void {
  const shutdown = (signal: string) => {
    console.log(`\n⚠ 收到 ${signal}，清理沙箱容器后退出…`)
    cleanupResidue()
    process.exit(130)
  }
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

// ---------------------------------------------------------------------------
// 宿主辅助函数
// ---------------------------------------------------------------------------

const gh = (args: string): string =>
  execSync(`gh ${args}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()

export interface PlannedIssue {
  number: number
  title: string
  branch: string
}

/** planner 输出的 <plan> JSON 结构（与 plan-prompt.md 的 OUTPUT 一致） */
export const planSchema = z.object({
  issues: z.array(z.object({ number: z.number(), title: z.string(), branch: z.string() })),
})

export interface IssueDetail {
  number: number
  title: string
  body: string
  labels: string[]
  comments: string[]
}

export function fetchIssueDetail(number: number): IssueDetail {
  const json = gh(
    `issue view ${number} --json number,title,body,labels,comments ` +
      `--jq '{number, title, body, labels: [.labels[].name], comments: [.comments[].body]}'`,
  )
  return JSON.parse(json) as IssueDetail
}

// 获取最近5条git提交记录
export function recentCommits(): string {
  try {
    return execSync('git log -n 5 --format=%H%n%ad%n%B--- --date=short', {
      encoding: 'utf8',
    }).trim()
  } catch {
    return '(no commits)'
  }
}

/** 基础沙箱：pi 配置挂载（可写，pi 要写 sessions/锁文件），可附加 env */
export function baseSandbox(env?: Record<string, string>): sandcastle.SandboxProvider {
  return docker({
    imageName: IMAGE,
    mounts: [{ hostPath: '~/.pi', sandboxPath: '/home/agent/.pi' }],
    env,
  })
}

// ---------------------------------------------------------------------------
// Phase 2：单个 issue 的实现 + 交付
// ---------------------------------------------------------------------------

export async function implement(planned: PlannedIssue): Promise<number> {
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
    // 复制宿主 node_modules 到 worktree：沙箱立即可用，免全量 pnpm install
    copyToWorktree: ['node_modules'],
    // 沙箱就绪后增量 install：补齐平台相关二进制（宿主 macOS vs 容器 linux）
    hooks: {
      sandbox: {
        onSandboxReady: [
          { command: 'pnpm install --frozen-lockfile' },
          // 版本匹配时秒级跳过；项目升级 playwright 后自动补齐对应 chromium
          { command: 'pnpm playwright install chromium' },
        ],
      },
    },
  })

  const result = await sandbox.run({
    name: `issue-${planned.number}`,
    agent: sandcastle.pi(MODEL, { thinking: THINKING }),
    // 默认 maxIterations=1（只够一轮），给足轮数让 agent 完成完整实现+验证
    maxIterations: 10,
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
