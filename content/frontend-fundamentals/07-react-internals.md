---
title: "React 底层原理"
date: 2026-05-13
tags:
  - React
  - 前端基础
sort: 7
summary: Fiber 架构到底解决了什么问题？Hooks 为什么不能写在条件语句里？reconciliation 是怎么做 diff 的？这篇文章深入 React 的内部机制，帮你理解框架背后的设计思路。
---

# React 底层原理

用了好几年 React，大部分人对它的 API 已经烂熟于心了。但你有没有认真想过：`setState` 之后到底发生了什么？Fiber 是个什么东西？为什么 `useEffect` 的清理函数在下一次渲染之后才执行？

这篇文章不打算从零教你写 React，而是把那些你用着顺手、但可能没深究过的内部机制拆开来看。理解这些东西不会让你明天写出更好的业务代码，但会让你在遇到诡异 bug 时有更清晰的排查方向。

## 虚拟 DOM：被过度神话的概念

先把最基础的东西说清楚。虚拟 DOM 不是什么高深技术，就是一棵用 JavaScript 对象描述的 UI 树。`React.createElement` 的返回值就是一个普通对象：

```javascript
// JSX
<div className="box">
  <span>hello</span>
</div>

// 编译后等价于
{
  type: 'div',
  props: {
    className: 'box',
    children: {
      type: 'span',
      props: { children: 'hello' }
    }
  }
}
```

虚拟 DOM 的价值不在于"快"——直接操作真实 DOM 一定比先算 diff 再操作更快。它的价值在于提供了一层抽象：你描述你想要什么样的 UI，React 负责算出最少的 DOM 操作来达到那个状态。这让开发者不用手动管理 DOM 更新，也让跨平台渲染（React Native、服务端渲染）成为可能。

2015 年左右很多人宣传"虚拟 DOM 比真实 DOM 快"，这个说法并不准确。准确地说，虚拟 DOM 在大多数场景下提供了足够好的性能，同时大幅降低了心智负担。这是一个工程上的取舍，不是银弹。

## Fiber 架构

### 为什么要抛弃 Stack Reconciler

React 16 之前用的是 Stack Reconciler，渲染过程是同步递归的。一旦开始渲染，就必须一口气跑完整棵树，中途不能停。

这在小型应用里没什么问题。但当组件树很深、或者某次更新涉及大量节点时，主线程会被长时间占用。用户点了个按钮，输入框打了个字，浏览器想跑个动画——全得排队等着。超过 16ms 没还给浏览器，用户就能感知到卡顿了。

React 团队的解决方案是：把同步的递归渲染拆成可中断的异步工作单元。这就是 Fiber 的核心动机。

### Fiber Node 的结构

每个 React 元素在内部对应一个 Fiber Node。你可以把它理解成虚拟 DOM 节点的增强版，除了描述 UI 结构，还携带了大量调度信息：

```javascript
// 简化的 Fiber Node 结构
{
  tag: FunctionComponent,  // 组件类型标记
  type: MyComponent,       // 组件函数或类
  stateNode: null,         // 对应的 DOM 节点或类实例

  // 树结构——用链表而不是数组
  return: parentFiber,     // 父节点
  child: firstChildFiber,  // 第一个子节点
  sibling: nextFiber,      // 下一个兄弟节点

  // 工作相关
  pendingProps: {},        // 新的 props
  memoizedProps: {},       // 上次渲染的 props
  memoizedState: {},       // 上次渲染的 state
  updateQueue: null,       // 待处理的更新队列

  // 副作用
  flags: Placement | Update,  // 标记需要执行的 DOM 操作
  lanes: SyncLane,            // 优先级
  alternate: currentFiber,    // 对应的 current/workInProgress
}
```

注意树结构用的是 `child` + `sibling` + `return` 三个指针，形成链表而非传统的 `children` 数组。这是刻意的设计——链表结构天然支持中断和恢复，处理到任何一个节点时都可以暂停，下次从同一个位置继续。

### 时间切片与可中断渲染

Fiber 架构下，一次渲染分成两个阶段：

**Render 阶段（可中断）**：遍历 Fiber 树，对比新旧节点，标记需要变更的节点。这个阶段纯粹是计算，不会触及真实 DOM。因为没有副作用，随时可以中断、丢弃、重来。

**Commit 阶段（同步不可中断）**：把 Render 阶段算出来的变更一次性应用到 DOM 上。这个阶段必须同步完成，否则用户看到的 UI 会处于不一致的中间状态。

Render 阶段的遍历是通过一个 `workLoop` 循环实现的，大致逻辑：

```javascript
function workLoopConcurrent() {
  while (workInProgress !== null && !shouldYield()) {
    performUnitOfWork(workInProgress);
  }
}
```

`shouldYield()` 检查当前帧还有没有剩余时间。如果时间用完了，就把控制权还给浏览器，等下一帧再继续。这就是所谓的"时间切片"（Time Slicing）。

React 在内部维护了两棵 Fiber 树：`current` 树（当前屏幕上显示的）和 `workInProgress` 树（正在构建的）。渲染完成后，React 把 `workInProgress` 变成新的 `current`，这个操作叫 double buffering——灵感来自图形编程里的双缓冲技术。

## Reconciliation 与 Diff 算法

Reconciliation 就是 React 对比新旧两棵树、找出差异的过程。理论上对比两棵树的最优算法是 O(n^3) 的，这在实际应用中完全不可接受。React 做了三个大胆的假设，把复杂度降到了 O(n)：

### 三个假设

1. 不同类型的元素会产生完全不同的树。如果 `<div>` 变成了 `<span>`，React 不会尝试复用，直接销毁整棵子树重建。
2. 同层级的节点才会比较。React 不会跨层级移动节点——如果你把一个组件从 A 的子节点移到 B 的子节点，React 会销毁再重建，而不是"移动"。
3. 开发者可以通过 `key` 来提示哪些子元素在不同渲染之间是稳定的。

这三个假设在实际开发中几乎总是成立的。跨层级移动 DOM 节点这种操作在业务代码里极其罕见，用 O(n) 的算法覆盖 99% 的场景，是非常务实的工程决策。

### key 的作用

`key` 在列表渲染中的作用大家都知道，但值得强调的是它到底解决了什么问题。

没有 `key` 时，React 按位置（index）对比子元素。如果你在列表头部插入一项，React 会认为所有元素都变了——第一个变成了新元素，第二个变成了原来的第一个……每一项都要更新。

```tsx
// 没有 key 的情况
// 渲染前: [A, B, C]
// 渲染后: [X, A, B, C]
// React 认为：位置 0 从 A 变成 X，位置 1 从 B 变成 A……全部更新

// 有 key 的情况
// React 认为：新增了一个 key="x" 的元素，其余不变
```

所以用 `index` 当 `key` 通常是个坏主意，因为插入、删除、排序操作会导致 index 和元素的对应关系错乱，本质上跟没有 key 一样。用稳定的业务 ID 做 key，React 才能正确识别"哪些元素是同一个"。

还有一个技巧不太常见但很有用：故意改变 `key` 来强制 React 销毁并重建一个组件。比如你想在切换用户时彻底重置一个表单组件的内部状态，只需要把用户 ID 当作 key 传进去。

```tsx
<UserProfile key={userId} userId={userId} />
```

## Hooks 的实现原理

### 链表结构

Hooks 的内部实现是一条链表。每个组件对应的 Fiber Node 上有一个 `memoizedState` 字段，指向第一个 Hook 节点，后续的 Hook 通过 `next` 指针串成链表：

```javascript
// 组件内调用了三个 Hook
function MyComponent() {
  const [count, setCount] = useState(0);     // Hook 1
  const [name, setName] = useState('');       // Hook 2
  useEffect(() => { /* ... */ }, [count]);    // Hook 3
}

// 内部的链表结构大致是：
// fiber.memoizedState -> hook1 -> hook2 -> hook3 -> null
//                        (useState)  (useState)  (useEffect)
```

每次渲染时，React 按顺序遍历这条链表，把每个 Hook 和对应的状态匹配上。

### 为什么有调用顺序限制

现在你应该明白了——Hooks 依赖调用顺序来匹配状态。如果你写了这样的代码：

```javascript
function MyComponent({ showExtra }) {
  const [count, setCount] = useState(0);

  if (showExtra) {
    useEffect(() => { /* ... */ }); // 条件调用
  }

  const [name, setName] = useState('');
}
```

当 `showExtra` 从 `true` 变成 `false` 时，第二次渲染少了一个 Hook 调用。React 按顺序遍历链表，会把 Hook 2 的 `useEffect` 状态错误地匹配到 Hook 2 的 `useState('') `上。整个状态就乱套了。

这就是为什么 React 的 [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks) 规定 Hooks 不能写在条件、循环或嵌套函数里。这不是 React 团队偷懒，而是链表结构带来的根本约束。当然，你可以争论说换用 HashMap（用 Hook 名称做 key）就不需要这个限制——但链表在内存和性能上更优，而且"保持调用顺序"这个约束在实践中并不难遵守。

### useState 和 useEffect 的执行时机

`useState` 比较直观：初次渲染时初始化状态，后续渲染时从链表读取当前值。`setState` 不会立刻更新状态，而是把更新对象加入 Fiber Node 的 `updateQueue`，然后触发一次调度。

`useEffect` 的时机值得细说：

- Effect 的回调函数在 commit 阶段完成后异步执行（通过 `MessageChannel` 调度），不会阻塞浏览器绘制。
- Effect 的清理函数在下一次渲染的 commit 阶段前执行——先清理上一轮的 effect，再执行新的。
- `useLayoutEffect` 是同步版本的 `useEffect`，在 DOM 变更后、浏览器绘制前同步执行。需要读取 DOM 布局信息时才用它，否则会阻塞渲染。

一个常见误区：认为 `useEffect` 等同于 `componentDidMount` + `componentDidUpdate`。其实 `useLayoutEffect` 才更接近那两个生命周期的时机，而 `useEffect` 是延迟执行的。

## 调度机制

### Scheduler

React 有一个独立的调度器包（[scheduler](https://github.com/facebook/react/tree/main/packages/scheduler)），负责管理工作的执行顺序和时机。它的核心思路很简单：把任务按优先级排入队列，在浏览器空闲时执行，执行时间超过阈值就让出主线程。

调度器内部用了小顶堆（min-heap）来管理任务队列，优先级最高的任务总是在堆顶。每次取出一个任务执行，执行完了或者时间到了，就检查有没有更高优先级的任务插队。

有意思的是，React 团队一开始想用浏览器原生的 `requestIdleCallback`，但后来发现它在各浏览器的实现差异太大，而且调用频率不够稳定（特别是在 tab 不可见时），最终自己实现了一套基于 `MessageChannel` 的调度机制。

### 优先级 Lane 模型

React 18 引入了 Lane 模型来表示更新的优先级。Lane 用二进制位来表示，这样可以用位运算高效地合并、比较和过滤优先级：

```javascript
// 简化的 Lane 定义
const SyncLane        = 0b0000000000000000000000000000010;
const InputContinuousLane = 0b0000000000000000000000000001000;
const DefaultLane     = 0b0000000000000000000000000100000;
const TransitionLane1 = 0b0000000000000000000001000000000;
const IdleLane        = 0b0100000000000000000000000000000;
```

不同的更新来源会分配不同的 Lane：

- 用户输入（点击、键盘）→ SyncLane，最高优先级，同步处理
- 连续输入（滚动、拖拽）→ InputContinuousLane
- 普通 `setState` → DefaultLane
- `startTransition` 包裹的更新 → TransitionLane，低优先级，可被中断
- `useDeferredValue` → TransitionLane，和 `startTransition` 同级

这套机制让 React 能做到：用户正在打字的时候，输入框的更新优先处理，而搜索结果列表的更新可以延后。如果搜索结果的渲染正在进行中，新的键盘输入来了，React 可以中断搜索结果的渲染，先处理输入，然后重新渲染搜索结果。

相比之前的 `expirationTime` 模型，Lane 模型的优势在于能表达更复杂的优先级关系，比如"这个更新和那个更新的优先级相同，可以一起批处理"。`expirationTime` 只能表达线性的优先级排序，而 Lane 的位运算天然支持集合操作。

## Concurrent Mode 与 Suspense

Concurrent Mode 不是一个开关，而是 Fiber 架构能力的自然延伸。React 18 默认启用了并发特性（通过 `createRoot`），但只有你显式使用 `startTransition`、`useDeferredValue` 等 API 时，React 才会真正利用并发能力。

```tsx
import { useState, useTransition } from 'react';

function SearchPage() {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleChange(e) {
    // 输入框更新：高优先级，立即响应
    setQuery(e.target.value);

    // 搜索结果更新：包在 transition 里，可以被中断
    startTransition(() => {
      setSearchResults(computeResults(e.target.value));
    });
  }

  return (
    <>
      <input value={query} onChange={handleChange} />
      {isPending ? <Spinner /> : <Results />}
    </>
  );
}
```

Suspense 是并发模式下数据加载的解决方案。它的原理并不复杂：组件在渲染时如果还没准备好数据，就抛出一个 Promise。React 捕获这个 Promise，显示 fallback，等 Promise resolve 后重新渲染。

```tsx
// React 内部对 Suspense 的处理（极度简化）
try {
  renderComponent(Component);
} catch (thrown) {
  if (thrown instanceof Promise) {
    // 显示 fallback，等 Promise resolve 后重新渲染
    thrown.then(() => scheduleRerender());
  }
}
```

抛出 Promise 这种模式看起来有点 hack，但其实在代数效应（Algebraic Effects）的理论框架下是合理的。Dan Abramov 在 [Algebraic Effects for the Rest of Us](https://overreacted.io/algebraic-effects-for-the-rest-of-us/) 这篇文章里详细解释了这个设计背后的思路。JavaScript 没有原生的代数效应支持，throw/catch 是 React 团队找到的最接近的替代方案。

## 合成事件系统

React 实现了自己的事件系统，叫 SyntheticEvent。你在 JSX 里写的 `onClick`、`onChange` 等事件处理器，绑定的不是原生 DOM 事件，而是 React 的合成事件。

### 事件委托

React 不会在每个 DOM 节点上绑定事件监听器，而是在根节点上统一监听。这就是事件委托——一个经典的优化手段。

React 17 之前，事件委托在 `document` 上。React 17+ 改到了 `root` 容器节点上。这个改动让多个 React 实例共存变得更容易（微前端场景），也避免了 `e.stopPropagation()` 行为不符合预期的问题。

### 事件池（已废弃）

React 16 及之前有一个"事件池"机制：合成事件对象在回调执行完后会被回收重用，所有属性被置为 null。这意味着你不能异步访问事件对象：

```javascript
// React 16，这段代码有 bug
function handleClick(e) {
  setTimeout(() => {
    console.log(e.type); // null!  事件对象已被回收
  }, 100);
}
```

当时的解决方案是调用 `e.persist()` 把事件从池中取出。

React 17 废弃了事件池。原因很直接：现代浏览器上，对象创建的成本已经低到事件池带来的性能提升微乎其微，反而引入了一堆令人困惑的 bug。这是个典型的"过早优化"被逐渐抛弃的例子。

## React 18+ 的 Automatic Batching

React 18 之前，状态更新的批处理行为不一致。在 React 事件处理器里多次 `setState` 会被自动合并成一次渲染，但在 Promise、setTimeout、原生 DOM 事件里就不行：

```javascript
// React 17
function handleClick() {
  setCount(c => c + 1);
  setFlag(f => !f);
  // 只触发一次渲染（React 事件处理器里自动 batching）
}

setTimeout(() => {
  setCount(c => c + 1);
  setFlag(f => !f);
  // 触发两次渲染！（setTimeout 里没有 batching）
}, 1000);
```

这种不一致性不仅让人困惑，还可能导致不必要的中间状态渲染。React 18 通过 `createRoot` 启用了 Automatic Batching，所有场景下的多次 `setState` 都会被自动合并：

```javascript
// React 18
setTimeout(() => {
  setCount(c => c + 1);
  setFlag(f => !f);
  // 只触发一次渲染——不管在哪里调用
}, 1000);

fetch('/api/data').then(() => {
  setCount(c => c + 1);
  setFlag(f => !f);
  // 同样只触发一次渲染
});
```

极少数情况下你确实需要立即触发渲染（比如需要在两次状态更新之间读取 DOM），可以用 `flushSync`：

```javascript
import { flushSync } from 'react-dom';

flushSync(() => {
  setCount(c => c + 1);
});
// 这里 DOM 已经更新了
flushSync(() => {
  setFlag(f => !f);
});
```

但说实话，我在实际项目中几乎没用过 `flushSync`。如果你发现自己需要它，先想想是不是架构设计有问题。

## 总结

回头看 React 的这些内部机制，有一条清晰的主线：从同步到异步，从不可中断到可中断，从粗粒度到细粒度。Fiber 架构、Lane 模型、Concurrent Mode——都是这条主线上的节点。

React 的设计哲学一直是"先把心智模型做对，再优化性能"。虚拟 DOM 不一定是最快的，但它让声明式 UI 成为可能。Hooks 的链表结构带来了调用顺序的限制，但换来了极简的 API 和更好的组合能力。Suspense 用 throw Promise 这种看起来不正经的方式，实现了优雅的异步数据流。

理解这些原理不是为了在面试里背八股，而是当你遇到"为什么这个组件渲染了两次""为什么状态更新没有立刻生效""为什么 key 换了之后组件重新挂载了"这类问题时，能从机制层面给出解释，而不是靠直觉猜测。

如果你也在用 Vue，下一篇[《Vue 底层原理》](/frontend-fundamentals/08-vue-internals)从响应式系统、编译优化等角度做了对比，可以对照着看。

推荐阅读：

- [React 官方文档 - Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state)
- [Dan Abramov - A Complete Guide to useEffect](https://overreacted.io/a-complete-guide-to-useeffect/)
- [React 源码中的 ReactFiberWorkLoop](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberWorkLoop.js)
- [Andrew Clark - React Fiber Architecture](https://github.com/acdlite/react-fiber-architecture)
