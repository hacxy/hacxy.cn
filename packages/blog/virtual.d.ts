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
  interface ResolvedBlogConfig {
    author: string
    title: string
    logo: string | LogoImage | null
    github: string
    bio: string
    email: string
    bilibili: string
    copyright: string
    projects: string[]
    techStack: TechGroup[]
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

declare module 'virtual:blog-home' {
  interface HomeData {
    title?: string
    name?: string
    bio?: string
    [key: string]: unknown
  }
  const homeData: HomeData | null
  export default homeData
}

declare module 'virtual:blog-entry' {
  // side-effect module
}
