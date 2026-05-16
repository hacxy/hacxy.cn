import { defineBlogConfig } from "./src/define";

export default defineBlogConfig({
  contentDir: "content",
  title: "Hacxy's Blog",
  author: "Hacxy",
  siteUrl: "https://hacxy.cn",
  bio: "了解真相，才能获得真正的自由",
  copyright: "2024-PRESENT © Hacxy",
  nav: [
    { text: "Posts", link: "/posts" },
    { text: "About", link: "/about" },
    { text: "Skills", link: "/skills" },
    { icon: "lucide:github", link: "https://github.com/hacxy" },
  ],
  techStack: [
    {
      category: "框架",
      items: [
        { name: "React", icon: "logos:react", url: "https://react.dev" },
        { name: "Vue", icon: "logos:vue", url: "https://vuejs.org" },
        { name: "Elysia", icon: "skill-icons:elysia-dark", url: "https://elysiajs.com" },
        { name: "Nitro", icon: "unjs:nitro", color: "#FB848E", url: "https://nitro.build" },
        { name: "Koa", icon: "simple-icons:koa", url: "https://koajs.com" },
        { name: "NestJS", icon: "logos:nestjs", url: "https://nestjs.com" },
        { name: "uni-app", icon: "simple-icons:uniapp", color: "#2B9939", url: "https://uniapp.dcloud.net.cn" },
        { name: "Taro", icon: "simple-icons:taro", color: "#0000E6", url: "https://taro.jd.com" },
      ],
    },
    {
      category: "工具链",
      items: [
        { name: "Vite", icon: "logos:vitejs", url: "https://vite.dev" },
        { name: "Webpack", icon: "logos:webpack", url: "https://webpack.js.org" },
        { name: "esbuild", icon: "logos:esbuild", url: "https://esbuild.github.io" },
        { name: "Prisma", icon: "logos:prisma", url: "https://www.prisma.io" },
      ],
    },
    {
      category: "语言与运行时",
      items: [
        { name: "TypeScript", icon: "logos:typescript-icon", url: "https://www.typescriptlang.org" },
        { name: "Node.js", icon: "logos:nodejs-icon", url: "https://nodejs.org" },
        { name: "Linux", icon: "logos:linux-tux", url: "https://kernel.org" },
      ],
    },
    {
      category: "编辑器",
      items: [
        { name: "VS Code", icon: "logos:visual-studio-code", url: "https://code.visualstudio.com" },
        { name: "Neovim", icon: "skill-icons:neovim-light", url: "https://neovim.io" },
      ],
    },
    {
      category: "AI",
      items: [
        {
          name: "Claude Code",
          icon: "simple-icons:anthropic",
          color: "#D97757",
          url: "https://docs.anthropic.com/en/docs/claude-code/overview",
        },
        { name: "Cursor", icon: "simple-icons:cursor", color: "#6B6B6B", url: "https://cursor.com" },
      ],
    },
  ],
});
