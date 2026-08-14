import * as sandcastle from '@ai-hero/sandcastle'
import { docker } from '@ai-hero/sandcastle/sandboxes/docker'
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { z } from 'zod'

import {
  DELIVERY,
  IMAGE,
  MODEL,
  PI_HOME_DIR,
  PLANNER_MODEL,
  REVIEW_MODEL,
  SKIP_LABELS,
  THINKING,
  WORKTREES_DIR,
} from './constants.js'

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

  // 3. 残留 pi-home（干净配置目录，session 已捕获到宿主 ~/.pi/agent/sessions，可整体清空重建）
  try {
    rmSync(PI_HOME_DIR, { recursive: true, force: true })
    mkdirSync(PI_HOME_DIR, { recursive: true })
  } catch {
    // 忽略
  }

  // 4. worktrees 目录：baseSandbox 挂载源必须存在（sandcastle 0.12 校验 hostPath）
  try {
    mkdirSync(WORKTREES_DIR, { recursive: true })
  } catch {
    // 忽略
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

/** 读宿主 pi 凭据（~/.pi/agent/auth.json 的 deepseek key），沙箱经 env 注入，不挂载 auth 文件 */
function deepseekApiKey(): string | undefined {
  try {
    const auth = JSON.parse(readFileSync(join(homedir(), '.pi', 'agent', 'auth.json'), 'utf8')) as {
      deepseek?: unknown
    }
    // pi 的 auth.json 里 deepseek 是 { type, key } 对象（兼容纯字符串形式）
    if (typeof auth.deepseek === 'string') return auth.deepseek
    if (auth.deepseek && typeof auth.deepseek === 'object') {
      const key = (auth.deepseek as { key?: unknown }).key
      if (typeof key === 'string') return key
    }
    return undefined
  } catch {
    return undefined
  }
}

/** 基础沙箱：干净 pi 配置目录（.sandcastle/pi-home，可写），凭据走 env，不挂载宿主 ~/.pi */
export function baseSandbox(env?: Record<string, string>): sandcastle.SandboxProvider {
  const key = deepseekApiKey()
  return docker({
    imageName: IMAGE,
    mounts: [
      // 沙箱内 pi 的配置/会话目录（pi 默认 /home/agent/.pi/agent/sessions）。
      // 不挂宿主 ~/.pi：避免扩展、settings.json 的 npm packages、keybindings 等污染沙箱。
      // session 捕获是文件传输机制，捕获后仍落回宿主 ~/.pi/agent/sessions。
      { hostPath: PI_HOME_DIR, sandboxPath: '/home/agent/.pi' },
      // 修复 sandcastle #855/#854：worktree 反向 gitdir 链接在容器内不可见，
      // 容器内 git prune 会把 worktree 管理目录误删（双向挂载直接删到宿主）。
      // 把 .sandcastle/worktrees 挂到容器内的宿主路径，使指针目标可见。
      { hostPath: '.sandcastle/worktrees', sandboxPath: resolve('.sandcastle/worktrees') },
    ],
    // CI=true：pnpm 在无 TTY 下要 purge macOS→Linux 的 node_modules 时会 abort
    // （ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY）；CI 模式下自动 purge 重装
    env: { CI: 'true', ...(key ? { DEEPSEEK_API_KEY: key } : {}), ...env },
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
        // 注意：同一 hook 点的多个 sandbox hook 是并行跑的，两个 pnpm 命令会抢 store 锁——
        // 合成一条顺序命令（CI=true 已注入：pnpm 无 TTY purge node_modules 时自动重装）
        onSandboxReady: [
          {
            command: 'pnpm install --frozen-lockfile && pnpm playwright install chromium',
            timeoutMs: 300_000,
          },
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

  console.log(`  ✓ #${planned.number} 实现完成：${result.commits.length} 个提交`)

  // ---- S3: Review（同沙箱串行；reviewer 直接改代码 + 提交，无人值守下评论没人回应）----
  console.log(`  🔍 #${planned.number} review 中…`)
  const review = await sandbox.run({
    name: `review-${planned.number}`,
    agent: sandcastle.pi(REVIEW_MODEL, { thinking: THINKING }),
    maxIterations: 10,
    promptFile: './.sandcastle/review-prompt.md',
    promptArgs: {
      ISSUE_NUMBER: String(planned.number),
      ISSUE_TITLE: planned.title,
      ISSUE_BODY: detail.body || '(无正文)',
      ISSUE_COMMENTS: detail.comments.length ? detail.comments.join('\n---\n') : '(无评论)',
      BRANCH: branch,
    },
  })
  if (review.commits.length > 0) {
    console.log(`  ✅ #${planned.number} review 产出 ${review.commits.length} 个提交`)
  } else {
    console.log(`  ⏹ #${planned.number} review 无改动`)
  }

  deliver(planned)
  return result.commits.length
}

// ---------------------------------------------------------------------------
// Phase 3：merger 合并分支到 main
// ---------------------------------------------------------------------------

/**
 * S4：merger agent 把完成分支合并进 main（merge-to-head：临时分支干活，完成后合回宿主 main），宿主 push。
 * 合并成功后由 merger 负责关 issue、删分支。失败时 main 未改动，分支保留。
 */
export async function mergeToMain(completed: PlannedIssue[]): Promise<boolean> {
  const branches = completed.map((i) => i.branch)
  console.log(`\n→ Merger：合并 ${branches.length} 个分支到 main…`)
  try {
    await sandcastle.run({
      sandbox: baseSandbox({ GH_TOKEN: process.env.GH_TOKEN ?? '' }),
      name: 'Merger',
      agent: sandcastle.pi(PLANNER_MODEL, { thinking: THINKING }),
      maxIterations: 10,
      // merge-to-head：临时分支上合并 + 验证 + 关 issue，完成后 sandcastle 合回宿主 main（本地），宿主再 push
      branchStrategy: { type: 'merge-to-head' },
      copyToWorktree: ['node_modules'],
      hooks: {
        sandbox: {
          // 同 implement：顺序执行 + 长超时（CI=true 已由 baseSandbox 注入）
          onSandboxReady: [
            {
              command: 'pnpm install --frozen-lockfile && pnpm playwright install chromium',
              timeoutMs: 300_000,
            },
          ],
        },
      },
      promptFile: './.sandcastle/merge-prompt.md',
      promptArgs: {
        BRANCHES: branches.map((b) => `- ${b}`).join('\n'),
        ISSUES: completed.map((i) => `- #${i.number}: ${i.title}`).join('\n'),
      },
    })
    execSync('git push origin main', { stdio: 'inherit' })
    console.log('  ↑ 已推送 main')
    return true
  } catch (error) {
    console.error(
      `  ✗ Merge 失败：${error instanceof Error ? error.message : error}（main 未改动，分支保留）`,
    )
    return false
  }
}

function deliver(issue: PlannedIssue): void {
  if (DELIVERY === 'push' || DELIVERY === 'pr' || DELIVERY === 'merge') {
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
