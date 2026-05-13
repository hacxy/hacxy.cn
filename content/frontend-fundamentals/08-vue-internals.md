---
title: "Vue 底层原理"
date: 2026-05-13
tags:
  - Vue
  - 前端基础
sort: 8
summary: Vue 3 的响应式为什么换成了 Proxy？虚拟 DOM 的 diff 和 React 有什么不同？编译器做了哪些优化让运行时更快？这篇文章深入 Vue 的内部机制，搞清楚框架帮你做了什么。
---

# Vue 底层原理

用 Vue 写业务写久了，很容易停留在"会用"的阶段——知道 `ref` 是响应式的、`computed` 会缓存、模板写了就能渲染。但当你遇到性能瓶颈、排查诡异的更新时序 bug，或者在技术选型时需要说清楚 Vue 的优势，光会用就不够了。

这篇文章不打算从零教你 Vue 怎么用，而是拆开框架看看里面的齿轮是怎么咬合的。

## 响应式系统演进

### Vue 2 的 Object.defineProperty

Vue 2 的响应式方案大家都熟悉——遍历 data 对象的每个属性，用 `Object.defineProperty` 把它们转成 getter/setter：

```javascript
function defineReactive(obj, key, val) {
  const dep = new Dep()
  Object.defineProperty(obj, key, {
    get() {
      if (Dep.target) {
        dep.depend()
      }
      return val
    },
    set(newVal) {
      if (newVal === val) return
      val = newVal
      dep.notify()
    }
  })
}
```

这套方案跑了好几年，够用，但有几个绕不开的问题：

- 新增和删除属性检测不到，所以才有了 `Vue.set` 和 `Vue.delete` 这两个"补丁 API"
- 数组的索引赋值和 length 修改无法拦截，Vue 2 只能重写数组的 7 个变异方法（push/pop/shift/unshift/splice/sort/reverse）
- 初始化时需要递归遍历整个对象树，深层嵌套的大对象会有明显的性能开销

这些不是 Vue 的设计问题，是 `Object.defineProperty` 这个 API 本身的局限。

### Vue 3 的 Proxy 方案

Vue 3 换成 Proxy 之后，上面的问题基本都解决了：

```javascript
function reactive(target) {
  return new Proxy(target, {
    get(target, key, receiver) {
      track(target, key)
      const result = Reflect.get(target, key, receiver)
      if (isObject(result)) {
        return reactive(result) // 惰性转换
      }
      return result
    },
    set(target, key, value, receiver) {
      const oldValue = target[key]
      const result = Reflect.set(target, key, value, receiver)
      if (oldValue !== value) {
        trigger(target, key)
      }
      return result
    },
    deleteProperty(target, key) {
      const result = Reflect.deleteProperty(target, key)
      trigger(target, key)
      return result
    }
  })
}
```

几个关键的改进：

Proxy 是对整个对象的代理，不需要逐个属性定义，新增属性、删除属性、数组索引修改都能被拦截。另外注意上面的惰性转换——只有在访问到嵌套对象时才递归创建 Proxy，而不是初始化时一次性全部转换。这对大型数据结构的初始化性能改善很大。

当然 Proxy 也有代价——不支持 IE11。Vue 3 发布时这是个真实的取舍，尤大在 [Vue 3 设计过程](https://increment.com/frontend/making-vue-3/) 中专门讨论过这个决定。

### reactive、ref 和 effect 的关系

Vue 3 响应式系统的三个核心概念：

- `reactive` 用 Proxy 包装对象
- `ref` 用一个带 `.value` 的对象包装原始值（因为 Proxy 只能代理对象）
- `effect` 是底层的副作用函数，`watchEffect`、`computed`、组件渲染函数最终都走这条路

依赖收集和派发更新的流程是这样的：

```javascript
// 简化版 effect
let activeEffect = null

function effect(fn) {
  activeEffect = fn
  fn() // 执行时触发 getter，完成依赖收集
  activeEffect = null
}

const targetMap = new WeakMap()

function track(target, key) {
  if (!activeEffect) return
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }
  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = new Set()))
  }
  dep.add(activeEffect)
}

function trigger(target, key) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return
  const dep = depsMap.get(key)
  if (dep) {
    dep.forEach(effect => effect())
  }
}
```

这里用 `WeakMap<Target, Map<Key, Set<Effect>>>` 这个三层结构来存储依赖关系。WeakMap 的好处是不会阻止目标对象被垃圾回收。

实际源码里还有很多细节处理：effect 的调度（scheduler）、嵌套 effect 的栈管理、避免无限循环的递归检测、`triggerRef` 的强制触发等。但核心思路就是上面这个"跑一遍函数 → 收集依赖 → 数据变了 → 重新跑"的循环。

对比 React 的话，React 没有自动依赖追踪这一层。React 通过 `setState` 显式标记"某个状态变了"，然后从组件树顶部开始重新渲染。Vue 知道具体是哪个数据变了，能精确地只更新依赖这个数据的组件。这是两种完全不同的更新策略，谈不上谁好谁坏，但确实影响了各自的性能优化方向。

## 虚拟 DOM 与 Diff 算法

### Vue 的双端对比

Vue 2 和 Vue 3 的 diff 算法有些差异，但核心思路类似——双端对比（two-end comparison）。

拿 Vue 3 来说，它处理一组子节点更新时的策略是：

1. 从头部开始，逐个对比新旧节点，相同类型的就 patch，直到遇到不同的
2. 从尾部开始，同样逐个对比，直到遇到不同的
3. 如果旧节点已遍历完但新节点还有剩余，挂载新节点
4. 如果新节点已遍历完但旧节点还有剩余，卸载旧节点
5. 如果中间还有一段乱序的部分，用最长递增子序列（LIS）算法来最小化 DOM 移动

```javascript
// 第 5 步的核心逻辑简化
// 对于中间乱序部分：
// - 建立新节点 key → index 的映射
// - 遍历旧节点，找到在新序列中的对应位置
// - 计算最长递增子序列，只移动不在子序列中的节点
```

这个 LIS 的优化很聪明。假设你有一个列表 `[A, B, C, D, E]` 变成 `[A, D, B, E, C]`，它不会傻傻地移动每一个元素，而是找出哪些元素的相对顺序没变（递增子序列），只移动那些"乱了"的。

### 和 React 的 diff 有什么不同

React 的 diff 策略相对简单粗暴一些——单向遍历，用 key 建立映射，逐个处理。React 不做双端对比，也不计算 LIS。它的假设是：大部分情况下列表变动不会太复杂，简单策略就够了。

具体来说，React 遍历新的 children 列表，对每个节点在旧列表中找对应 key。找到后，如果旧节点的位置比上一个已处理旧节点的位置小，就需要移动。

这意味着对于"把列表第一个元素移到最后"这种操作，React 需要移动除了第一个以外的所有节点，而 Vue 只需要移动一个节点。当然，实际业务中这种极端情况不多，两者的性能差异通常不明显。

不过这也解释了为什么 Vue 的基准测试成绩往往比 React 好看一点——在 diff 层面 Vue 确实做了更多优化。但 Vue 真正的性能优势不在 diff 算法本身，而在编译优化。

## 编译优化

这是 Vue 3 相比 React 最大的结构性优势。Vue 有编译器，能在构建时分析模板，给运行时提供大量提示信息。React 的 JSX 本质上就是函数调用，没有编译优化的空间（至少在 React 19 之前是这样，React Compiler 是另一个话题了）。

### 静态提升（hoistStatic）

看一个简单的模板：

```vue
<template>
  <div>
    <p>这是一段静态文本</p>
    <p>{{ message }}</p>
  </div>
</template>
```

编译之后，静态的 VNode 会被提升到渲染函数外面：

```javascript
const _hoisted_1 = createVNode("p", null, "这是一段静态文本")

function render(ctx) {
  return createVNode("div", null, [
    _hoisted_1, // 复用同一个对象，不需要重新创建
    createVNode("p", null, ctx.message)
  ])
}
```

`_hoisted_1` 只在模块初始化时创建一次，后续每次重新渲染都直接引用，跳过创建和 diff 两个步骤。在一个有大量静态内容的页面里，这个优化的效果是很显著的。

### PatchFlag

Vue 编译器会给动态节点标记 PatchFlag，告诉运行时这个节点哪里是动态的：

```javascript
createVNode("p", { class: dynamicClass, id: "static" }, text, PatchFlags.CLASS | PatchFlags.TEXT)
```

运行时拿到这个标记后，diff 时就知道只需要检查 `class` 和文本内容，`id` 和其他属性直接跳过。

常见的 PatchFlag 值：

- `TEXT` — 只有文本是动态的
- `CLASS` — 只有 class 是动态的
- `STYLE` — 只有 style 是动态的
- `PROPS` — 有动态的非 class/style 属性
- `FULL_PROPS` — 有动态 key 的属性（需要完整 diff）

相比之下，React 每次渲染都需要完整对比所有 props，因为 JSX 层面没有"哪些是静态的"这个信息。

### Block Tree

PatchFlag 解决了单个节点的优化，Block Tree 解决的是"怎么快速找到动态节点"。

Vue 3 引入了 Block 的概念。一个 Block 会收集它内部所有的动态子节点到一个扁平数组里：

```javascript
const block = openBlock()
// ... 创建子节点
const vnode = createBlock("div", null, children, PatchFlags.STABLE_FRAGMENT)
// vnode.dynamicChildren = [动态节点1, 动态节点2, ...]
```

更新时，运行时不需要遍历整个虚拟 DOM 树，而是直接遍历 `dynamicChildren` 这个扁平数组。对于一个有 100 个节点但只有 3 个动态节点的组件，diff 的工作量从 O(100) 降到 O(3)。

这就是尤大经常提到的"编译信息辅助的虚拟 DOM"——模板的约束反而变成了优势，编译器能提取出足够的信息让运行时走捷径。可以看看他在 [Vue 3 Deep Dive](https://www.youtube.com/watch?v=HvpMhKtfXPM) 中的详细讲解。

需要注意的是，`v-if` 和 `v-for` 会创建新的 Block，因为它们改变了 DOM 的结构，导致 `dynamicChildren` 不再稳定。

### 事件处理缓存

模板中的事件处理函数也会被缓存：

```vue
<template>
  <button @click="handleClick">Click</button>
</template>
```

编译为：

```javascript
function render(ctx, cache) {
  return createVNode("button", {
    onClick: cache[0] || (cache[0] = ($event) => ctx.handleClick($event))
  }, "Click")
}
```

第一次渲染时创建事件处理函数并存入 cache，后续渲染直接复用。这避免了因为内联函数引用变化导致的不必要的子组件更新——React 里你需要手动用 `useCallback` 来做这件事（或者等 React Compiler 帮你做）。

## 模板编译过程

聊完编译优化，顺便说一下整个模板编译的流程。Vue 的 `template` 到最终渲染经过三步：

### Parse → Transform → Codegen

```
template 字符串
    ↓ parse
AST（抽象语法树）
    ↓ transform
带优化信息的 AST
    ↓ codegen
render 函数代码字符串
```

**Parse** 阶段把模板字符串解析成 AST。Vue 3 的 parser 是全新写的，不再用正则表达式，而是基于状态机的逐字符解析，更快也更健壮。

**Transform** 阶段对 AST 做各种转换和优化标记：

- 识别静态节点和动态节点
- 分析 PatchFlag
- 处理 `v-if`、`v-for`、`v-model` 等指令，转化为对应的运行时辅助函数
- 标记 Block 边界

**Codegen** 阶段把处理后的 AST 生成可执行的 render 函数代码。

你可以在 [Vue Template Explorer](https://template-explorer.vuejs.org/) 里实时看到任意模板编译后的输出，对理解编译优化很有帮助。

另外，Vue 3 的编译器是平台无关的。核心编译逻辑在 `@vue/compiler-core`，Web 平台的特定处理在 `@vue/compiler-dom`，SSR 的在 `@vue/compiler-ssr`。这种分层设计让 Vue 可以更方便地适配不同的渲染目标。

## 组件实例与生命周期的内部流程

一个 Vue 组件从创建到挂载，内部大致经过这些步骤：

```
createApp(App).mount('#app')
    ↓
创建组件实例（componentInstance）
    ↓
setupComponent()
  → 处理 props / slots
  → 执行 setup() 函数
  → 如果没有 setup，处理 Options API（data/computed/methods...）
    ↓
setupRenderEffect()
  → 创建一个 ReactiveEffect，关联组件的 render 函数
  → 首次执行 render → 生成 VNode 树 → patch 到真实 DOM
    ↓
挂载完成，触发 onMounted
```

组件更新时的流程：

```
响应式数据变化
    ↓
trigger → 触发组件的 ReactiveEffect
    ↓
把更新任务推入微任务队列（不会同步执行）
    ↓
微任务队列 flush
    ↓
执行 render → 生成新 VNode 树 → diff & patch
    ↓
DOM 更新完成，触发 onUpdated
```

这里有个关键点：更新是异步批量的。如果你在一个同步函数里连续修改三个响应式变量，不会触发三次渲染，而是只触发一次。Vue 把更新任务推入微任务队列，在当前同步代码执行完之后才统一处理。

这也引出了 `nextTick` 的话题。

## nextTick 的实现

`nextTick` 本质上就是把回调推入微任务队列，确保在 DOM 更新之后执行：

```javascript
const resolvedPromise = Promise.resolve()
let currentFlushPromise = null
const pendingQueue = []

function queueJob(job) {
  if (!pendingQueue.includes(job)) {
    pendingQueue.push(job)
    queueFlush()
  }
}

function queueFlush() {
  if (!currentFlushPromise) {
    currentFlushPromise = resolvedPromise.then(flushJobs)
  }
}

function nextTick(fn) {
  const p = currentFlushPromise || resolvedPromise
  return fn ? p.then(fn) : p
}
```

Vue 2 的 `nextTick` 经历过好几版实现——从 `MutationObserver` 到 `setTimeout` 到 `Promise`，中间还踩过不少坑（比如 `MutationObserver` 在 iOS WebView 里的问题）。Vue 3 直接用 `Promise.resolve().then()` 一把梭，因为不再支持 IE 了，没必要搞那些降级方案。

理解了这个机制，你就知道为什么修改数据后立刻读取 DOM 拿到的还是旧值了——DOM 更新在微任务里，你的同步代码先执行完。

## Composition API 的设计动机

Options API 用了这么多年，为什么 Vue 3 要搞一套 Composition API？

最根本的原因是代码组织。Options API 按选项类型分组（data 放一块、methods 放一块、computed 放一块），但实际开发中，一个功能的逻辑往往分散在好几个选项里。组件一大，你就得在不同选项之间反复跳转才能看清一个功能的全貌。尤大在 [Composition API RFC](https://github.com/vuejs/rfcs/blob/master/active-rfcs/0013-composition-api.md) 里用了很直观的色块图来说明这个问题。

另外几个动机：

- 逻辑复用。Vue 2 的 mixin 有命名冲突和来源不清晰的问题。Composition API 通过普通函数（composables）来复用逻辑，参数传递和返回值都是显式的
- TypeScript 支持。Options API 的 `this` 上下文类型推导很难做好，Composition API 里所有东西都是普通变量和函数，TypeScript 原生就能推导
- Tree-shaking。Options API 的 `this.$watch`、`this.$nextTick` 这些实例方法不管你用没用都会被打包进去。Composition API 改成按需 import，没用到的就能被 tree-shake 掉

但 Composition API 并不是 Options API 的替代品，两者可以共存。对于简单组件，Options API 依然很清晰。Composition API 的优势主要体现在复杂组件和跨组件逻辑复用上。

从内部实现来看，Options API 实际上是在 Composition API 之上构建的。`data()` 返回的对象会被 `reactive()` 包装，`computed` 选项会被转成 `computed()` 调用，`watch` 选项会被转成 `watch()` 调用。所以 Options API 并没有什么"专属的"底层机制，它本质上是 Composition API 的语法糖。

```javascript
// Vue 3 内部处理 Options API 的 data 选项（简化）
if (dataOption) {
  const data = isFunction(dataOption) ? dataOption.call(instance) : dataOption
  instance.data = reactive(data)
}
```

## 把这些串起来

回过头来看，Vue 的设计哲学还是挺清晰的：用编译时的工作换取运行时的性能。

React 选择了"一切都是 JavaScript"的路线，表达力极强，但运行时需要做更多的工作（所以才有 Fiber、useMemo、React Compiler 这些补救措施）。Vue 选择了约束更强的模板语法，但换来了编译器能做更多优化——静态提升、PatchFlag、Block Tree、事件缓存，这些都是编译器"免费"帮你做的。

两种思路都有道理，不存在绝对的优劣。但如果你用 Vue，了解这些底层机制能帮你写出更好的代码——比如知道什么时候该用 `shallowRef` 而不是 `ref`，知道 `v-once` 和 `v-memo` 背后发生了什么，知道为什么 `key` 对列表渲染的性能至关重要。

想更深入地了解 Vue 的内部实现，推荐直接读 [Vue 3 源码](https://github.com/vuejs/core)。`packages/reactivity` 是响应式系统，`packages/runtime-core` 是运行时核心，`packages/compiler-core` 是编译器核心，每个包都比较独立，可以分开看。
