export interface SkillData {
  name: string
  description: string
  markdownBody: string
  url: string
}

interface SkillListItem {
  name: string
  description: string
  files: string[]
}

const REPO = 'hacxy/skills'
const SKILLS_API = 'https://profile.hacxy.cn/api/public'

function stripFrontmatter(raw: string): string {
  const match = raw.match(/^---\s*\n[\s\S]*?\n---\s*\n?([\s\S]*)$/)
  return match ? match[1] : raw
}

function cleanDescription(desc: string): string {
  return desc.replace(/^[>|]-?\s*/, '').trim()
}

async function fetchSkills(): Promise<SkillData[]> {
  const res = await fetch(`${SKILLS_API}/skills`)
  if (!res.ok) throw new Error(`Skills API ${res.status}`)
  const list: SkillListItem[] = await res.json()

  return Promise.all(
    list.map(async (item): Promise<SkillData> => {
      let markdownBody = ''
      try {
        const fileRes = await fetch(`${SKILLS_API}/file/${item.name}/SKILL.md`)
        if (fileRes.ok) {
          markdownBody = stripFrontmatter(await fileRes.text())
        }
      } catch { /* use empty body */ }
      return {
        name: item.name,
        description: cleanDescription(item.description),
        markdownBody,
        url: `https://github.com/${REPO}/tree/main/skills/${item.name}`,
      }
    })
  )
}

let cached: Promise<SkillData[]> | null = null

export function preloadSkills(): void {
  if (!cached) cached = fetchSkills()
}

export function getSkills(): Promise<SkillData[]> {
  if (!cached) cached = fetchSkills()
  return cached
}

export { REPO }
