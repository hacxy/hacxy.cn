import type { TechGroup } from "./src/types/site";

const siteConfig = {
  author: "Hacxy",
  github: "hacxy",
  bio: "前端开发者，热衷于开源、工具链和 Web 应用构建，记录学习与思考。",
  email: "hacxy.js@outlook.com",
  bilibili: "https://space.bilibili.com/589367703",
  copyright: "CC BY-NC-SA 4.0 2024-PRESENT © Hacxy",
  projects: ["l2d", "skills"],
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
  ] as TechGroup[],
};

export default siteConfig;
