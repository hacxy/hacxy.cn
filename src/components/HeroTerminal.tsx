import { Fragment, type CSSProperties, type ReactNode } from 'react'

/**
 * hero 终端（issue #13，PRD #8 hero 终端切片）：
 * 站点名下方展示数据驱动的命令流终端窗口，让读者第一眼认识作者与站点气质。
 *
 * 设计决策：
 * - 内容由「命令 + 输出 + 是否打字机」的数据结构驱动（TerminalCommand[]），
 *   文章数/标签数等由调用方从内容清单自动计算——新增文章/命令无需改渲染代码
 * - 打字机为纯 CSS 行为（clip-path + steps 逐字符揭示）：SSR 与客户端首帧都渲染
 *   完整 tagline 文本（预渲染 HTML 含全文、SEO 不回归、无 hydration mismatch），
 *   prefers-reduced-motion 时 media query 直接禁用动画显示完整文本，无 JS 报错
 * - 每行命令带 `$` 提示符；终端输出统一使用 --color-terminal 令牌
 *   （灰阶值，随亮暗主题切换）；行尾闪烁块状光标
 */

/** 终端命令数据：驱动 hero 终端逐行渲染（命令 + 输出 + 是否打字机） */
export interface TerminalCommand {
  /** 命令文本（渲染为 `$ <command>`） */
  command: string
  /** 命令输出：文本或含链接的节点（终端输出统一 text-terminal 绿） */
  output: ReactNode
  /** 打字机逐字输出（仅 tagline）：SSR 仍渲染完整文本，动画为纯 CSS */
  typewriter?: boolean
}

/** 打字机参数：等 hero 入场动画结束再开始；每字符耗时 */
const TYPE_DELAY = '0.45s'
const TYPE_SPEED = 0.13

/**
 * 打字机文本（纯 CSS）：完整文本始终在 DOM 中（基础态 clip-path 不裁切），
 * animation 期间用 steps(字符数) 逐字符揭示；reduced-motion 下 animation 禁用
 * → 直接显示完整文本。--type-chars / --type-duration / --type-delay 由文本长度驱动。
 */
function TypewriterText({ text }: { text: string }) {
  return (
    <span
      className="typewriter-text"
      style={
        {
          '--type-chars': text.length,
          '--type-duration': `${Math.max(text.length * TYPE_SPEED, 1.5)}s`,
          '--type-delay': TYPE_DELAY,
        } as CSSProperties
      }
    >
      {text}
      <span className="terminal-cursor" aria-hidden="true" />
    </span>
  )
}

/** hero 终端窗口：窗口栏（装饰圆点 + 标题）+ 数据驱动命令流 */
export default function HeroTerminal({ commands }: { commands: TerminalCommand[] }) {
  return (
    <div className="hero-terminal" role="group" aria-label="终端窗口">
      <div className="hero-terminal-bar">
        <span className="terminal-dot terminal-dot--red" aria-hidden="true" />
        <span className="terminal-dot terminal-dot--yellow" aria-hidden="true" />
        <span className="terminal-dot terminal-dot--green" aria-hidden="true" />
        <span className="hero-terminal-title">hacxy@hacxy.cn: ~</span>
      </div>
      <div className="hero-terminal-body">
        {commands.map(({ command, output, typewriter }) => (
          <Fragment key={command}>
            <div className="terminal-line">
              <span className="terminal-prompt" aria-hidden="true">
                $
              </span>
              <span>{command}</span>
            </div>
            <div className="terminal-line terminal-output">
              {typewriter && typeof output === 'string' ? <TypewriterText text={output} /> : output}
            </div>
          </Fragment>
        ))}
        {/* 空闲提示符：行尾闪烁光标，终端「就绪」状态 */}
        <div className="terminal-line">
          <span className="terminal-prompt" aria-hidden="true">
            $
          </span>
          <span className="terminal-cursor" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
