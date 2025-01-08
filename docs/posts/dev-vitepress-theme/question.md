---
category: vitepress主题开发日记
tags:
  - vitepress
sidebar:
  order: 9

description: 记录了vitepress中如何获取文章列表
---

# 文章列表

本文记录了我是如何在开发主题时, 获取文章列表的.

一开始我直接使用了 vitepress 官方文档推荐的方式, 也就是在 [构建时数据加载-createContentLoader](https://vitepress.dev/zh/guide/data-loading#createcontentloader) 这一章, 调用了`createContentLoader` 方法, 但不能完全满足我的需求, 我还需要获取每个文章上次 git 提交的时间, 如果没有使用 git, 则使用上次编辑的时间来兜底.

所以我干脆自己封装了一个`loader`方法, 与 vitepress 提供的方法功能类似, 但比它更丰富:

```ts
import path from "node:path";
import fs from "fs-extra";
import matter from "gray-matter";
import { glob, type GlobOptions } from "tinyglobby";
import { createMarkdownRenderer, type SiteConfig } from "vitepress";
import { dateToUnixTimestamp } from "./date";
import { getLastCommitInfo } from "./git";
import { getPattern, normalizePath } from "./path";

export interface ContentData {
  url: string;
  src: string | undefined;
  html: string | undefined;
  frontmatter: Record<string, any>;
  excerpt: string | undefined;
  // fileModifiedTime: number
}
export interface ContentOptions<T = ContentData[]> {
  /**
   * Include src?
   * @default false
   */
  includeSrc?: boolean;

  /**
   * Render src to HTML and include in data?
   * @default false
   */
  render?: boolean;

  /**
   * If `boolean`, whether to parse and include excerpt? (rendered as HTML)
   *
   * If `function`, control how the excerpt is extracted from the content.
   *
   * If `string`, define a custom separator to be used for extracting the
   * excerpt. Default separator is `---` if `excerpt` is `true`.
   *
   * @see https://github.com/jonschlinkert/gray-matter#optionsexcerpt
   * @see https://github.com/jonschlinkert/gray-matter#optionsexcerpt_separator
   *
   * @default false
   */
  excerpt?:
    | boolean
    | ((
        file: {
          data: { [key: string]: any };
          content: string;
          excerpt?: string;
        },
        options?: any
      ) => void)
    | string;

  /**
   * Transform the data. Note the data will be inlined as JSON in the client
   * bundle if imported from components or markdown files.
   */
  transform?: (data: ContentData[]) => T | Promise<T>;

  /**
   * Options to pass to `tinyglobby`.
   * You'll need to manually specify `node_modules` and `dist` in
   * `globOptions.ignore` if you've overridden it.
   */
  globOptions?: GlobOptions;
}

export function createArticlesListLoader<T = ContentData[]>({
  includeSrc,
  render,
  excerpt: renderExcerpt,
  transform,
}: ContentOptions<T> = {}): {
  watch: string | string[];
  load: () => Promise<T>;
} {
  const config: SiteConfig = (global as any).VITEPRESS_CONFIG;

  if (!config) {
    throw new Error(
      "content loader invoked without an active vitepress process, " +
        "or before vitepress config is resolved."
    );
  }
  const pattern = getPattern(config.srcDir);
  const cache = new Map<string, { data: any; timestamp: number }>();

  return {
    watch: pattern,
    async load(files?: string[]) {
      files = await glob(pattern, {
        ignore: ["**/node_modules/**", "**/dist/**", "**/README.md"],
        expandDirectories: false,
        absolute: true,
      });
      const md = await createMarkdownRenderer(
        config.srcDir,
        config.markdown,
        config.site.base,
        config.logger
      );
      const raw: ContentData[] = [];
      for (const file of files) {
        if (!file.endsWith(".md")) {
          continue;
        }
        const timestamp = fs.statSync(file).mtimeMs;
        const cached = cache.get(file);
        if (cached && timestamp === cached.timestamp) {
          raw.push(cached.data);
        } else {
          const src = fs.readFileSync(file, "utf-8");
          const { data: frontmatter, excerpt } = matter(
            src,
            typeof renderExcerpt === "string"
              ? // eslint-disable-next-line camelcase
                { excerpt_separator: renderExcerpt as any }
              : { excerpt: renderExcerpt as any }
          );

          if (frontmatter.date) {
            frontmatter.date = dateToUnixTimestamp(frontmatter.date);
          } else {
            const lastCommitInfo = await getLastCommitInfo(
              path.relative(config.srcDir, file)
            );
            const lastCommitDate = lastCommitInfo?.date
              ? dateToUnixTimestamp(new Date(lastCommitInfo.date))
              : null;
            frontmatter.date = lastCommitDate || timestamp;
          }

          if (
            typeof frontmatter.sticky === "boolean" ||
            typeof frontmatter.sticky === "number"
          ) {
            frontmatter.sticky = Number(frontmatter.sticky);
          } else {
            frontmatter.sticky = 0;
          }

          if (typeof frontmatter.order !== "number") {
            frontmatter.order = 0;
          }
          const url = `/${normalizePath(path.relative(config.srcDir, file))
            .replace(/(^|\/)index\.md$/, "$1")
            .replace(/\.md$/, config.cleanUrls ? "" : ".html")}`;

          const html = render ? md.render(src) : undefined;
          // const fileModifiedTime = timestamp;
          const renderedExcerpt = renderExcerpt
            ? excerpt && md.render(excerpt)
            : undefined;
          const data: ContentData = {
            // fileModifiedTime,

            src: includeSrc ? src : undefined,
            html,
            frontmatter,
            excerpt: renderedExcerpt,
            url,
          };
          cache.set(file, { data, timestamp });
          raw.push(data);
        }
      }
      return (transform ? transform(raw) : raw) as any;
    },
  };
}
```

之后在 data 中可以这样调用:

```ts
import matter from "gray-matter";
import { readingTime } from "reading-time-estimator";
import { NOT_ARTICLE_LAYOUTS } from "../constants";
import { getTextDescription } from "../utils/common";
import { createArticlesListLoader } from "../utils/node/articles";

export interface SidebarFrontmatter {
  text?: string;
  collapsed?: boolean;
  order?: number;
  title?: string;
  hide?: boolean;
}

export interface ArticlesData {
  title: string;
  path: string;
  description: string;
  date: number;
  tags: string[];
  words: number;
  minutes: number;
  category: string;
  order: number;
  sidebar: boolean | SidebarFrontmatter;
}

export default createArticlesListLoader({
  includeSrc: true,
  render: true,
  excerpt: true,
  transform(rawData) {
    const data = rawData
      .filter((item) => !NOT_ARTICLE_LAYOUTS.includes(item.frontmatter.layout))
      .sort((a, b) => {
        if (a.frontmatter.sticky !== b.frontmatter.sticky) {
          return b.frontmatter.sticky - a.frontmatter.sticky;
        }
        return b.frontmatter.date - a.frontmatter.date;
      })
      .map((item) => {
        const filename =
          item.url.split("/")[item.url.split("/").length - 1].split(".")[0] ||
          "index";
        const content = matter(item.src || "").content;
        const { words, minutes } = readingTime(content, 200);
        const match = content.match(/^(#+)\s+(.+)/m);
        const title = match?.[2] || filename;
        let { date, description = content, ...frontmatter } = item.frontmatter;

        description = getTextDescription(description);
        return {
          path: item.url,
          description,
          title,
          words,
          minutes,
          date,
          ...frontmatter,
        };
      });
    return data;
  },
});

declare const data: ArticlesData[];
export { data };
```
