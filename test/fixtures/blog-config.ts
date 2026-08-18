export default {
  author: 'Hacxy',
  title: 'Test Blog',
  logo: null,
  bio: '测试博客描述',
  copyright: '2024-PRESENT © Hacxy',
  techStack: [
    {
      category: '框架',
      items: [{ name: 'React', icon: 'logos:react', url: 'https://react.dev' }],
    },
  ],
  nav: [
    { text: 'Posts', link: '/posts' },
    { icon: 'lucide:github', link: 'https://github.com/hacxy' },
  ],
  sidebar: [{ text: '系列一', link: '/posts/series-1' }, { text: '无链接项' }],
  include: ['**/*.md'],
  exclude: [],
  base: '/',
}
