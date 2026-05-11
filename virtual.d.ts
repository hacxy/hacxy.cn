declare module 'virtual:blog-config' {
  export interface TechItem {
    name: string
    icon: string
    color?: string
  }
  export interface TechGroup {
    category: string
    items: TechItem[]
  }
  export interface LogoImage {
    src: string
    alt?: string
  }
  export interface NavItem {
    text?: string
    link: string
    icon?: string
  }
  export interface ResolvedSidebarItem {
    text: string
    link?: string
    items?: ResolvedSidebarItem[]
    isolated?: boolean
  }
  interface ResolvedBlogConfig {
    author: string
    title: string
    logo: string | LogoImage | null
    bio: string
    copyright: string
    techStack: TechGroup[]
    nav: NavItem[]
    sidebar: ResolvedSidebarItem[]
    include: string[]
    exclude: string[]
    base: string
  }
  const config: ResolvedBlogConfig
  export default config
}

declare module 'virtual:blog-posts' {
  interface Post {
    slug: string
    title: string
    date: string | null
    tags: string[]
    series: string | null
    rawContent: string
  }
  const posts: Post[]
  export default posts
}

declare module 'virtual:github-projects' {
  interface GithubProject {
    name: string
    description: string
    stars: number
    url: string
  }
  const projects: GithubProject[]
  export default projects
}

declare module 'virtual:blog-pages' {
  interface PageData {
    layout?: string
    [key: string]: unknown
  }
  const pages: Record<string, PageData[]>
  export default pages
}

declare module 'virtual:blog-entry' {
  // side-effect module
}
