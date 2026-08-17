import { describe, expect, it } from 'vitest'

import { computeTurnTimings, type TerminalTurn } from '../../src/components/HeroTerminal.tsx'

/**
 * issue #40：hero 终端演出编排——computeTurnTimings 纯函数契约。
 * 每轮：输入框逐字符打字（typeStart → typeStart + typeDuration）→ 发送
 * （sendTime：问题进入 transcript + 输入框清空同一时刻）→ 状态行
 * （Thinking… → Done.）→ 回答行；轮次严格串行（下一轮打字不早于上一轮
 * 最后一行揭示）；停驻光标在末轮发送后出现；演出总时长覆盖最后一行揭示。
 * 全部时刻由数据驱动（问题字符数 × 打字速度 + 节奏参数），新增轮次无需改代码。
 */

/** 测试剧本：三轮问答（你是谁 / 这个站有什么 / 怎么联系），含状态行与回答行 */
function script(): TerminalTurn[] {
  return [
    {
      question: '你是谁',
      lines: [
        { text: 'Thinking…', status: 'thinking' },
        { text: 'Done.', status: 'done' },
        { text: '前端工程师 · 关注 Web 生态与工程化' },
        { text: '了解真相，才能获得真正的自由', typewriter: true },
      ],
    },
    {
      question: '这个站有什么',
      lines: [
        { text: 'Thinking…', status: 'thinking' },
        { text: 'Done.', status: 'done' },
        { text: '3 篇文章 · 4 个标签' },
      ],
    },
    {
      question: '怎么联系',
      lines: [
        { text: 'Thinking…', status: 'thinking' },
        { text: 'Done.', status: 'done' },
        { text: 'https://github.com/hacxy' },
      ],
    },
  ]
}

/** 断言值已定义并收窄类型（替代非空断言，issue #74：no-non-null-assertion 警告清零） */
function expectDefined<T>(value: T | undefined, label: string): T {
  expect(value).toBeDefined()
  if (value === undefined) throw new Error(`${label} 应为已定义`)
  return value
}

describe('computeTurnTimings（issue #40 演出编排）', () => {
  it('每轮：打字在发送前完成，发送 = 问题进入 transcript 时刻，随后 Thinking… → Done. → 回答', () => {
    const timeline = computeTurnTimings(script())
    const round = expectDefined(timeline.rounds[0], 'timeline.rounds[0]')

    // 打字窗口：typeStart 开始、持续 typeDuration，发送在其后（打字完成后停顿）
    expect(round.typeStart).toBeGreaterThanOrEqual(0)
    expect(round.typeDuration).toBeGreaterThan(0)
    expect(round.sendTime).toBeGreaterThan(round.typeStart + round.typeDuration)

    // 输出行揭示时刻严格递增，且全部晚于发送（问题先进 transcript，再出状态行/回答）
    for (let i = 1; i < round.lineTimes.length; i++) {
      const prev = expectDefined(round.lineTimes[i - 1], `lineTimes[${i - 1}]`)
      const cur = expectDefined(round.lineTimes[i], `lineTimes[${i}]`)
      expect(cur).toBeGreaterThan(prev)
    }
    for (const t of round.lineTimes) {
      expect(t).toBeGreaterThan(round.sendTime)
    }

    // 状态行顺序：Thinking… 先于 Done.；回答行在状态行之后
    const thinking = expectDefined(round.lineTimes[0], 'lineTimes[0]')
    const done = expectDefined(round.lineTimes[1], 'lineTimes[1]')
    const answer = expectDefined(round.lineTimes[2], 'lineTimes[2]')
    expect(done).toBeGreaterThan(thinking)
    expect(answer).toBeGreaterThan(done)
  })

  it('轮次严格串行：下一轮打字不早于上一轮最后一行揭示（真实会话顺序）', () => {
    const timeline = computeTurnTimings(script())
    const r0 = expectDefined(timeline.rounds[0], 'timeline.rounds[0]')
    const r1 = expectDefined(timeline.rounds[1], 'timeline.rounds[1]')
    const r2 = expectDefined(timeline.rounds[2], 'timeline.rounds[2]')

    expect(r1.typeStart).toBeGreaterThan(expectDefined(r0.lineTimes.at(-1), 'r0 最后一行揭示时刻'))
    expect(r2.typeStart).toBeGreaterThan(expectDefined(r1.lineTimes.at(-1), 'r1 最后一行揭示时刻'))
  })

  it('停驻光标在末轮发送后出现；演出总时长覆盖最后一行揭示完成', () => {
    const timeline = computeTurnTimings(script())
    const last = expectDefined(timeline.rounds.at(-1), '最后一轮')

    // 末轮发送后输入框清空（停驻态），光标随之出现并持续闪烁
    expect(timeline.parkedDelay).toBeGreaterThan(last.sendTime)
    // 演出总时长 ≥ 最后一行揭示完成时刻（不循环，播完停驻最终态）
    expect(timeline.showEnd).toBeGreaterThanOrEqual(
      expectDefined(last.lineTimes.at(-1), '最后一轮最后一行揭示时刻'),
    )
  })

  it('数据驱动：新增轮次自动延长演出，渲染代码零改动', () => {
    const three = computeTurnTimings(script())
    const four = computeTurnTimings([
      ...script(),
      {
        question: '新增问题',
        lines: [
          { text: 'Thinking…', status: 'thinking' },
          { text: 'Done.', status: 'done' },
          { text: '新增回答' },
        ],
      },
    ])

    // 演出总时长随轮次增加而变长；已有轮次时刻不受影响（纯派生，无共享可变状态）
    expect(four.showEnd).toBeGreaterThan(three.showEnd)
    for (let i = 0; i < three.rounds.length; i++) {
      const threeRound = expectDefined(three.rounds[i], `three.rounds[${i}]`)
      const fourRound = expectDefined(four.rounds[i], `four.rounds[${i}]`)
      expect(fourRound.typeStart).toBe(threeRound.typeStart)
      expect(fourRound.sendTime).toBe(threeRound.sendTime)
      expect(fourRound.lineTimes).toEqual(threeRound.lineTimes)
    }
  })
})
