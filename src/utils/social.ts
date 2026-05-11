export type SocialType =
  | 'github' | 'email' | 'twitter' | 'x'
  | 'bilibili' | 'youtube' | 'linkedin'
  | 'mastodon' | 'rss' | 'telegram' | 'discord' | 'website'

export interface SocialLink {
  type: SocialType
  url: string
  label?: string
}

export const SOCIAL_META: Record<SocialType, { icon: string; label: string }> = {
  github:   { icon: 'lucide:github',           label: 'GitHub'   },
  email:    { icon: 'lucide:mail',             label: 'Email'    },
  twitter:  { icon: 'simple-icons:twitter',    label: 'Twitter'  },
  x:        { icon: 'simple-icons:x',          label: 'X'        },
  bilibili: { icon: 'simple-icons:bilibili',   label: 'Bilibili' },
  youtube:  { icon: 'lucide:youtube',          label: 'YouTube'  },
  linkedin: { icon: 'simple-icons:linkedin',   label: 'LinkedIn' },
  mastodon: { icon: 'simple-icons:mastodon',   label: 'Mastodon' },
  rss:      { icon: 'lucide:rss',              label: 'RSS'      },
  telegram: { icon: 'simple-icons:telegram',   label: 'Telegram' },
  discord:  { icon: 'simple-icons:discord',    label: 'Discord'  },
  website:  { icon: 'lucide:globe',            label: 'Website'  },
}

export function getLinkHref(link: SocialLink): string {
  if (link.type === 'email' && !link.url.startsWith('mailto:')) {
    return `mailto:${link.url}`
  }
  return link.url
}

export function getLinkLabel(link: SocialLink): string {
  if (link.label) return link.label
  if (link.type === 'github') {
    return link.url.replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '')
  }
  if (link.type === 'email') return link.url
  return SOCIAL_META[link.type].label
}
