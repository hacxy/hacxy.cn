import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { collectSiteMeta } from '../../src/siteMeta.ts'

/**
 * issue #42 + #55：终端状态栏构建期元数据——站点版本（package.json）的收集。
 * issue #55 将构建期站点元数据收敛为版本号单一职责（GitStats / git 字段
 * 随状态栏 git 段一并删除）。
 * 版本缺失/损坏回退 0.0.0（不阻塞构建）——与已删除 collectGitStats 的
 * injectable 测试同一模式：collectSiteMeta 接受可注入 baseDir（临时目录）。
 */

const tmpDirs: string[] = []
afterEach(() => {
  for (const dir of tmpDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

/** 临时目录 + 写入指定 package.json 内容（不传则不写 → 模拟 package.json 缺失） */
function sandbox(pkgContent?: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'site-meta-'))
  tmpDirs.push(dir)
  if (pkgContent !== undefined) writeFileSync(join(dir, 'package.json'), pkgContent)
  return dir
}

describe('collectSiteMeta', () => {
  it('reads the version from package.json', () => {
    const meta = collectSiteMeta()
    expect(meta.version).toMatch(/^\d+\.\d+\.\d+/)
  })

  it('returns 0.0.0 when package.json is missing (构建不阻塞)', () => {
    expect(collectSiteMeta(sandbox())).toEqual({ version: '0.0.0' })
  })

  it('returns 0.0.0 when package.json is corrupt (构建不阻塞)', () => {
    expect(collectSiteMeta(sandbox('{ not valid json'))).toEqual({ version: '0.0.0' })
  })

  it('returns 0.0.0 when version is missing / not a string / empty (契约 { version } 恒定)', () => {
    expect(collectSiteMeta(sandbox('{}'))).toEqual({ version: '0.0.0' })
    expect(collectSiteMeta(sandbox('{ "version": 123 }'))).toEqual({ version: '0.0.0' })
    expect(collectSiteMeta(sandbox('{ "version": "" }'))).toEqual({ version: '0.0.0' })
  })

  it('reads a valid version from an injected baseDir', () => {
    expect(collectSiteMeta(sandbox('{ "version": "1.2.3" }'))).toEqual({ version: '1.2.3' })
  })
})
