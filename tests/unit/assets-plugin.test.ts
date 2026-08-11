import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { resolveAssetFile } from '../../vite-assets-plugin.ts'

const POSTS_ROOT = join(process.cwd(), 'content', 'posts')

describe('resolveAssetFile: /assets/<path> → content/posts/<目录>/assets/<文件名>', () => {
  it('maps root-level assets to content/posts/assets/', () => {
    expect(resolveAssetFile('fixture.png')).toBe(join(POSTS_ROOT, 'assets', 'fixture.png'))
  })

  it('maps nested assets to content/posts/<目录>/assets/ (issue #43)', () => {
    expect(resolveAssetFile('pi-agent/fixture.png')).toBe(
      join(POSTS_ROOT, 'pi-agent', 'assets', 'fixture.png'),
    )
  })

  it('maps arbitrary depth by directory path', () => {
    expect(resolveAssetFile('a/b/c/x.svg')).toBe(join(POSTS_ROOT, 'a', 'b', 'c', 'assets', 'x.svg'))
  })

  it('rejects path traversal outside content/posts', () => {
    expect(resolveAssetFile('../secret.png')).toBeNull()
    expect(resolveAssetFile('a/../../secret.png')).toBeNull()
    // 中间件先 decodeURIComponent 再解析：URL 编码的 ../ 同样被拒
    expect(resolveAssetFile(decodeURIComponent('..%2Fsecret.png'))).toBeNull()
  })
})
