declare module 'virtual:posts' {
  import type { Post } from './content/types.ts'

  const posts: Post[]
  export default posts
}
