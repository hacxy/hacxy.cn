import { describe, expect, it } from 'vitest'

import { collectSiteMeta } from '../../src/siteMeta.ts'

/**
 * issue #55：终端状态栏精简后，构建期站点元数据收敛为版本号单一职责
 * （virtual:site-meta 契约 = { version }）——git 收集栈（collectGitStats /
 * formatGitStats / GitStats 接口）已删除，不保留死代码。版本号读取失败
 * （package.json 缺失/损坏）回退 0.0.0，不阻塞构建。
 */

describe('collectSiteMeta（版本号单一职责）', () => {
  it('reads the version from package.json', () => {
    const meta = collectSiteMeta()
    expect(meta.version).toMatch(/^\d+\.\d+\.\d+/)
  })

  it('contract is exactly { version } — no git stats field', () => {
    const meta = collectSiteMeta()
    expect('git' in meta).toBe(false)
    expect(Object.keys(meta).sort()).toEqual(['version'])
  })
})
