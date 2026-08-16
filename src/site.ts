export const siteName = 'Hacxy'
export const tagline = '了解真相，才能获得真正的自由'
/** hero 终端「你是谁」轮次的回答 */
export const authorBio = '前端工程师 · 关注 Web 生态与工程化'
/** 站点绝对地址（canonical / OG / sitemap / RSS 共用） */
export const siteUrl = 'https://hacxy.cn'
/** 版权年份：静态常量，避免 SSR/客户端在跨年边界渲染不一致 */
export const copyrightYear = '2026'

/** GitHub 地址（导航与关于页共用） */
export const githubUrl = 'https://github.com/hacxy'

export interface SocialLink {
  label: string
  href: string
}

/** 关于页社交链接 */
export const socialLinks: SocialLink[] = [{ label: 'GitHub', href: githubUrl }]

export const email = 'hello@hacxy.cn'
