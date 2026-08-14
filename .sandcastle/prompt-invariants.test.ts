// @vitest-environment node
/**
 * 编排器 prompt 不变式测试（S2 可靠性地基）。
 *
 * 防止两类回归：
 * 1. prompt 里引用了不存在的 skill 路径（如 .sandcastle/skills/tdd/SKILL.md 写错/漏拷贝）
 * 2. prompt 里新增了 {{PLACEHOLDER}} 但宿主代码没有注入（main.ts / src/index.ts 的 promptArgs 漏配）
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SANDCASTLE_DIR = join(import.meta.dirname)

/** 递归收集 .md 文件，排除 skills/ 与 worktrees/ */
function collectPromptFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry)
    if (statSync(abs).isDirectory()) {
      if (entry === 'skills' || entry === 'worktrees' || entry === 'node_modules') continue
      out.push(...collectPromptFiles(abs))
    } else if (entry.endsWith('.md')) {
      out.push(abs)
    }
  }
  return out
}

/** 宿主 TS 源码里所有 promptArgs 注入的 key（含 sandcastle 内置占位符） */
function injectedPromptArgs(): Set<string> {
  const sources = ['main.ts', 'src/index.ts'].map((f) => join(SANDCASTLE_DIR, f))
  const keys = new Set<string>(['SOURCE_BRANCH', 'TARGET_BRANCH']) // sandcastle 内置
  for (const file of sources) {
    const text = readFileSync(file, 'utf8')
    // promptArgs: { ... } 单层花括号块，提取其中的 KEY: 键
    const blocks = text.matchAll(/promptArgs:\s*\{([^}]*)\}/g)
    for (const block of blocks) {
      for (const key of block[1].matchAll(/([A-Z][A-Z0-9_]*):/g)) {
        keys.add(key[1])
      }
    }
  }
  return keys
}

describe('sandcastle prompts', () => {
  const prompts = collectPromptFiles(SANDCASTLE_DIR)
  it('至少有一个 prompt 文件', () => {
    expect(prompts.length).toBeGreaterThan(0)
  })

  it.each(prompts)('%s 引用的 skill 路径必须存在', (abs) => {
    const content = readFileSync(abs, 'utf8')
    const refs = content.matchAll(/\.sandcastle\/skills\/([\w-]+)\/SKILL\.md/g)
    for (const ref of refs) {
      const target = join(SANDCASTLE_DIR, 'skills', ref[1], 'SKILL.md')
      expect(existsSync(target), `${abs} 引用了不存在的 ${ref[0]}`).toBe(true)
    }
  })

  it.each(prompts)('%s 的 {{PLACEHOLDER}} 必须被宿主注入', (abs) => {
    const content = readFileSync(abs, 'utf8')
    const injected = injectedPromptArgs()
    for (const match of content.matchAll(/\{\{([A-Z][A-Z0-9_]*)\}\}/g)) {
      const key = match[1]
      expect(
        injected.has(key),
        `${abs} 使用了未注入的占位符 {{${key}}}（promptArgs 里没有，也不是内置 SOURCE/TARGET_BRANCH）`,
      ).toBe(true)
    }
  })
})
