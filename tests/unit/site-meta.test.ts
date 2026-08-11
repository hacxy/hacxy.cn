import { execSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

import { collectGitStats, collectSiteMeta } from '../../src/siteMeta.ts'
import { formatGitStats } from '../../src/statusBar.ts'

/**
 * issue #42：终端状态栏构建期元数据——站点版本（package.json）与 git 统计
 * （真实仓库）的收集与展示形态。git 不可得（CI 浅克隆 / 非 git 目录 / git 未安装）
 * 时优雅返回 null（状态栏省略该段、构建不失败）——用可注入 exec 模拟。
 */

/** 模拟 exec：is-inside-work-tree 之外全部失败（如浅克隆缺 rev-list） */
function fakeExec(inside: boolean, failOther: boolean): typeof execSync {
  return ((cmd: string) => {
    if (cmd.includes('is-inside-work-tree')) {
      return { toString: () => String(inside) } as never
    }
    if (failOther) throw new Error('git: 命令失败（浅克隆 / CI）')
    return { toString: () => 'main\n2fe73c3\n211\n' } as never
  }) as unknown as typeof execSync
}

describe('collectGitStats', () => {
  it('collects real repository stats in a git work tree', () => {
    const git = collectGitStats()
    expect(git).not.toBeNull()
    expect(git?.branch.length).toBeGreaterThan(0)
    expect(git?.sha).toMatch(/^[0-9a-f]+$/)
    expect(git?.sha.length).toBeGreaterThanOrEqual(7)
    expect(git?.commitCount).toBeGreaterThan(0)
    expect(typeof git?.dirty).toBe('boolean')
  })

  it('returns null outside a git work tree (非 git 目录)', () => {
    expect(collectGitStats(fakeExec(false, false))).toBeNull()
  })

  it('returns null when any stat command fails (CI 浅克隆 / git 缺失)', () => {
    expect(collectGitStats(fakeExec(true, true))).toBeNull()
    // git 命令整体抛错（git 未安装）
    const throwing = (() => {
      throw new Error('git: command not found')
    }) as unknown as typeof execSync
    expect(collectGitStats(throwing)).toBeNull()
  })

  it('returns null when parsed stats are unusable', () => {
    // 分支名 / SHA 为空或提交数非有限数 → 视为不可得
    const empty = ((cmd: string) => {
      if (cmd.includes('is-inside-work-tree')) return { toString: () => 'true' } as never
      return { toString: () => '\n\nabc\n' } as never
    }) as unknown as typeof execSync
    expect(collectGitStats(empty)).toBeNull()
  })
})

describe('collectSiteMeta', () => {
  it('reads the version from package.json and attaches git stats', () => {
    const meta = collectSiteMeta()
    expect(meta.version).toMatch(/^\d+\.\d+\.\d+/)
    expect(meta.git).not.toBeNull()
  })
})

describe('formatGitStats（状态栏展示形态：branch@sha · N commits，脏工作区分支后缀 *）', () => {
  it('formats branch@shortsha with commit count', () => {
    expect(formatGitStats({ branch: 'main', sha: '2fe73c3', commitCount: 211, dirty: false })).toBe(
      'main@2fe73c3 · 211 commits',
    )
  })

  it('appends an asterisk to the branch when the working tree is dirty', () => {
    expect(formatGitStats({ branch: 'agent/x', sha: 'abc1234', commitCount: 5, dirty: true })).toBe(
      'agent/x*@abc1234 · 5 commits',
    )
  })
})
