import type { TechGroup } from './types/site'

export type LogoConfig =
  | string // iconify icon name
  | { src: string; alt?: string } // local or remote image

export interface NavItem {
  text: string
  link: string
}

export interface BlogConfig {
  author: string
  title?: string
  logo?: LogoConfig
  github?: string
  bio?: string
  email?: string
  bilibili?: string
  copyright?: string
  projects?: string[]
  techStack?: TechGroup[]
  nav?: NavItem[]
  include?: string[]
  exclude?: string[]
  base?: string
  contentDir?: string
}

export function defineBlogConfig(config: BlogConfig): BlogConfig {
  return config
}
