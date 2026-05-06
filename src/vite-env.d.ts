/// <reference types="vite/client" />

declare module 'virtual:git-dates' {
  const dates: Record<string, string>
  export default dates
}

declare module 'virtual:github-projects' {
  const projects: Array<{
    name: string
    description: string
    stars: number
    url: string
  }>
  export default projects
}
