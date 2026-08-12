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

describe('computeTurnTimings（issue #40 演出编排）', () => {
  it('每轮：打字在发送前完成，发送 = 问题进入 transcript 时刻，随后 Thinking… → Done. → 回答', () => {
    const timeline = computeTurnTimings(script())
    const [round] = timeline.rounds

    // 打字窗口：typeStart 开始、持续 typeDuration，发送在其后（打字完成后停顿）
    expect(round!.typeStart).toBeGreaterThanOrEqual(0)
    expect(round!.typeDuration).toBeGreaterThan(0)
    expect(round!.sendTime).toBeGreaterThan(round!.typeStart + round!.typeDuration)

    // 输出行揭示时刻严格递增，且全部晚于发送（问题先进 transcript，再出状态行/回答）
    for (let i = 1; i < round!.lineTimes.length; i++) {
      expect(round!.lineTimes[i]!).toBeGreaterThan(round!.lineTimes[i - 1]!)
    }
    for (const t of round!.lineTimes) {
      expect(t).toBeGreaterThan(round!.sendTime)
    }

    // 状态行顺序：Thinking… 先于 Done.；回答行在状态行之后
    const [thinking, done, answer] = round!.lineTimes
    expect(done!).toBeGreaterThan(thinking!)
    expect(answer!).toBeGreaterThan(done!)
  })

  it('轮次严格串行：下一轮打字不早于上一轮最后一行揭示（真实会话顺序）', () => {
    const timeline = computeTurnTimings(script())
    const [r0, r1, r2] = timeline.rounds

    expect(r1!.typeStart).toBeGreaterThan(r0!.lineTimes[r0!.lineTimes.length - 1]!)
    expect(r2!.typeStart).toBeGreaterThan(r1!.lineTimes[r1!.lineTimes.length - 1]!)
  })

  it('停驻光标在末轮发送后出现；演出总时长覆盖最后一行揭示完成', () => {
    const timeline = computeTurnTimings(script())
    const last = timeline.rounds[timeline.rounds.length - 1]!

    // 末轮发送后输入框清空（停驻态），光标随之出现并持续闪烁
    expect(timeline.parkedDelay).toBeGreaterThan(last.sendTime)
    // 演出总时长 ≥ 最后一行揭示完成时刻（不循环，播完停驻最终态）
    expect(timeline.showEnd).toBeGreaterThanOrEqual(last.lineTimes[last.lineTimes.length - 1]!)
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
      expect(four.rounds[i]!.typeStart).toBe(three.rounds[i]!.typeStart)
      expect(four.rounds[i]!.sendTime).toBe(three.rounds[i]!.sendTime)
      expect(four.rounds[i]!.lineTimes).toEqual(three.rounds[i]!.lineTimes)
    }
  })
})
