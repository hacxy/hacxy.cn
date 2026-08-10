/** 站点基础信息 */
export const siteName = 'Hacxy'
export const tagline = '了解真相，才能获得真正的自由'
/** 站点绝对地址（canonical / OG / sitemap / RSS 共用） */
export const siteUrl = 'https://hacxy.cn'
/** 版权年份：静态常量，避免 SSR/客户端在跨年边界渲染不一致 */
export const copyrightYear = '2026'

/** 作者 GitHub 地址（导航图标链接与关于页社交链接共用同一来源） */
export const githubUrl = 'https://github.com/hacxy'

export interface SocialLink {
  label: string
  href: string
}

/** 社交链接（关于页展示，外链新窗口打开） */
export const socialLinks: SocialLink[] = [{ label: 'GitHub', href: githubUrl }]

/** 联系方式（关于页展示） */
export const email = 'hello@hacxy.cn'
