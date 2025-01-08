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
