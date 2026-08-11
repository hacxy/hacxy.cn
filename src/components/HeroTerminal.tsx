import { type CSSProperties, type ReactNode } from 'react'
import siteMeta from 'virtual:site-meta'

import { formatGitStats } from '../statusBar.ts'
import { useTheme } from '../useTheme.ts'

/**
 * hero 终端（issue #18，父 PRD #16）：pi.dev 风格 AI agent 会话演出。
 *
 * 设计决策：
 * - 数据模型为「对话轮次」（TerminalTurn：❓ user 提问 / ▲ tool 工具调用 /
 *   assistant 回答），不再是「命令 + 输出」——文章数/标签数等仍由调用方从站点
 *   信息与内容清单自动计算，新增文章无需改渲染代码
 * - 终端框架（pi.dev 风格）：恒黑底白字（亮暗模式均如此，与页面 chrome 主题色
 *   解耦）、四角括号装饰（┌┐└┘）、底部 caption（● live 红点 + 弱化 mono 文字）；
 *   移除 mac 装饰圆点窗口栏（文章卡片行不沿用窗口栏形态，见 PostRow）
 * - 演出编排为纯 CSS：逐段入场（轮次按 --i * --turn-gap 依次错开）、tagline 打字机
 *   （clip-path + steps）、tool 块灰阶脉冲；自动播放一遍后停在最终态、不循环；
 *   live 红点除外——caption 精简为「● live」（去掉演出说明），红点以软脉冲无限
 *   循环（0.9s，opacity 1↔0.35，红色不变）；SSR 与客户端首帧都渲染完整对话文本
 *   （预渲染 HTML 含全文、SEO 不回归、无 hydration mismatch），
 *   prefers-reduced-motion 时 media query 整体禁用动画（含 live 点静止）、
 *   全文直接可见，无 JS 报错
 * - 底部 caption 扩展为终端状态栏（issue #42）：在「● live」基础上追加三段真实信息——
 *   站点版本（构建期注入 package.json version，v<version>）、当前主题（运行时状态，
 *   theme: light/dark，SSR 输出确定性值 + 水合后更新为实际主题，无 mismatch）、
 *   git 状态（构建期注入真实仓库统计 branch@sha · N commits，脏工作区分支后缀 *；
 *   git 不可得时该段优雅省略，构建与发布不受阻）
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

/** hero 终端（pi.dev 风格）：四角括号 + 会话轮次 + 底部状态栏 */
export default function HeroTerminal({ turns }: { turns: TerminalTurn[] }) {
  // 当前主题：SSR/水合首帧输出确定性值 'light'，水合后更新为实际主题（无 mismatch）
  const theme = useTheme()

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
      {/* 底部状态栏（issue #42）：● live · v<版本> · theme: <亮/暗> · git: <真实仓库统计>；
          git 不可得时该段省略（role=status：主题切换时读屏播报更新） */}
      <div className="hero-terminal-caption" role="status" aria-label="终端状态栏">
        <span className="live-dot" aria-hidden="true" />
        <span className="status-item">live</span>
        <span className="status-sep" aria-hidden="true">
          ·
        </span>
        {/* 站点版本：构建期注入 package.json version */}
        <span className="status-item" data-version={siteMeta.version}>
          v{siteMeta.version}
        </span>
        <span className="status-sep" aria-hidden="true">
          ·
        </span>
        {/* 当前主题：运行时状态（data-theme 供 e2e 断言） */}
        <span className="status-item" data-theme={theme}>
          theme: {theme}
        </span>
        {/* git 状态：构建期注入真实仓库统计；不可得时整段省略 */}
        {siteMeta.git && (
          <>
            <span className="status-sep" aria-hidden="true">
              ·
            </span>
            <span
              className="status-item"
              data-git-branch={siteMeta.git.branch}
              data-git-sha={siteMeta.git.sha}
              data-git-count={siteMeta.git.commitCount}
              data-git-dirty={String(siteMeta.git.dirty)}
            >
              git: {formatGitStats(siteMeta.git)}
            </span>
          </>
        )}
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
