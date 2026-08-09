/** 站点基础信息（阶段 5 将扩展 siteUrl 等） */
export const siteName = 'Hacxy'
export const tagline = '了解真相，才能获得真正的自由'
/** 版权年份：静态常量，避免 SSR/客户端在跨年边界渲染不一致 */
export const copyrightYear = '2026'

export interface SocialLink {
  label: string
  href: string
}

/** 社交链接（关于页展示，外链新窗口打开） */
export const socialLinks: SocialLink[] = [{ label: 'GitHub', href: 'https://github.com/hacxy' }]

/** 联系方式（关于页展示） */
export const email = 'hello@hacxy.cn'
