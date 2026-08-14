import { type CSSProperties, type ReactNode } from 'react'
import siteMeta from 'virtual:site-meta'

/**
 * hero 终端（issue #40，父 PRD #16）：真实 AI 编码 agent 会话演出（pi 风格）。
 *
 * 结构（自上而下）：会话 transcript → 输入区 → 状态栏。
 * 终端框架恒黑底白字（亮暗模式均如此，与页面 chrome 主题色解耦）、四角括号
 * 装饰（┌┐└┘，不占文档流、不进可访问性树）。
 *
 * 每轮演出（全部数据驱动）：输入框自动逐字符打字输入问题 → 发送（问题进入
 * transcript 成为用户行、输入框清空）→ Thinking… → Done. → 回答。
 * 演出播放一遍后停驻最终态（不循环）：输入框为空、常亮光标停驻（issue #63：
 * 输入光标演出全程常亮显示、不闪烁）。
 *
 * 设计决策：
 * - 数据模型为「轮次」（TerminalTurn：question + lines），不再区分
 *   user/tool/assistant 角色行——问题经输入框演出后进入 transcript，输出行为
 *   状态行（Thinking…/Done.，真实 agent 会话质感）与回答行（文本或任意节点，
 *   如 GitHub 外链）。文章数/标签数仍由调用方从站点信息与内容清单自动计算，
 *   新增文章/新增轮次无需改渲染代码
 * - 演出编排为行级纯 CSS 动画：每条行与输入框打字各带 --delay（组件按数据
 *   计算：字符数 × 打字速度 + 节奏参数，确定性输出，SSR 与水合一致），
 *   动画本身延续既有纯 CSS 机制——打字机 = clip-path + steps(字符数) 逐字符
 *   揭示；输入框打字 = 同一机制扩展到输入框内（input-type），发送时以 opacity
 *   淡出清空（input-hide，与问题进入 transcript 同一时刻，两条动画作用于不同
 *   属性互不干扰）；Thinking… 状态行带灰阶脉冲（3 次后停驻）；回答行淡入，
 *   行内 typewriter 行逐字符揭示
 * - 输入区：三轮问题各一个 .terminal-typed（绝对定位叠放于同一槽位，clip 动画
 *   使同一时刻仅当前轮文本可见）；输入光标常亮不闪烁（issue #63：随打字逐字符
 *   右移，--delay-cursor 控制出现——首轮即刻、其后每轮在上轮发送清空后，演出
 *   全程输入框内光标常驻）；停驻光标 .terminal-input-cursor 在末轮发送后出现
 *   （常亮停驻，不闪烁）；reduced-motion 时输入框全文直接可见
 *   （问题行内排布、不重叠），全部动画禁用
 * - 预渲染 HTML 含演出全文（输入框文本 + Thinking…/Done. + 回答 + 状态栏），
 *   爬虫不执行 JS 可读，无 hydration mismatch
 * - 状态栏（issue #55 精简）：● live（红点软脉冲无限循环）+ 文章数 · 标签数
 *   （构建期自动计算）+ 版本号（构建期注入 package.json）；role=status 语义
 *   保留（内容更新仍可被读屏播报）。issue #42 的 theme / git 两段环境噪声已移除
 */

/** 打字机参数：每字符耗时（总时长由文本长度驱动） */
const TYPE_SPEED = 0.13
/** 打字最短时长（输入框打字与行内揭示共用下限，issue #18 行为延续） */
const MIN_TYPE = 1.5

/** 演出节奏参数（秒） */
const INPUT_IN = 0.25 // 输入区开始打字的延迟（hero 入场后）
const SEND_PAUSE = 0.35 // 打字完成到发送的停顿
const THINK_IN = 0.3 // 发送后 Thinking… 出现的延迟
const THINK_DUR = 0.9 // Thinking… 持续到 Done.（与状态行脉冲 3 × 0.3s 同周期）
const ANSWER_IN = 0.2 // Done. 到第一条回答的间隔
const ANSWER_GAP = 0.25 // 回答行之间错开
const LINE_IN = 0.3 // 行淡入时长
const PARK_IN = 0.25 // 停驻光标在末轮发送后的出现延迟
/** 输入框发送清空时长（与 CSS input-hide 0.2s 保持一致，issue #63：下一轮输入光标
 *  在上一轮发送清空完成后立即出现，演出全程输入框内光标常驻） */
const INPUT_HIDE = 0.2

/** 终端输出行：agent 状态行（Thinking…/Done.）或回答行（文本或任意节点） */
export type TerminalLine =
  { status: 'thinking' | 'done'; text: string } | { text: ReactNode; typewriter?: boolean }

/** 对话轮次：输入框打字的 question + 发送后依次揭示的输出行 */
export interface TerminalTurn {
  /** 输入框逐字符打字的问题；发送后作为用户行进入 transcript */
  question: string
  /** 发送后依次揭示的输出行（状态行/回答行，新增内容只需追加数据） */
  lines: TerminalLine[]
}

/** 状态栏真实信息（文章数 · 标签数，调用方从内容清单构建期自动计算） */
export interface SiteStats {
  postCount: number
  tagCount: number
}

/** 单轮时刻表：输入框打字窗口 / 发送时刻 / 各输出行揭示时刻 */
export interface TurnTiming {
  /** 输入框逐字符打字起始 */
  typeStart: number
  /** 打字时长（由问题字符数驱动） */
  typeDuration: number
  /** 发送时刻（问题进入 transcript + 输入框清空） */
  sendTime: number
  /** 各输出行揭示时刻（与 turn.lines 一一对应） */
  lineTimes: number[]
}

/** 整场演出时刻表（数据驱动编排，确定性输出 → SSR/水合一致） */
export interface TerminalTimeline {
  rounds: TurnTiming[]
  /** 演出总时长（末轮最后一行揭示完成） */
  showEnd: number
  /** 停驻光标出现时刻（末轮发送后，输入框清空） */
  parkedDelay: number
}

function isStatus(line: TerminalLine): line is { status: 'thinking' | 'done'; text: string } {
  return 'status' in line
}

/** 行揭示时长：状态行/普通回答淡入，typewriter 行按字符数（含最短下限） */
function lineDuration(line: TerminalLine): number {
  if (isStatus(line)) return LINE_IN
  return line.typewriter && typeof line.text === 'string'
    ? Math.max(line.text.length * TYPE_SPEED, MIN_TYPE)
    : LINE_IN
}

/** 输入框打字时长：按问题字符数（含最短下限） */
function typeDuration(question: string): number {
  return Math.max(question.length * TYPE_SPEED, MIN_TYPE)
}

/**
 * 由轮次数据计算整场演出时刻表（纯函数，无副作用）：
 * 轮次严格串行——roundTotal = 最长一轮的总时长，第 r 轮打字起点 =
 * r × roundTotal + INPUT_IN，发送 = 打字完成 + SEND_PAUSE，
 * 输出行 = 发送后 Thinking… → Done. → 回答（各按节奏参数错开）。
 */
export function computeTurnTimings(turns: TerminalTurn[]): TerminalTimeline {
  const roundSpans = turns.map((turn) => {
    const statuses = turn.lines.filter(isStatus).length
    const answers = turn.lines.filter((line) => !isStatus(line))
    const thinkingSpan = statuses > 0 ? THINK_IN + (statuses - 1) * THINK_DUR : 0
    const lastAnswerDur = answers.length > 0 ? lineDuration(answers[answers.length - 1]!) : 0
    return (
      INPUT_IN +
      typeDuration(turn.question) +
      SEND_PAUSE +
      thinkingSpan +
      ANSWER_IN +
      Math.max(answers.length - 1, 0) * ANSWER_GAP +
      lastAnswerDur
    )
  })
  const roundTotal = roundSpans.length > 0 ? Math.max(...roundSpans) : 0

  let lastSend = 0
  const rounds = turns.map((turn, r) => {
    const typeStart = r * roundTotal + INPUT_IN
    const dur = typeDuration(turn.question)
    const sendTime = typeStart + dur + SEND_PAUSE
    lastSend = sendTime

    const statuses = turn.lines.filter(isStatus).length
    const answerBase =
      sendTime + (statuses > 0 ? THINK_IN + (statuses - 1) * THINK_DUR : 0) + ANSWER_IN
    let statusIndex = 0
    let answerIndex = 0
    const lineTimes = turn.lines.map((line) =>
      isStatus(line)
        ? sendTime + THINK_IN + statusIndex++ * THINK_DUR
        : answerBase + answerIndex++ * ANSWER_GAP,
    )
    return { typeStart, typeDuration: dur, sendTime, lineTimes }
  })

  const showEnd =
    rounds.length > 0
      ? rounds[rounds.length - 1]!.lineTimes[turns[turns.length - 1]!.lines.length - 1]! +
        lineDuration(turns[turns.length - 1]!.lines[turns[turns.length - 1]!.lines.length - 1]!)
      : 0

  return { rounds, showEnd, parkedDelay: lastSend + PARK_IN }
}

/** 打字机文本（纯 CSS）：完整文本始终在 DOM 中（基础态 clip-path 不裁切），
 *  animation 期间用 steps(字符数) 逐字符揭示；reduced-motion 下 animation 禁用
 *  → 直接显示完整文本。--type-chars / --type-duration / --delay 由数据驱动。 */
function TypewriterText({ text, delay }: { text: string; delay: number }) {
  return (
    <span
      className="typewriter-text"
      style={
        {
          '--type-chars': text.length,
          '--type-duration': `${Math.max(text.length * TYPE_SPEED, MIN_TYPE)}s`,
          '--delay': `${delay}s`,
        } as CSSProperties
      }
    >
      {text}
      <span className="terminal-cursor" aria-hidden="true" />
    </span>
  )
}

/** 单轮渲染：问题行（发送时刻进入 transcript）+ 状态行（Thinking…/Done.）+ 回答行 */
function TurnRow({ turn, timing }: { turn: TerminalTurn; timing: TurnTiming }) {
  return (
    <div className="hero-turn">
      {/* 问题行：发送时刻淡入（与输入框清空同一时刻，--delay = sendTime） */}
      <div className="user-question" style={{ '--delay': `${timing.sendTime}s` } as CSSProperties}>
        <span className="turn-mark" aria-hidden="true">
          ❓
        </span>
        {turn.question}
      </div>
      {turn.lines.map((line, j) => {
        const delay = timing.lineTimes[j]!
        if (isStatus(line)) {
          return (
            <div
              key={j}
              className={`terminal-status terminal-status--${line.status}`}
              style={{ '--delay': `${delay}s` } as CSSProperties}
            >
              {line.text}
            </div>
          )
        }
        return (
          <div key={j} className="hero-line" style={{ '--delay': `${delay}s` } as CSSProperties}>
            {line.typewriter && typeof line.text === 'string' ? (
              <TypewriterText text={line.text} delay={delay} />
            ) : (
              line.text
            )}
          </div>
        )
      })}
    </div>
  )
}

/** hero 终端（pi 风格 AI 编码 agent 会话演出）：transcript → 输入区 → 状态栏 */
export default function HeroTerminal({
  turns,
  siteStats,
}: {
  turns: TerminalTurn[]
  siteStats: SiteStats
}) {
  const timeline = computeTurnTimings(turns)

  return (
    <div className="hero-terminal" role="group" aria-label="AI 会话演出">
      {/* 四角括号装饰（┌ ┐ └ ┘，绝对定位不占文档流，不进可访问性树） */}
      <span className="hero-terminal-corner hero-terminal-corner--tl" aria-hidden="true">
        ┌
      </span>
      <span className="hero-terminal-corner hero-terminal-corner--tr" aria-hidden="true">
        ┐
      </span>

      {/* 会话 transcript：每轮 = 问题行 + 状态行（Thinking…/Done.）+ 回答行，
          行级动画由 --delay 编排（发送/状态/回答各按数据计算的时刻揭示） */}
      <div className="hero-terminal-scroll">
        <div className="hero-terminal-body">
          {turns.map((turn, i) => (
            <TurnRow key={i} turn={turn} timing={timeline.rounds[i]!} />
          ))}
        </div>
      </div>

      {/* 输入区：每轮一个 .terminal-typed（绝对定位叠放，文本 clip 打字揭示 → 发送时
          opacity 清空）；输入光标常亮不闪烁并随打字右移（issue #63，--delay-cursor
          控制出现时刻，演出全程光标常驻）；停驻光标末轮发送后出现，常亮停驻 */}
      <div className="terminal-input-row">
        <div className="terminal-input">
          {turns.map((turn, i) => {
            const t = timeline.rounds[i]!
            return (
              <span
                key={i}
                className="terminal-typed"
                style={
                  {
                    '--type-chars': turn.question.length,
                    '--type-duration': `${t.typeDuration}s`,
                    '--delay-type': `${t.typeStart}s`,
                    '--delay-hide': `${t.sendTime}s`,
                    // 输入光标出现时刻：首轮即显示；其后每轮在上一轮发送清空完成后
                    // 立即出现（+ INPUT_HIDE = CSS input-hide 时长）→ 演出全程光标常驻
                    '--delay-cursor': `${
                      i === 0 ? 0 : timeline.rounds[i - 1]!.sendTime + INPUT_HIDE
                    }s`,
                  } as CSSProperties
                }
              >
                <span className="terminal-input-text">{turn.question}</span>
                <span className="terminal-cursor" aria-hidden="true" />
              </span>
            )
          })}
          <span
            className="terminal-input-cursor"
            aria-hidden="true"
            style={{ '--delay-appear': `${timeline.parkedDelay}s` } as CSSProperties}
          />
        </div>
      </div>

      {/* 状态栏（issue #40 + #55 精简）：● live · 文章数 · 标签数 · v<版本>；
          ● live 红点软脉冲无限循环；文章数/标签数构建期自动计算（调用方传入）；
          版本号构建期注入 package.json（role=status：内容更新可被读屏播报） */}
      <div className="hero-terminal-caption" role="status" aria-label="终端状态栏">
        <span className="live-dot" aria-hidden="true" />
        <span className="status-item">live</span>
        <span className="status-sep" aria-hidden="true">
          ·
        </span>
        {/* 站点真实信息：文章数 · 标签数（构建期从内容清单计算，data-* 供 e2e 断言） */}
        <span
          className="status-item"
          data-posts={siteStats.postCount}
          data-tags={siteStats.tagCount}
        >
          {siteStats.postCount} 篇文章 · {siteStats.tagCount} 个标签
        </span>
        <span className="status-sep" aria-hidden="true">
          ·
        </span>
        {/* 站点版本：构建期注入 package.json version */}
        <span className="status-item" data-version={siteMeta.version}>
          v{siteMeta.version}
        </span>
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
