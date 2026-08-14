import { describe, expect, it } from 'vitest'

import { collectSiteMeta } from '../../src/siteMeta.ts'

/**
 * issue #42 + #55：终端状态栏构建期元数据——站点版本（package.json）的收集。
 * issue #55 将构建期站点元数据收敛为版本号单一职责（GitStats / git 字段
 * 随状态栏 git 段一并删除）。
 */

describe('collectSiteMeta', () => {
  it('reads the version from package.json', () => {
    const meta = collectSiteMeta()
    expect(meta.version).toMatch(/^\d+\.\d+\.\d+/)
  })
})
