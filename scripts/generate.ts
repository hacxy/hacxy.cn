import { Client } from '@notionhq/client'
import { rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { NotionToMarkdown } from 'notion-to-md'
import { fileURLToPath } from 'url'
import dayjs from 'dayjs'
import { ensureDirSync } from 'fs-extra'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const postsPath = path.resolve(__dirname, '../posts')
rmSync(postsPath, {
  force: true,
  recursive: true
})
ensureDirSync(postsPath)

const notion = new Client({
  auth: process.env.NOTION_TOKEN
})

const n2m = new NotionToMarkdown({
  notionClient: notion,
  config: {
    separateChildPage: true // default: false
  }
})

const handleTags = (tags) => {
  if (!tags || !tags?.length) return ''
  let frontmatterTag = 'tags: \n'
  tags.map((item) => {
    frontmatterTag += `- ${item.name}\n`
  })

  return frontmatterTag
}

const generateNotion = async () => {
  const database = await notion.databases.query({
    database_id: process.env.DATABASE_ID!
  })

  for await (const item of database.results as any) {
    let title = ''
    const fileName = `${item.id.replaceAll('-', '')}.md`
    for (const t of item.properties.title.title) {
      title += t.plain_text
    }
    const tags = handleTags(item.properties.tags.multi_select)
    const last_edited_time = dayjs(item.last_edited_time.last_edited_time).format('YYYY-MM-DD HH:mm:ss')
    const mdblocks = await n2m.pageToMarkdown(item.id)
    const mdString = n2m.toMarkdownString(mdblocks)

    const frontmatter = `---\ntitle: ${title}\ndate: ${last_edited_time}\n${tags}\n---\n`
    const content = `${frontmatter}# ${title}\n${mdString.parent}`

    // 处理链接
    let reg = /\[([^\]]+)\]\(([^\)]+)\)/g
    let finalContent = content.replace(reg, function (match, p1, p2) {
      if (!p2.startsWith('https://') && p2.startsWith('/')) {
        p2 = '.' + p2
      }
      return `[${p1}](${p2})`
    })

    writeFileSync(path.resolve(postsPath, fileName), finalContent)
    console.log(`文章:《${title}》生成成功`)
  }
}

await generateNotion()
