import { useEffect, useRef, useSyncExternalStore } from 'react'

/**
 * 首页背景点阵动画（antfu.me ArtDots 风格改编，纯 canvas 2D）：
 * - 细点随自实现 2D 值噪声流场缓慢漂移、透明度闪烁
 * - devicePixelRatio 上限 2；visibilitychange 切后台暂停、回前台继续
 * - prefers-reduced-motion 时完全不渲染；颜色随明暗主题切换（--color-dot）
 * - 主题切换监听旧站点 data-theme 属性（5c27d4a 时代变量机制）
 * - 仅首页挂载、仅客户端执行：SSR 输出 null，避免 hydration mismatch
 * - data-dots-color / data-animation-state 为外部可观察状态（E2E 断言用）
 */

/* ---------- 轻量 2D 值噪声（自实现，零运行时依赖） ---------- */

/** 整数坐标哈希 → [0,1)：值噪声的晶格随机值 */
function hash2(x: number, y: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function fade(t: number): number {
  return t * t * (3 - 2 * t)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** 2D 值噪声（双线性平滑插值，输出 [0,1]）：点阵漂移与闪烁的流场来源 */
function noise2(x: number, y: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const u = fade(x - xi)
  const v = fade(y - yi)
  return lerp(
    lerp(hash2(xi, yi), hash2(xi + 1, yi), u),
    lerp(hash2(xi, yi + 1), hash2(xi + 1, yi + 1), u),
    v,
  )
}

/* ---------- 动画参数：克制度控制（点阵退为若有若无的底噪，同时控制 CPU 占用） ---------- */

/** 点距（CSS px）：更疏的稀疏网格，避免 CPU 高占用 */
export const SPACING = 44
/** 噪声空间缩放：越小越平缓 */
const NOISE_SCALE = 0.005
/** 时间缩放：漂移速度 */
const TIME_SCALE = 0.0008
/** 漂移振幅上限（CSS px） */
export const AMPLITUDE = 20
/** 点直径范围（CSS px） */
export const MIN_SIZE = 1
export const MAX_SIZE = 1.8
/** 透明度范围（CSS px）：上限压低，肉眼为暗点而非光斑 */
export const MIN_ALPHA = 0.06
export const MAX_ALPHA = 0.22

/** 每个点：基点（网格交点）+ 直径；动画在基点附近做有界漂移 */
interface Dot {
  bx: number
  by: number
  size: number
}

/**
 * 仅客户端启用点阵（useSyncExternalStore，SSR 安全的挂载检测）：
 * - 服务端快照恒为 false：SSR 与客户端首帧都无 canvas，杜绝 hydration mismatch
 * - 客户端快照 = 非 prefers-reduced-motion：reduce 用户完全不渲染（无 canvas、无报错），
 *   且运行时切换 reduce 偏好也会即时卸载
 */
function useDotsEnabled(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
      mql.addEventListener('change', onStoreChange)
      return () => mql.removeEventListener('change', onStoreChange)
    },
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  )
}

export default function BackgroundDots() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const enabled = useDotsEnabled()

  useEffect(() => {
    if (!enabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dots: Dot[] = []
    let rafId = 0
    let running = false
    let color = ''

    /** 重建点阵：按视口尺寸铺稀疏网格 */
    const buildDots = (w: number, h: number) => {
      dots.length = 0
      for (let x = SPACING / 2; x < w; x += SPACING) {
        for (let y = SPACING / 2; y < h; y += SPACING) {
          dots.push({ bx: x, by: y, size: MIN_SIZE + hash2(x, y) * (MAX_SIZE - MIN_SIZE) })
        }
      }
    }

    /** 缩放画布背板（DPR≤2）+ 随视口重建点阵 */
    const resize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      buildDots(w, h)
    }

    /** 一帧：清屏 + 逐点绘制（位置 = 基点 + 噪声漂移，透明度 = 噪声闪烁） */
    const frame = (now: number) => {
      // 清屏（放大一个余量覆盖背板取整误差；变换后仍以设备像素为单位）
      ctx.clearRect(0, 0, canvas.width + 1, canvas.height + 1)
      ctx.fillStyle = color
      const s = NOISE_SCALE
      for (const dot of dots) {
        // 采样点随时间滑动 → 整场缓慢漂移（流场效果）
        const px = dot.bx + (noise2(dot.bx * s + now * TIME_SCALE, dot.by * s) * 2 - 1) * AMPLITUDE
        const py = dot.by + (noise2(dot.bx * s, dot.by * s + now * TIME_SCALE) * 2 - 1) * AMPLITUDE
        // 透明度闪烁：独立相位，避免所有点同步明灭
        const alpha =
          MIN_ALPHA +
          (MAX_ALPHA - MIN_ALPHA) *
            noise2(dot.bx * s * 2 + now * TIME_SCALE * 2, dot.by * s * 2 + 7.31)
        ctx.globalAlpha = alpha
        ctx.fillRect(px, py, dot.size, dot.size)
      }
      ctx.globalAlpha = 1
      rafId = requestAnimationFrame(frame)
    }

    const start = () => {
      if (running) return
      running = true
      rafId = requestAnimationFrame(frame)
    }
    const stop = () => {
      running = false
      if (rafId) cancelAnimationFrame(rafId)
      rafId = 0
    }

    /** 主题色：读 CSS 令牌 --color-dot（随 html[data-theme] 切换） */
    const readColor = () => {
      const value = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-dot')
        .trim()
      const dark = document.documentElement.getAttribute('data-theme') === 'dark'
      return value || (dark ? '#e6e6e6' : '#1a1a1a')
    }

    // 主题切换（html[data-theme] 变化）→ 更新点色
    const observer = new MutationObserver(() => {
      color = readColor()
      canvas.dataset.dotsColor = color
    })

    /** 标签页切后台暂停、回前台继续（不消耗后台资源） */
    const onVisibility = () => {
      const hidden = document.visibilityState === 'hidden'
      canvas.dataset.animationState = hidden ? 'paused' : 'running'
      if (hidden) stop()
      else start()
    }

    color = readColor()
    canvas.dataset.dotsColor = color
    canvas.dataset.animationState = 'running'
    resize()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('resize', resize)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    start()

    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('resize', resize)
      observer.disconnect()
    }
  }, [enabled])

  if (!enabled) return null
  return <canvas ref={canvasRef} className="bg-dots" aria-hidden="true" />
}
