import { defineConfigWithTheme } from "vitepress";
import baseConfig from "vitepress-theme-mild/config";
import type { ThemeConfig } from "vitepress-theme-mild";

export default defineConfigWithTheme<ThemeConfig>({
  title: "Hacxy's blog",
  description: "Hacxy's blog",
  lastUpdated: true,
  lang: "zh",
  extends: baseConfig,
  ignoreDeadLinks: true,
  themeConfig: {
    comment: {
      repo: "hacxy/hacxy.cn",
      repoId: "R_kgDONKDzuw",
      category: "Announcements",
      categoryId: "DIC_kwDONKDzu84Cj_Jz",
      mapping: "title",
      darkTheme: "catppuccin_macchiato",
      lightTheme: "catppuccin_latte",
      strict: "1",
      reactionsEnabled: "1",
      lang: "zh-CN",
    },
    rss: {
      title: "Hacxy",
      baseUrl: "https://hacxy.cn",
      copyright: "Copyright (c) 2024-present, Hacxy",
    },
    search: {
      provider: "local",
      options: {
        detailedView: true,
        translations: {
          button: {
            buttonText: "搜索一下",
          },
        },
      },
    },
    logo: "/cat-typing.gif",
    outline: {
      level: [2, 4],
      label: "目录",
    },
    sidebar: {
      "/docs/posts/dev-vitepress-theme/": "auto",
      "/docs/posts/macos-dev": "auto",
      "/docs/posts/vscode-vim": "auto",
      "/docs/posts/neovim-astronvim": "auto"
    },
    nav: [
      { text: "Blog", link: "/" },
      { text: "Tags", link: "/docs/pages/tags" },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/hacxy" }],
    footer: {
      copyright:
        'MIT Licensed | Copyright © 2023-Present <a href="https://github.com/hacxy">Hacxy</a>',
    },
  },
});
