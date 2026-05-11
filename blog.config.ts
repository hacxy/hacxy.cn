import { defineBlogConfig } from "./src/define";

export default defineBlogConfig({
  contentDir: "content",
  title: "Hacxy's Blog",
  author: "Hacxy",
  siteUrl: "https://hacxy.cn",
  bio: "了解真相，才能获得真正的自由",
  copyright: "2024-PRESENT © Hacxy",
  nav: [
    { text: "Blog", link: "/posts" },
    { text: "Tags", link: "/tags" },
    { text: "About", link: "/about" },
    { icon: "lucide:github", link: "https://github.com/hacxy" },
  ],
  techStack: [
    {
      category: "框架",
      items: [
        { name: "React", icon: "logos:react" },
        { name: "Vue", icon: "logos:vue" },
        { name: "Elysia", icon: "skill-icons:elysia-dark" },
        { name: "Nitro", icon: "unjs:nitro", color: "#FB848E" },
        { name: "Koa", icon: "simple-icons:koa" },
      ],
    },
    {
      category: "工具链",
      items: [{ name: "Vite", icon: "logos:vitejs" }],
    },
    {
      category: "编辑器",
      items: [
        { name: "VS Code", icon: "logos:visual-studio-code" },
        { name: "Neovim", icon: "skill-icons:neovim-light" },
      ],
    },
    {
      category: "AI",
      items: [
        {
          name: "Claude Code",
          icon: "simple-icons:anthropic",
          color: "#D97757",
        },
        { name: "Cursor", icon: "simple-icons:cursor", color: "#6B6B6B" },
      ],
    },
  ],
});
