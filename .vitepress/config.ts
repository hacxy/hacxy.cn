import { DefaultTheme, defineConfigWithTheme, SiteConfig } from 'vitepress'
import {} from 'vite'
import UnoCSS from 'unocss/vite'
import { transformerTwoslash } from '@shikijs/vitepress-twoslash'
import path from 'node:path'
import { readFileSync } from 'node:fs'
import matter from 'gray-matter'
import { glob } from 'glob'
import dayjs from 'dayjs'
import { vitePluginForArco } from '@arco-plugins/vite-vue'
import { normalizePath } from './theme/utils/path'

export function getPageRoute(filepath: string, srcDir: string) {
  const route = path.normalize(path.relative(srcDir, filepath)).replace(/\.md$/, '')
  return `/${route}`
}

export function getTextDescription(text: string, count = 100) {
  const finalText = text
    // 首个标题
    ?.replace(/^(#+)(.*)/m, '')
    // 除去标题
    ?.replace(/#/g, '')
    // 除去图片
    ?.replace(/!\[.*?\]\(.*?\)/g, '')
    // 除去链接
    ?.replace(/\[(.*?)\]\(.*?\)/g, '$1')
    // 除去加粗
    ?.replace(/\*\*(.*?)\*\*/g, '$1')
    ?.split('\n')
    ?.filter((v) => !!v)
    ?.join('\n')
    ?.replace(/>(.*)/, '')
    ?.replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    ?.trim()
    ?.slice(0, count)
  if (finalText) {
    return `${finalText}...`
  } else return ''
}

export async function getArticles(vpConfig: SiteConfig) {
  const srcDir = vpConfig.srcDir.replace(vpConfig.root, '').replace(/^\//, '') || process.argv.slice(2)?.[1] || '.'
  const rootPath = normalizePath(path.resolve(vpConfig.srcDir))
  const files = glob.sync(`${rootPath}/**/*.md`, {
    ignore: ['node_modules/**', 'changelog.md', 'README.md'],
    absolute: true
  })
  const articleData = files.map((item) => {
    const fileContent = readFileSync(item, { encoding: 'utf8' })
    const match = fileContent.match(/^(#+)\s+(.+)/m)
    const title = match?.[2] || ''
    const content = matter(fileContent).content

    const frontmatter = matter(fileContent).data
    const date = dayjs(frontmatter.date).format('YYYY-MM-DD')
    const data = {
      ...frontmatter,
      date
    }

    return {
      title,
      path: getPageRoute(item, srcDir),
      description: getTextDescription(content),
      ...data
    }
  })

  return articleData.filter((item: any) => item.aside !== false)
}

//每页的文章数量
// const pageSize = 10
export interface ThemeConfig extends DefaultTheme.Config {
  // posts: any
  website: string
}

export default defineConfigWithTheme<ThemeConfig>({
  title: 'Hacxy blog',
  base: '/',
  cacheDir: './node_modules/vitepress_cache',
  description: 'vitepress,blog,blog-theme',
  ignoreDeadLinks: true,
  sitemap: {
    hostname: 'https://hacxy.cn'
  },
  extends: {
    vite: {
      plugins: [
        UnoCSS(),
        vitePluginForArco({
          style: 'css'
        }),
        {
          name: 'vitepress-plugin-article',
          config: async (cfg: any) => {
            cfg.vitepress.site.themeConfig.pagesData = await getArticles(cfg.vitepress)
          }
        }
      ]
    }
  },
  markdown: {
    codeTransformers: [transformerTwoslash()]
  },
  themeConfig: {
    logo: 'public/logo.png',
    // posts: await getPosts(pageSize),
    website: 'https://github.com/hacxy', //copyright link
    // 评论的仓库地址
    // comment: {
    //     repo: 'hacxy/blog',
    //     themes: 'github-light',
    //     issueTerm: 'pathname'
    // },
    nav: [
      { text: 'Home', link: '/' },
      // { text: 'Category', link: '/pages/category' },
      { text: 'Archives', link: '/pages/archives' },
      { text: 'Tags', link: '/pages/tags' }
      // { text: 'About', link: '/pages/about' }
      // { text: 'Airene', link: 'http://airene.net' }  -- External link test
    ],
    search: {
      provider: 'local'
    },
    outline: {
      label: '文章摘要'
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/hacxy' }]
  },
  srcExclude: ['README.md'] // exclude the README.md , needn't to compiler

  /*
      optimizeDeps: {
          keepNames: true
      }
      */
})
