# AGENTS.md

Personal blog (hacxy.cn) — React 19 + Vite 8 + TypeScript. The blog framework lives in `src/`, not in a separate package.

## Commands

- `pnpm dev` — dev server
- `pnpm build` — production build (outputs `dist/`, also generates sitemap.xml and per-post SEO HTML)
- `pnpm lint` — ESLint on `src/`, `blog.config.ts`, `vite.config.ts`
- No typecheck or test scripts exist.

## Pre-commit (husky + lint-staged)

`pre-commit` runs `eslint --max-warnings=0` on staged `*.{ts,tsx}`. **Zero warnings tolerated** — any warning blocks the commit. Never use `eslint-disable` comments; fix the code or adjust `eslint.config.js`.

## Architecture

- **Entry**: `src/main.tsx` → `src/App.tsx` (React Router routes)
- **Blog framework**: `src/plugin/index.ts` — Vite plugin that provides virtual modules and generates static pages at build time
- **Config**: `blog.config.ts` at repo root, loaded at build time via esbuild. Uses `defineBlogConfig()` from `src/define.ts`
- **Content**: `content/` directory, markdown files with YAML frontmatter
- **Styles**: SCSS modules (`.module.scss`) co-located with components
- **Virtual modules**: `virtual:blog-config`, `virtual:blog-posts`, `virtual:blog-pages`, `virtual:github-projects` — declared in `virtual.d.ts`, resolved by the plugin

## Content structure

- `content/*.md` with `layout:` frontmatter → layout pages (home/posts/tags), not articles
- `content/**/*.md` without `layout:` → blog articles; route = file path relative to `content/`
- `content/*/index.md` → directory metadata (title/sort/exclude for sidebar), never rendered as articles
- Article frontmatter: `title`, `date`, `tags`, `summary`, `sort`
- Article date falls back to git commit date if not specified

## ESLint config

Flat config (`eslint.config.js`): typescript-eslint + @eslint-react + react-hooks. Key rules:
- `@eslint-react/no-array-index-key`: warn (never use array index as key)
- `@typescript-eslint/no-explicit-any`: warn
- `@typescript-eslint/no-unused-vars`: warn (prefix unused args with `_`)
- `@eslint-react/dom-no-dangerously-set-innerhtml`: off

## Deployment

CI (`ci.yml`): lint → build on push/PR to main.
Deploy (`deploy.yml`): build → SCP to server → swap dirs. Also runs daily at 02:00 UTC (for scheduled content).

## Conventions

- Package manager: pnpm (Node 22 in CI)
- `pnpm-workspace.yaml` exists but this is not a monorepo — it only configures `allowBuilds`
- Icons via `@iconify/react`; use icon names like `lucide:github`
- Animations via `motion` (Framer Motion successor)
- Markdown rendering: `react-markdown` + `remark-gfm` + `rehype-raw` + Shiki for code blocks
- GitHub project data fetched from `profile.hacxy.cn` API at build time
