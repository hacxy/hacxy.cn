import { defineConfig } from "vitepress";
import { defineThemeConfig } from "vitepress-theme-mild/config";

export default defineConfig({
  title: "Hacxy",
  description: "Hacxy's blog",
  lastUpdated: true,
  extends: defineThemeConfig({}),
  themeConfig: {
    outline: {
      level: [2, 4],
      label: "目录",
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
