---
title: React 反模式：你可能正在写的那些"坏代码"
date: 2026-05-17
tags:
  - React
  - 前端
summary: 盘点 React 开发中最常见的反模式——滥用 useEffect、派生状态冗余、数据流倒灌、组件职责不清。每种反模式都给出问题场景和对应的正确写法。
---

# React 反模式：你可能正在写的那些"坏代码"

反模式（Anti-pattern）这个词听起来挺唬人的，其实就是"看起来能跑、但迟早出事"的写法。React 的反模式尤其多，因为它给了你太多自由——state 可以随便放、Effect 可以随便写、组件想怎么拆就怎么拆。自由意味着你有一百种方式把事情搞砸。

## 反模式一：用 useEffect 同步派生状态

这是 React 反模式里的"头号杀手"，在真实项目里出现频率极高。React 官方专门写了一篇 [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) 来讲这类问题，推荐读一读。

```tsx
function UserProfile({ firstName, lastName }) {
  const [fullName, setFullName] = useState('')

  useEffect(() => {
    setFullName(firstName + ' ' + lastName)
  }, [firstName, lastName])

  return <h1>{fullName}</h1>
}
```

看起来没毛病是吧？`firstName` 或 `lastName` 变了，Effect 自动更新 `fullName`。但这里有两个问题：

1. **多余的渲染**。props 变了先渲染一次（此时 `fullName` 还是旧的），Effect 触发 `setFullName`，又渲染一次。用户可能会短暂看到不一致的状态。
2. **完全没必要用 state**。`fullName` 100% 由 `firstName` 和 `lastName` 决定，它不是独立的状态，是计算结果。

正确写法简单到令人发指：

```tsx
function UserProfile({ firstName, lastName }) {
  const fullName = firstName + ' ' + lastName
  return <h1>{fullName}</h1>
}
```

直接在渲染过程中算。每次渲染都会执行，但 JavaScript 拼个字符串的性能开销基本为零。如果计算确实很重（比如过滤一个大数组），用 [`useMemo`](https://react.dev/reference/react/useMemo)：

```tsx
const visibleTodos = useMemo(
  () => todos.filter(t => t.status === filter),
  [todos, filter]
)
```

判断标准很简单：**如果一个值可以从现有的 props 或 state 计算出来，它就不应该是 state。**

## 反模式二：useEffect 链式瀑布

上一个反模式的升级版。多个 Effect 互相触发，形成一条更新链：

```tsx
function Game() {
  const [card, setCard] = useState(null)
  const [goldCardCount, setGoldCardCount] = useState(0)
  const [round, setRound] = useState(1)

  useEffect(() => {
    if (card?.gold) {
      setGoldCardCount(c => c + 1)
    }
  }, [card])

  useEffect(() => {
    if (goldCardCount > 3) {
      setRound(r => r + 1)
    }
  }, [goldCardCount])

  useEffect(() => {
    if (round > 5) {
      alert('Game over!')
    }
  }, [round])

  // ...
}
```

`card` 变了 → 触发第一个 Effect → `goldCardCount` 变了 → 触发第二个 Effect → `round` 变了 → 触发第三个 Effect。每一步都是一次额外渲染。

<img src="/images/react-anti-patterns/effect-cascade.svg" alt="useEffect 链式更新 vs 事件驱动对比" width="100%" style="max-width:620px" />

正确做法是在事件处理器里一次性算完所有状态：

```tsx
function handlePlaceCard(nextCard) {
  if (nextCard.gold) {
    const newGoldCount = goldCardCount + 1
    setGoldCardCount(newGoldCount)
    if (newGoldCount > 3) {
      const newRound = round + 1
      setRound(newRound)
      if (newRound > 5) {
        alert('Game over!')
      }
    }
  }
  setCard(nextCard)
}
```

React 18 的[自动批处理](https://react.dev/blog/2022/03/29/react-v18#new-feature-automatic-batching)会把同一个事件处理器里的多次 `setState` 合并成一次渲染。一个事件处理器、一次渲染、没有中间状态闪烁。

## 反模式三：Effect 里搞事件逻辑

useEffect 是"副作用"，但不是所有副作用都该放 Effect 里。用户操作触发的逻辑放在事件处理器里才对。

```tsx
function ProductPage({ product, addToCart }) {
  useEffect(() => {
    if (product.isInCart) {
      showNotification(`${product.name} 已加入购物车！`)
    }
  }, [product])

  function handleBuyClick() {
    addToCart(product)
  }
  // ...
}
```

这段代码有个隐蔽的 bug：用户刷新页面，如果 `product.isInCart` 为 true（可能是从缓存恢复的），Effect 会再次弹出通知。用户什么都没做，莫名其妙弹了个提示框。

"加入购物车"这件事是用户点击按钮触发的，通知应该跟着点击走，而不是跟着状态走：

```tsx
function handleBuyClick() {
  addToCart(product)
  showNotification(`${product.name} 已加入购物车！`)
}
```

记住这条原则：useEffect 是为了**组件出现在屏幕上**这个事实本身而运行的代码。如果一段逻辑的触发条件是用户的某个操作（点击、提交、拖拽），它就不应该在 Effect 里。

## 反模式四：子组件通过 Effect 通知父组件

```tsx
function Toggle({ onChange }) {
  const [isOn, setIsOn] = useState(false)

  useEffect(() => {
    onChange(isOn)
  }, [isOn, onChange])

  function handleClick() {
    setIsOn(!isOn)
  }

  return <button onClick={handleClick}>{isOn ? 'ON' : 'OFF'}</button>
}
```

看起来很合理——状态变了，通知父组件。但这里的问题是 Effect 会在 React 完成本次渲染、更新 DOM 之后才执行。也就是说父组件收到通知时，子组件已经渲染了一次了，然后父组件 `setState`，又来一次渲染。

<img src="/images/react-anti-patterns/data-flow.svg" alt="数据流方向对比：单向 vs 逆向通知" width="100%" style="max-width:560px" />

直接在事件处理器里通知就好了：

```tsx
function Toggle({ onChange }) {
  const [isOn, setIsOn] = useState(false)

  function handleClick() {
    const nextIsOn = !isOn
    setIsOn(nextIsOn)
    onChange(nextIsOn)
  }

  return <button onClick={handleClick}>{isOn ? 'ON' : 'OFF'}</button>
}
```

或者更进一步思考：这个 Toggle 到底需不需要自己维护 `isOn` 状态？如果父组件已经有了这个状态，Toggle 可以做成受控组件，自己不存 state：

```tsx
function Toggle({ isOn, onToggle }) {
  return (
    <button onClick={() => onToggle(!isOn)}>
      {isOn ? 'ON' : 'OFF'}
    </button>
  )
}
```

## 反模式五：用 Effect 重置状态

props 变了，想把某个 state 重置回初始值：

```tsx
function ChatRoom({ roomId }) {
  const [message, setMessage] = useState('')

  useEffect(() => {
    setMessage('')
  }, [roomId])

  // ...
}
```

又是熟悉的味道——先渲染一次旧的 `message`，然后 Effect 清空它，再渲染一次。用户可能看到一帧闪烁。

React 有个专门干这事的机制叫 [`key`](https://react.dev/learn/preserving-and-resetting-state#option-2-resetting-state-with-a-key)。`key` 变了，React 会销毁旧组件、创建新组件，所有 state 自动重置：

```tsx
function ChatApp({ roomId }) {
  return <ChatRoom roomId={roomId} key={roomId} />
}

function ChatRoom({ roomId }) {
  const [message, setMessage] = useState('')
  // roomId 变了 → 组件重建 → message 自动回到 ''
}
```

很多人只知道 `key` 在列表渲染时用，不知道它可以用来重置任意组件的状态。其实这才是 `key` 的本质——告诉 React "这是不是同一个组件实例"。

## 反模式六：在渲染中直接修改状态

这个比较基础但偶尔还是能看到：

```tsx
function Counter() {
  const [count, setCount] = useState(0)
  const [warning, setWarning] = useState(false)

  // 反模式：渲染过程中调用 setState
  if (count > 10) {
    setWarning(true) // 💥 可能导致无限循环
  }

  return <div>{count}</div>
}
```

React 的渲染应该是[纯函数](https://react.dev/learn/keeping-components-pure)——给定相同的 props 和 state，返回相同的 JSX。在渲染过程中调用 `setState` 会触发重新渲染，如果条件写不好就是无限循环。

这种场景用 `useMemo` 或者直接算一个变量就行：

```tsx
function Counter() {
  const [count, setCount] = useState(0)
  const showWarning = count > 10
  return (
    <div>
      {count}
      {showWarning && <span>数字太大了</span>}
    </div>
  )
}
```

## 什么时候该用 useEffect

说了这么多"别用 Effect"，那 Effect 到底什么时候用？三种场景：

1. **同步外部系统**。操作 DOM、订阅 WebSocket、连接第三方库（地图、播放器）。这些事情跟 React 的渲染无关，是"副作用"的本意。

```tsx
useEffect(() => {
  const map = L.map(containerRef.current)
  return () => map.remove()
}, [])
```

2. **数据获取**。组件挂载后从 API 拉数据。虽然现在社区更推荐用 [TanStack Query](https://tanstack.com/query) 或框架内置的数据加载方案，但如果你手动 fetch，Effect 是合适的容器——记得处理竞态。
3. **订阅外部状态源**。比如 `window.addEventListener`、`matchMedia`。不过 React 有个更好的 API 叫 [`useSyncExternalStore`](https://react.dev/reference/react/useSyncExternalStore)，专门干这事。

## 总结

回头看这些反模式，其实都指向一个核心问题：**把 useEffect 当作 watch 来用。**

从 Vue 转过来的同学特别容易犯这个错，因为 Vue 的 [`watch`](https://vuejs.org/guide/essentials/watchers.html) / `watchEffect` 就是"数据变了执行回调"。但 React 的 Effect 不是 watch。它的心智模型是"同步到外部系统"，不是"响应状态变化"。响应状态变化的正确方式是事件处理器和渲染期间的计算。

一条简单的检查规则：写 useEffect 之前问自己——"如果用户什么都没做，页面刚打开，这段代码应不应该跑？"如果答案是不应该，那它就不应该在 Effect 里。
