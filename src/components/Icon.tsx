interface IconProps {
  /** public/icons.svg 中的 symbol id */
  name: string
  size?: number
}

/**
 * 图标：复用 public/icons.svg 精灵（<use> 外部引用 symbol）。
 * symbol 内统一用 currentColor 上色——继承所在链接的强调色（text-accent），
 * 随亮暗主题自动切换；装饰性图标对屏幕阅读器隐藏（aria-hidden）。
 */
export default function Icon({ name, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} aria-hidden="true" focusable="false">
      <use href={`/icons.svg#${name}`} />
    </svg>
  )
}
