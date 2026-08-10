import { describe, expect, it } from 'vitest'

import {
  AMPLITUDE,
  MAX_ALPHA,
  MAX_SIZE,
  MIN_ALPHA,
  MIN_SIZE,
  SPACING,
} from '../../src/components/BackgroundDots.tsx'

/**
 * issue #27：首页背景点阵克制度——点阵从"显眼"退为若有若无的底噪。
 * 这里把克制度规格固化为回归测试，防止后续调参时点阵重新变抢戏。
 * （视觉契约：点距更疏、点更小更暗、漂移振幅更小；动画行为本身由 e2e 断言）
 */
describe('background dots tuning (issue #27)', () => {
  it('spacing is 44px（36→44，更疏的稀疏网格）', () => {
    expect(SPACING).toBe(44)
  })

  it('dot size range is 1–1.8px（1.5–3→1–1.8，更细）', () => {
    expect(MIN_SIZE).toBe(1)
    expect(MAX_SIZE).toBe(1.8)
  })

  it('alpha range is 0.06–0.22（0.1–0.5→0.06–0.22，上限显著压低，肉眼为暗点而非光斑）', () => {
    expect(MIN_ALPHA).toBe(0.06)
    expect(MAX_ALPHA).toBe(0.22)
  })

  it('drift amplitude is 20px（32→20，更克制的漂移）', () => {
    expect(AMPLITUDE).toBe(20)
  })
})
