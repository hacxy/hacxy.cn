---
title: 前端八股文回顾：那些年反复被问的知识点
date: 2026-05-16
tags:
  - 前端
  - JavaScript
  - CSS
  - 面试
summary: 把前端面试中高频出现的核心知识点过一遍——JS 基础、异步、浏览器渲染、网络协议、性能优化、框架原理。不是面经，是一次系统性的查漏补缺。
---

# 前端八股文回顾：那些年反复被问的知识点

"八股文"这个词在前端圈子里有点贬义——暗示死记硬背、脱离实际。但说实话，这些知识点之所以反复被问，是因为它们确实构成了前端开发的底层认知。你可以不背，但不能不懂。

这篇文章把高频知识点按模块过一遍，重点讲**为什么是这样**，而不是让你背答案。

## JavaScript 基础

### 数据类型

JS 有 7 种原始类型和 1 种引用类型：

- 原始类型：`string`、`number`、`bigint`、`boolean`、`undefined`、`symbol`、`null`
- 引用类型：`object`（包括 Array、Function、Date、RegExp 等）

原始类型存在栈上，引用类型的值存在堆上、栈上存的是引用地址。这个区别直接决定了赋值和比较的行为：

```javascript
let a = { name: 'hacxy' }
let b = a
b.name = 'changed'
console.log(a.name) // 'changed' —— a 和 b 指向同一个对象
```

`typeof null === 'object'` 这个 bug 从 JS 诞生第一天就存在了，V8 团队曾经想修但怕搞坏太多线上代码，就一直留着。判断 null 直接用 `=== null`。

### 原型链

每个对象都有一个 `[[Prototype]]` 内部属性（通过 `__proto__` 或 `Object.getPrototypeOf()` 访问），指向它的原型对象。属性查找会沿着这条链往上走，直到 `null`。

```javascript
function Person(name) {
  this.name = name
}
Person.prototype.greet = function() {
  return `Hi, I'm ${this.name}`
}

const p = new Person('hacxy')
// p.__proto__ === Person.prototype
// Person.prototype.__proto__ === Object.prototype
// Object.prototype.__proto__ === null
```

`new` 做了四件事：创建空对象 → 链接原型 → 执行构造函数（this 指向新对象）→ 返回对象。ES6 的 `class` 本质上是语法糖，底层还是原型链那一套。

### 作用域与闭包

JS 有三种作用域：全局、函数、块级（`let`/`const`）。

闭包就是函数能访问它定义时所在作用域的变量，即使那个作用域已经执行完毕。没什么神秘的，就是词法作用域 + 函数是一等公民的自然结果。

```javascript
function createCounter() {
  let count = 0
  return {
    inc: () => ++count,
    get: () => count
  }
}

const counter = createCounter()
counter.inc() // 1
counter.inc() // 2
// count 变量在 createCounter 执行完后依然存活
```

经典面试题——循环里的 `var`：

```javascript
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0)
}
// 输出 3 3 3，因为 var 没有块级作用域，三个回调共享同一个 i
// 换成 let 就是 0 1 2，每次循环都创建新的绑定
```

### this 指向

`this` 不是在定义时确定的，而是在调用时确定的（箭头函数除外）：

| 调用方式 | this 指向 |
|---------|----------|
| `obj.fn()` | `obj` |
| `fn()` | 全局对象（严格模式下 `undefined`） |
| `new fn()` | 新创建的对象 |
| `fn.call(ctx)` / `fn.apply(ctx)` | `ctx` |
| `fn.bind(ctx)()` | `ctx` |
| `() => {}` | 定义时外层的 this，永远不变 |

箭头函数的 this 是词法绑定的——它不是"没有 this"，而是继承外层作用域的 this。这就是为什么在 React 类组件里，事件处理器要么用箭头函数、要么在构造函数里 bind。

## 异步编程

### Event Loop

浏览器的事件循环机制是单线程异步的核心。简单说就是一个不断重复的流程：

1. 执行同步代码（调用栈）
2. 调用栈清空后，检查微任务队列（microtask），全部执行完
3. 取一个宏任务（macrotask）执行
4. 回到第 2 步

**微任务**：`Promise.then`、`MutationObserver`、`queueMicrotask`
**宏任务**：`setTimeout`、`setInterval`、I/O、UI 渲染

`requestAnimationFrame` 比较特殊——它的回调在每一帧的渲染步骤开始前执行，在微任务之后、Paint 之前，不属于宏任务队列。

```javascript
console.log('1')

setTimeout(() => console.log('2'), 0)

Promise.resolve().then(() => {
  console.log('3')
  Promise.resolve().then(() => console.log('4'))
})

console.log('5')

// 输出：1 5 3 4 2
```

这里的关键在于：微任务会在当前宏任务结束后、下一个宏任务开始前**全部清空**，包括在微任务中新产生的微任务。所以 3 后面紧跟 4，然后才是 setTimeout 的 2。

### Promise

Promise 的三种状态：`pending` → `fulfilled` / `rejected`，状态一旦确定就不可变。

几个容易搞混的点：

```javascript
// .then 返回新的 Promise，这是链式调用的基础
Promise.resolve(1)
  .then(v => v + 1)
  .then(v => console.log(v)) // 2

// .catch 其实就是 .then(undefined, onRejected)
// 但它能捕获前面整条链的错误，而 .then 的第二个参数只能捕获当前步的

// Promise.all —— 全部成功才成功，一个失败就失败
// Promise.allSettled —— 等所有都结束，不管成功失败
// Promise.race —— 第一个结束的结果（成功或失败都算）
// Promise.any —— 第一个成功的结果，全失败才失败
```

### async/await

`async` 函数返回 Promise，`await` 暂停执行等待 Promise 结果。本质上是 Generator + Promise 的语法糖。

一个常见的性能问题：

```javascript
// 串行——慢，两个请求依次执行
const a = await fetchA()
const b = await fetchB()

// 并行——快，同时发起
const [a, b] = await Promise.all([fetchA(), fetchB()])
```

错误处理用 `try/catch`，但不要每个 `await` 都套一层——在最外面包一个就行，或者用 `.catch()` 处理特定的失败。

## 浏览器渲染

### 从 URL 到页面

输入 URL 到页面显示，这个流程面试问烂了，但确实串联了很多知识点：

1. **DNS 解析**：域名 → IP 地址（先查本地缓存、hosts 文件，再递归查 DNS 服务器）
2. **TCP 连接**：三次握手建立连接（HTTPS 还要 TLS 握手）
3. **发送 HTTP 请求**：带上请求头、Cookie 等
4. **服务器处理并返回响应**
5. **浏览器解析渲染**：HTML 和 CSS 并行解析，合并成 Render 树，然后走 Layout → Paint → Composite

整个流程的可视化：

<img src="/images/frontend-fundamentals-review/url-to-page.svg" alt="从 URL 到页面渲染的完整流程图" width="100%" style="max-width:680px" />

### 重排与重绘

**重排（Reflow）**：元素的几何属性（尺寸、位置）变化，触发 Layout 重新计算。代价最高。
**重绘（Repaint）**：只是外观变化（颜色、阴影），不影响布局。代价较低。

触发重排的操作：改变 width/height/margin/padding、读取 offsetTop/scrollTop（浏览器为了返回准确值会强制刷新布局队列）、添加/删除 DOM 节点、窗口 resize。

优化手段：
- 批量修改样式：用 `className` 切换而不是逐条改 `style`
- 读写分离：不要在循环里一边读 `offsetTop` 一边写 `style`
- 用 `transform` 代替 `top/left`（transform 只触发合成，不触发重排重绘）
- 离屏操作：`DocumentFragment` 或者先 `display: none` 再操作再显示

### 关键渲染路径

CSS 会阻塞渲染（浏览器需要 CSSOM 才能构建 Render 树），JS 会阻塞 HTML 解析（因为 JS 可能修改 DOM）。所以：

- CSS 放 `<head>` 里，尽早加载
- JS 放 `<body>` 底部，或者用 `defer`（HTML 解析完再执行，按顺序）/ `async`（下载完就执行，不保证顺序）

## CSS 核心概念

### 盒模型

标准盒模型：`width` 只包含 content
IE 盒模型 / `border-box`：`width` 包含 content + padding + border

实际开发基本都用 `border-box`，在全局样式里设一下就完事了：

```css
*, *::before, *::after {
  box-sizing: border-box;
}
```

### BFC

Block Formatting Context——块级格式化上下文。说白了就是一个独立的渲染区域，内部的布局不会影响外部。

触发 BFC 的方式：`overflow` 不为 `visible`、`display: flow-root`、`float`、`position: absolute/fixed`、flex/grid 子项。

BFC 能解决的问题：
- margin 塌陷（相邻元素的 margin 合并）
- 清除浮动（包含浮动子元素的父容器高度塌陷）
- 阻止文字环绕浮动元素

现在有了 `display: flow-root`，专门用来创建 BFC，语义比 `overflow: hidden` 清晰多了。

### Flex 和 Grid

Flex 是一维布局（主轴 + 交叉轴），Grid 是二维布局（行 + 列）。不是谁替代谁的关系，用法不同：

- 导航栏、工具栏、卡片行列 → Flex
- 整体页面布局、复杂网格 → Grid
- 两者可以嵌套使用

Flex 的几个容易忘的点：
- `flex: 1` 等于 `flex: 1 1 0%`（grow shrink basis）
- flex 子项默认 `min-width: auto`，内容超长时不会收缩到比内容更小——长文本溢出容器通常就是这个原因，加 `min-width: 0` 或 `overflow: hidden` 解决
- `flex-shrink` 的收缩量不是等比的，而是按 `flex-shrink * flex-basis` 的权重分配
- `align-self` 可以让单个子项在交叉轴上有不同的对齐方式
- `gap` 属性现在 Flex 也支持了，不用再搞 margin hack

Grid 容易忽略的：
- `fr` 单位和百分比不一样——`fr` 是分配剩余空间，百分比是相对容器总宽度。混用 `fr` 和固定宽度时差别很大
- `minmax(0, 1fr)` 和 `1fr` 在内容超出时行为不同，前者允许内容被压缩

## 网络协议

### HTTP 缓存

分为强缓存和协商缓存：

**强缓存**（不发请求，直接用本地缓存）：
- `Cache-Control: max-age=31536000`（优先级高）
- `Expires: Thu, 01 Dec 2027 16:00:00 GMT`（老方案，受本地时间影响）

**协商缓存**（发请求问服务器，返回 304 或新内容）：
- `ETag` / `If-None-Match`（内容哈希，精确）
- `Last-Modified` / `If-Modified-Since`（时间戳，精度到秒）

实际项目的缓存策略通常是：HTML 不缓存或短时间缓存 + 协商缓存，静态资源（JS/CSS/图片）带 hash 指纹 + 强缓存一年。

### HTTPS

在 HTTP 和 TCP 之间加了一层 TLS。握手过程（TLS 1.3 简化版）：

1. 客户端发 ClientHello（支持的加密套件、随机数）
2. 服务端返回 ServerHello（选定的加密套件、证书、随机数）
3. 客户端验证证书，双方通过密钥交换算法（ECDHE）生成对称密钥
4. 后续通信用对称加密

非对称加密用于握手阶段的密钥交换，对称加密用于实际数据传输——因为非对称加密太慢了。

### HTTP/2 和 HTTP/3

HTTP/2 的改进：
- 多路复用：一个 TCP 连接上并行传输多个请求/响应，解决了 HTTP/1.1 的队头阻塞
- 头部压缩（[HPACK](https://httpwg.org/specs/rfc7541.html)，基于静态/动态字典的头部压缩算法）
- 服务端推送（实际用的人不多）
- 二进制分帧

HTTP/3 把传输层从 TCP 换成了 QUIC（基于 UDP），彻底解决了 TCP 层面的队头阻塞问题，握手也更快（0-RTT）。

### 跨域

浏览器的同源策略限制了不同源之间的资源访问。同源 = 协议 + 域名 + 端口都相同。

解决方案：
- **CORS**：服务端设置 `Access-Control-Allow-Origin` 等响应头。简单请求直接发，复杂请求先发 OPTIONS 预检
- **代理**：开发环境用 Vite/Webpack 的 proxy 配置，生产环境用 Nginx 反代
- JSONP：利用 `<script>` 标签没有跨域限制的特性，只支持 GET，基本淘汰了

## 性能优化

这部分不死记方案，理解思路更重要——性能优化的本质就是**少加载、早加载、快渲染**。

### 加载优化

- 代码分割（Code Splitting）：路由懒加载、动态 `import()`
- Tree Shaking：ES Module 静态分析，打包时去掉未使用的导出
- 图片优化：WebP/AVIF 格式、响应式图片（`srcset`）、懒加载（`loading="lazy"`）
- 压缩：Gzip / Brotli
- CDN：静态资源就近访问

### 渲染优化

- 虚拟列表：长列表只渲染可见区域的 DOM 节点
- `requestAnimationFrame`：把动画逻辑放到下一帧之前执行，避免掉帧
- 防抖（debounce）和节流（throttle）：控制高频事件的回调执行频率
- Web Worker：把 CPU 密集计算放到独立线程

### 指标

[Core Web Vitals](https://web.dev/articles/vitals) 是 Google 定义的核心性能指标：

- **LCP**（Largest Contentful Paint）：最大内容元素渲染时间，目标 < 2.5s
- **INP**（Interaction to Next Paint）：交互到下一帧的延迟，目标 < 200ms
- **CLS**（Cumulative Layout Shift）：累计布局偏移，目标 < 0.1

## React 核心原理

### 虚拟 DOM 与 Diff

React 用 JS 对象（虚拟 DOM）描述 UI 结构，状态变化时生成新的虚拟 DOM 树，和旧树对比（Diff），算出最小的 DOM 操作集合，再批量更新真实 DOM。

Diff 策略（React 的启发式算法）：
1. 只比较同层节点，不跨层比较
2. 不同类型的元素直接销毁重建
3. 通过 `key` 识别列表中的元素是否可复用

所以列表渲染一定要给 `key`，而且不要用 index 做 key——元素顺序变化时会导致错误复用。

### Fiber 架构

React 16 引入 Fiber，把渲染工作拆成可中断的小单元。以前的递归渲染（Stack Reconciler）一旦开始就不能停，长任务会卡住主线程。Fiber 让 React 可以：

- 暂停渲染去处理高优先级任务（比如用户输入）
- 把低优先级的更新延后
- 复用之前已经完成的工作

这就是 `useTransition` 和 `useDeferredValue` 等 API 的底层基础。

### Hooks 原理

Hooks 的状态存在 Fiber 节点上，以链表的形式按调用顺序排列。这就是为什么 Hooks 不能放在条件语句或循环里——顺序必须保持一致，否则链表会错位。

```javascript
// React 内部大致是这样追踪的（简化版）
// 第一次渲染：
useState('a')  // Hook 0 → state: 'a'
useEffect(fn)  // Hook 1 → effect: fn
useState('b')  // Hook 2 → state: 'b'

// 下一次渲染时按同样的顺序读取
// 如果中间少了一个 Hook，后面的全部错位
```

`useEffect` 的清理函数在下一次 effect 执行之前调用，或者组件卸载时调用。依赖数组是浅比较——对象和数组每次渲染都是新引用，所以要用 `useMemo` 稳定引用，或者只放原始值。

## 安全

### XSS

Cross-Site Scripting，攻击者注入恶意脚本到页面中。分三种：

- **存储型**：恶意脚本存到数据库，其他用户访问时执行（最危险）
- **反射型**：恶意脚本在 URL 参数中，服务端拼接到 HTML 返回
- **DOM 型**：前端 JS 直接把不可信数据插入 DOM（比如 `innerHTML`）

防御：
- 输出编码：HTML 实体转义
- React 默认会转义 JSX 中的表达式，但 `dangerouslySetInnerHTML` 不会
- CSP（Content Security Policy）限制脚本来源
- HttpOnly Cookie 防止 JS 读取

### CSRF

Cross-Site Request Forgery，利用用户已登录的身份发起恶意请求。

防御：
- CSRF Token：服务端生成随机 token，表单提交时带上
- SameSite Cookie：设置 `SameSite=Strict` 或 `Lax`
- 验证 Origin / Referer 头

## 写在最后

八股文的价值不在于背诵本身，在于通过这些知识点建立前端开发的全局视角。你不需要能默写 Event Loop 的每一步，但你需要在遇到"为什么 setTimeout 的回调比 Promise.then 晚执行"这种问题时，知道往哪个方向想。

说个真实经历：之前排查一个页面卡顿问题，翻了半天代码最后发现是在滚动事件里读了 `offsetTop` 又写了 `style.top`，触发了强制同步布局。如果不知道重排的触发条件，这种 bug 可能永远找不到原因。所谓八股，就是在这种时候救你的东西。
