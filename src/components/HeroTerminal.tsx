import { type CSSProperties, type ReactNode } from 'react'

/**
 * hero 终端（issue #18，父 PRD #16）：pi.dev 风格 AI agent 会话演出。
 *
 * 设计决策：
 * - 数据模型为「对话轮次」（TerminalTurn：❓ user 提问 / ▲ tool 工具调用 /
 *   assistant 回答），不再是「命令 + 输出」——文章数/标签数等仍由调用方从站点
 *   信息与内容清单自动计算，新增文章无需改渲染代码
 * - 终端框架（pi.dev 风格）：恒黑底白字（亮暗模式均如此，与页面 chrome 主题色
 *   解耦）、四角括号装饰（┌┐└┘）、底部 caption（● live 红点 + 弱化 mono 文字）；
 *   移除 mac 装饰圆点窗口栏（PostCard 的 ●●● 标题栏不受影响，复用 terminal-dot）
 * - 演出编排为纯 CSS：逐段入场（轮次按 --i * --turn-gap 依次错开）、tagline 打字机
 *   （clip-path + steps）、tool 块灰阶脉冲、live 点脉冲；全部自动播放一遍后停在
 *   最终态、不循环；SSR 与客户端首帧都渲染完整对话文本（预渲染 HTML 含全文、
 *   SEO 不回归、无 hydration mismatch），prefers-reduced-motion 时 media query
 *   整体禁用动画、全文直接可见，无 JS 报错
 */

/** 打字机参数：每字符耗时（总时长由文本长度驱动） */
const TYPE_SPEED = 0.13

/** 对话轮次：驱动 hero 终端渲染（❓ user 提问 / ▲ tool 工具调用 / assistant 回答） */
export type TerminalTurn =
  | { role: 'user'; text: string }
  | { role: 'tool'; call: string }
  | {
      role: 'assistant'
      /** 回答行序列：文本或任意节点（如外链）；typewriter 仅对纯文本行生效 */
      lines: { text: ReactNode; typewriter?: boolean }[]
    }

/**
 * 打字机文本（纯 CSS）：完整文本始终在 DOM 中（基础态 clip-path 不裁切），
 * animation 期间用 steps(字符数) 逐字符揭示；reduced-motion 下 animation 禁用
 * → 直接显示完整文本。--type-chars / --type-duration 由文本长度驱动；
 * 延迟由所在轮次（--i）与演出节奏（--turn-gap）经 CSS calc 计算。
 */
function TypewriterText({ text }: { text: string }) {
  return (
    <span
      className="typewriter-text"
      style={
        {
          '--type-chars': text.length,
          '--type-duration': `${Math.max(text.length * TYPE_SPEED, 1.5)}s`,
        } as CSSProperties
      }
    >
      {text}
      <span className="terminal-cursor" aria-hidden="true" />
    </span>
  )
}

/** 单轮渲染：user（❓ 加粗）/ tool（▲ 缩进 mono 脉冲）/ assistant（回答行） */
function TurnRow({ turn, index }: { turn: TerminalTurn; index: number }) {
  // 轮次序号：CSS 演出编排参数（入场错开 / 打字机与脉冲延迟由 calc(var(--i) …) 计算）
  const style = { '--i': index } as CSSProperties

  if (turn.role === 'user') {
    return (
      <div className="hero-turn hero-turn--user" style={style}>
        <span className="user-question">
          <span className="turn-mark" aria-hidden="true">
            ❓
          </span>
          {turn.text}
        </span>
      </div>
    )
  }

  if (turn.role === 'tool') {
    return (
      <div className="hero-turn hero-turn--tool" style={style}>
        <span className="tool-call">
          <span aria-hidden="true">▲</span> tool: {turn.call}
        </span>
      </div>
    )
  }

  return (
    <div className="hero-turn hero-turn--answer" style={style}>
      {turn.lines.map((line, i) => (
        <div className="hero-line" key={i}>
          {line.typewriter && typeof line.text === 'string' ? (
            <TypewriterText text={line.text} />
          ) : (
            line.text
          )}
        </div>
      ))}
    </div>
  )
}

/** hero 终端（pi.dev 风格）：四角括号 + 会话轮次 + 底部 live caption */
export default function HeroTerminal({ turns }: { turns: TerminalTurn[] }) {
  return (
    <div className="hero-terminal" role="group" aria-label="AI 会话演出">
      {/* 四角括号装饰（┌ ┐ └ ┘，绝对定位不占文档流，不进可访问性树） */}
      <span className="hero-terminal-corner hero-terminal-corner--tl" aria-hidden="true">
        ┌
      </span>
      <span className="hero-terminal-corner hero-terminal-corner--tr" aria-hidden="true">
        ┐
      </span>
      <div className="hero-terminal-scroll">
        <div className="hero-terminal-body">
          {turns.map((turn, i) => (
            <TurnRow key={i} turn={turn} index={i} />
          ))}
        </div>
      </div>
      {/* 底部 caption：● live 红点 + 弱化 mono 文字（live 状态与演出说明） */}
      <div className="hero-terminal-caption">
        <span className="live-dot" aria-hidden="true" />
        <span>live · AI 会话演出 · 自动播放一遍后停驻</span>
      </div>
      <span className="hero-terminal-corner hero-terminal-corner--bl" aria-hidden="true">
        └
      </span>
      <span className="hero-terminal-corner hero-terminal-corner--br" aria-hidden="true">
        ┘
      </span>
    </div>
  )
}
