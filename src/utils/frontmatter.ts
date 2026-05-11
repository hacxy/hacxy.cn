import yaml from 'js-yaml'

export interface FrontmatterData {
  title?: string
  date?: string | Date
  tags?: unknown[]
  summary?: string
  [key: string]: unknown
}

export const FM_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/

export function parseFrontmatter(raw: string): { data: FrontmatterData; content: string } {
  const match = raw.match(FM_PATTERN)
  if (!match) return { data: {}, content: raw }
  try {
    const data = (yaml.load(match[1]) ?? {}) as FrontmatterData
    const content = raw.slice(match[0].length)
    return { data, content }
  } catch {
    return { data: {}, content: raw }
  }
}
