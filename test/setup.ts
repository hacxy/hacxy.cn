import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
  document.title = ''
  document.head.querySelectorAll('meta[name="description"]').forEach((m) => m.remove())
})

// jsdom 未实现 MutationObserver，GitHubCalendar 依赖它
if (!globalThis.MutationObserver) {
  class FakeMutationObserver {
    private callback: MutationCallback
    constructor(callback: MutationCallback) {
      this.callback = callback
    }
    observe() {}
    disconnect() {}
    takeRecords(): MutationRecord[] {
      return []
    }
  }
  globalThis.MutationObserver = FakeMutationObserver as unknown as typeof MutationObserver
}

// 组件复制交互需要 navigator.clipboard
if (!navigator.clipboard) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: async () => {} },
    configurable: true,
  })
}

// jsdom 未实现 matchMedia，theme utils 依赖它
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}
