import type { TechGroup } from './types/site'

export interface BlogConfig {
  author: string
  github?: string
  bio?: string
  email?: string
  bilibili?: string
  copyright?: string
  projects?: string[]
  techStack?: TechGroup[]
  include?: string[]
  exclude?: string[]
  base?: string
}

export function defineBlogConfig(config: BlogConfig): BlogConfig {
  return config
}
