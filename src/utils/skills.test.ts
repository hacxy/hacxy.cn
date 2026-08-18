import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const SKILLS_API = 'https://profile.hacxy.cn/api/public'

function jsonResponse(body: unknown) {
  return { ok: true, json: async () => body } as Response
}

function textResponse(text: string) {
  return { ok: true, text: async () => text } as Response
}

afterEach(() => {
  vi.unstubAllGlobals()
})

beforeEach(() => {
  // skills 模块持有模块级 fetch 缓存，逐测试重置模块实例
  vi.resetModules()
})

describe('skills 模块（通过公开 getSkills/preloadSkills 接口）', () => {
  it('拉取技能列表并附加 markdown 正文', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse([
            { name: 'skill-a', description: '正常描述 A', files: ['SKILL.md'] },
            { name: 'skill-b', description: '> 引用风格描述', files: [] },
          ]),
        )
        // 每个 skill 都会拉一次 SKILL.md
        .mockResolvedValueOnce(textResponse('---\nname: skill-a\n---\n# 正文\n')),
    )

    const { getSkills } = await import('./skills')
    const skills = await getSkills()

    expect(skills).toHaveLength(2)
    expect(skills[0]).toEqual({
      name: 'skill-a',
      description: '正常描述 A',
      markdownBody: '# 正文\n', // strip frontmatter
      url: 'https://github.com/hacxy/skills/tree/main/skills/skill-a',
    })
    // cleanDescription 会清理 "> " 引用前缀
    expect(skills[1].description).toBe('引用风格描述')
    // 第二个 skill 的首次 fetch 返回 {ok:false}，正文留空
    expect(skills[1].markdownBody).toBe('')
  })

  it('getSkills 与 preloadSkills 共享单例缓存（列表只请求一次）', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([{ name: 'skill-a', description: '描述 A', files: [] }]))
      .mockResolvedValue({ ok: false } as Response)
    vi.stubGlobal('fetch', fetchMock)

    const { preloadSkills, getSkills } = await import('./skills')
    preloadSkills()
    await getSkills()
    await getSkills()

    // 对 /skills 列表只发起一次请求（file 请求不计入）
    const listCalls = fetchMock.mock.calls.filter(([url]) => url === `${SKILLS_API}/skills`)
    expect(listCalls).toHaveLength(1)
  })

  it('获取文件失败时正文为空但不中断列表', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse([{ name: 'skill-a', description: '描述 A', files: ['SKILL.md'] }]),
        )
        .mockResolvedValue({ ok: false } as Response),
    )

    const { getSkills } = await import('./skills')
    const skills = await getSkills()

    expect(skills).toHaveLength(1)
    expect(skills[0].markdownBody).toBe('')
  })

  it('列表接口失败时抛出错误', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 } as Response))
    const { getSkills } = await import('./skills')
    await expect(getSkills()).rejects.toThrow('Skills API 500')
  })
})
