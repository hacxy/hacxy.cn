declare module 'virtual:posts' {
  import type { Post } from './content/types.ts'

  const posts: Post[]
  export default posts
}

declare module 'virtual:site-meta' {
  import type { SiteMeta } from './siteMeta.ts'

  const meta: SiteMeta
  export default meta
}
