export default [
  {
    slug: 'post-a',
    title: 'Post A',
    date: '2024-05-01',
    tags: ['react', 'css'],
    series: '系列一',
    rawContent:
      '# Post A\n\n这是一段足够长的正文内容，用于测试摘要提取与 markdown 渲染的完整流程，确保超过二十个字符的截取阈值。\n\n## 小标题\n\n代码示例：\n\n```ts\nconst a = 1\n```\n\n### 更小的标题\n\n已删除的内容。\n',
  },
  {
    slug: 'post-b',
    title: 'Post B',
    date: '2024-01-15',
    tags: ['react'],
    series: '系列一',
    rawContent: '# Post B\n\n第二篇。\n',
  },
  {
    slug: 'post-c',
    title: 'Post C',
    date: '2025-03-10',
    tags: ['node', 'react'],
    series: null,
    rawContent: '# Post C\n\n第三篇。\n',
  },
  {
    slug: 'post-d',
    title: 'Post D',
    date: null,
    tags: [],
    series: null,
    rawContent: '# Post D\n\n无日期无标签。\n',
  },
  {
    slug: 'post-e',
    title: 'Post E',
    date: '2025-03-10',
    tags: [],
    series: null,
    rawContent: '# Post E\n\n与 C 同一天。\n',
  },
] as const
