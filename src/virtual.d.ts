declare module 'virtual:posts' {
  import type { DirConfigMap } from './content/dirConfig.ts'
  import type { Post } from './content/types.ts'

  interface PostsManifest {
    posts: Post[]
    dirConfigs: DirConfigMap
  }

  const manifest: PostsManifest
  export default manifest
}

declare module 'virtual:site-meta' {
  import type { SiteMeta } from './siteMeta.ts'

  const meta: SiteMeta
  export default meta
}
