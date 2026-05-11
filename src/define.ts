import type { TechGroup } from './types/site'

export type LogoConfig =
  | string // iconify icon name
  | { src: string; alt?: string } // local or remote image

export interface NavItem {
  text?: string
  link: string
  icon?: string  // iconify icon name; if set with no text, renders icon-only
}

export interface BlogConfig {
  author: string
  title?: string
  logo?: LogoConfig
  bio?: string
  copyright?: string
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
