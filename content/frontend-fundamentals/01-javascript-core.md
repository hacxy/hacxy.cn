---
title: "JavaScript 核心机制"
date: 2026-05-13
tags:
  - JavaScript
  - 前端基础
sort: 1
summary: 事件循环、闭包、原型链、this 指向、作用域……这些 JS 核心概念你真的还记得吗？这篇文章帮你快速回顾这些机制的工作原理，不讲入门，只讲本质。
---

# JavaScript 核心机制

写了几年前端，回过头看这些"基础"，你会发现很多东西当初理解得并不到位。闭包是什么你能说出来，但为什么闭包能捕获外部变量？事件循环你天天在用，但 `Promise.then` 和 `setTimeout` 到底谁先跑？

这篇文章不从零讲起，直接聊这些机制是怎么工作的。

## 作用域与作用域链

JavaScript 采用词法作用域（Lexical Scope），作用域在代码编写时就已经确定，跟函数在哪里调用没关系，只跟函数在哪里定义有关。

```javascript
const name = 'global'

function outer() {
  const name = 'outer'
  function inner() {
    console.log(name) // 'outer'，不是 'global'
  }
  return inner
}

const fn = outer()
fn() // 即使在全局调用，inner 依然访问的是 outer 的作用域
```

作用域链的查找方向是单向的：从当前作用域往外找，找到就停，找不到就继续往外，直到全局作用域。如果全局也没有，`ReferenceError`。

`let` 和 `const` 引入了块级作用域，`var` 只有函数作用域。这个区别在循环里尤其明显：

```javascript
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0) // 3, 3, 3
}

for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0) // 0, 1, 2
}
```

用 `var` 的时候，整个循环共享同一个 `i`，等 `setTimeout` 回调执行时循环早就跑完了。`let` 则在每次迭代创建一个新的绑定，每个回调捕获的是各自那一轮的 `i`。

## 变量提升（Hoisting）

提升这个词容易让人产生误解——变量声明并不是"被搬到了顶部"，而是 JavaScript 引擎在执行代码之前会先进行一遍编译，在这个阶段把所有声明注册到对应的作用域里。

`var` 声明的变量会被提升并初始化为 `undefined`：

```javascript
console.log(a) // undefined
var a = 1
```

`let` 和 `const` 也会被提升，但不会初始化。从作用域顶部到声明语句之间的区域叫做暂时性死区（Temporal Dead Zone, TDZ），在这个区间内访问变量会抛 `ReferenceError`：

```javascript
console.log(b) // ReferenceError: Cannot access 'b' before initialization
let b = 2
```

函数声明会整体提升（包括函数体），而函数表达式不会：

```javascript
foo() // 正常执行
function foo() { console.log('ok') }

bar() // TypeError: bar is not a function
var bar = function() { console.log('ok') }
```

其实在日常开发中，用 `const`/`let` 并养成先声明再使用的习惯，提升问题基本不会困扰你。但面试和阅读老代码时，理解这个机制还是必要的。

## 闭包（Closure）

闭包的定义很简单：函数能够访问其词法作用域中的变量，即使该函数在其词法作用域之外执行。

但更关键的问题是——它是怎么做到的？

当一个函数被创建时，引擎会在函数对象上保存一个内部属性 `[[Environment]]`，指向该函数定义时所在的词法环境（Lexical Environment）。当外层函数执行完毕，如果它的词法环境仍然被某个内部函数的 `[[Environment]]` 引用着，这块环境就不会被垃圾回收。

```javascript
function createCounter() {
  let count = 0
  return {
    increment() { return ++count },
    getCount() { return count }
  }
}

const counter = createCounter()
counter.increment()
counter.increment()
counter.getCount() // 2
```

`createCounter` 执行完了，但 `count` 还活着，因为 `increment` 和 `getCount` 都通过 `[[Environment]]` 引用着 `createCounter` 的词法环境。

闭包的一个经典坑是循环引用导致的内存泄漏。不过在现代引擎中，如果闭包内实际没有引用外部变量，引擎会优化掉这些引用，不用太担心。真正需要注意的是那些无意中持有大对象引用的闭包——这个坑我踩过，一个事件监听器的回调里引用了一个巨大的 DOM 节点列表，页面切换后内存一直降不下来，排查了半天才发现问题出在闭包上。

## 原型链与继承

JavaScript 的继承模型基于原型链（Prototype Chain），和传统的基于类的继承有本质区别。

每个对象都有一个内部属性 `[[Prototype]]`（可以通过 `Object.getPrototypeOf()` 或非标准的 `__proto__` 访问），指向它的原型对象。当访问一个对象的属性时，如果对象自身没有这个属性，引擎会沿着原型链向上查找，直到找到该属性或者到达 `null`。

```javascript
const animal = {
  eat() { console.log('eating') }
}

const dog = Object.create(animal)
dog.bark = function() { console.log('woof') }

dog.bark() // 'woof' — 自身属性
dog.eat()  // 'eating' — 沿原型链找到 animal.eat
```

构造函数和 `class` 语法背后都是原型链在工作：

```javascript
class Person {
  constructor(name) { this.name = name }
  greet() { return `Hi, I'm ${this.name}` }
}

class Developer extends Person {
  constructor(name, lang) {
    super(name)
    this.lang = lang
  }
}

const dev = new Developer('Alice', 'TypeScript')
```

这段代码的原型链关系：

```
dev → Developer.prototype → Person.prototype → Object.prototype → null
```

`dev.greet()` 调用时，引擎先在 `dev` 自身找 `greet`，没有；再到 `Developer.prototype` 找，也没有；接着到 `Person.prototype` 找，找到了。

说白了，`class` 只是语法糖。`extends` 做的事情本质上就是 `Object.setPrototypeOf(Developer.prototype, Person.prototype)` 加上构造函数的处理。理解这一层，你才能真正搞懂 `instanceof` 的判断逻辑、`super` 的调用机制，以及为什么 mixin 模式在 JavaScript 中是可行的。

关于 `hasOwnProperty` 和 `in` 操作符的区别：`in` 会沿原型链查找，`hasOwnProperty` 只查自身。ES2022 引入的 `Object.hasOwn()` 是 `hasOwnProperty` 的替代方案，不会被对象自身的同名属性遮蔽，推荐使用。

## this 指向

`this` 是 JavaScript 里最让人困惑的概念之一。其实规则就那么几条，关键在于 `this` 的值取决于函数的调用方式，而不是定义位置。

### 四条基本规则

按优先级从高到低：

1. `new` 调用：`this` 指向新创建的对象
2. 显式绑定：`call`、`apply`、`bind` 指定的对象
3. 隐式绑定：通过对象调用时，`this` 指向该对象
4. 默认绑定：非严格模式下指向 `globalThis`，严格模式下为 `undefined`

```javascript
function greet() { console.log(this.name) }

const obj = { name: 'Alice', greet }

greet()           // undefined（严格模式）或 globalThis.name
obj.greet()       // 'Alice' — 隐式绑定
greet.call(obj)   // 'Alice' — 显式绑定
new greet()       // {} — new 绑定
```

### 隐式绑定丢失

这是实际开发中最常遇到的 `this` 问题：

```javascript
const obj = {
  name: 'Alice',
  greet() { console.log(this.name) }
}

const fn = obj.greet
fn() // undefined — this 不再指向 obj
```

赋值给变量后，调用方式变成了"默认绑定"，`this` 丢失。在回调函数中尤其容易踩坑：

```javascript
setTimeout(obj.greet, 100) // undefined — 同样是隐式绑定丢失
```

### 箭头函数

箭头函数没有自己的 `this`，它会捕获定义时外层作用域的 `this`，而且无法通过 `call`/`apply`/`bind` 修改：

```javascript
const obj = {
  name: 'Alice',
  greet: () => {
    console.log(this.name) // 这里的 this 是外层作用域的 this，不是 obj
  },
  delayGreet() {
    setTimeout(() => {
      console.log(this.name) // 'Alice' — 箭头函数捕获了 delayGreet 的 this
    }, 100)
  }
}
```

在 React 的 class 组件时代，箭头函数解决了大量的 `this` 绑定问题。现在用 hooks 的话倒是不怎么需要操心这个了。

## 事件循环（Event Loop）

JavaScript 是单线程的，但它能处理异步操作，靠的就是事件循环机制。理解事件循环对于调试异步 bug、优化性能都至关重要。

### 执行模型

JavaScript 的运行时由以下几部分协作：

- **调用栈（Call Stack）**：同步代码在这里执行，后进先出
- **微任务队列（Microtask Queue）**：`Promise.then`/`catch`/`finally`、`queueMicrotask`、`MutationObserver`
- **宏任务队列（Macrotask Queue）**：`setTimeout`、`setInterval`、`setImmediate`（Node.js）、I/O、UI 渲染

事件循环的一轮是这样的：

1. 从宏任务队列取一个任务执行（整个 script 脚本本身算第一个宏任务）
2. 执行完后，清空整个微任务队列（包括在清空过程中新产生的微任务）
3. 如果有需要，执行 UI 渲染
4. 回到第 1 步

关键点在第 2 步：微任务队列会被完全清空后，才会取下一个宏任务。这意味着微任务的优先级始终高于宏任务。

### 经典输出题

```javascript
console.log('1')

setTimeout(() => {
  console.log('2')
}, 0)

Promise.resolve().then(() => {
  console.log('3')
}).then(() => {
  console.log('4')
})

console.log('5')
```

输出顺序：`1 → 5 → 3 → 4 → 2`

分析：
- `console.log('1')` — 同步，立即执行
- `setTimeout` 回调 → 放入宏任务队列
- `Promise.then` 回调 → 放入微任务队列
- `console.log('5')` — 同步，立即执行
- 同步代码执行完，清空微任务队列 → 打印 3，然后 `.then(() => console.log('4'))` 又产生一个微任务，继续清空 → 打印 4
- 微任务队列清空后，取下一个宏任务 → 打印 2

### async/await 的本质

`async/await` 是 Promise 的语法糖。`await` 后面的表达式会被执行，然后函数的剩余部分被包装成 `.then` 的回调，放入微任务队列：

```javascript
async function foo() {
  console.log('a')
  await Promise.resolve()
  console.log('b') // 这一行等价于放在 Promise.resolve().then(() => {...}) 里
}

foo()
console.log('c')

// 输出：a → c → b
```

关于 Promise 原理、Generator、并发控制等更深入的异步编程话题，参见本系列下一篇[《异步编程全貌》](/frontend-fundamentals/02-async-programming)。

### requestAnimationFrame 的位置

`requestAnimationFrame`（rAF）既不是宏任务也不是微任务，它在渲染步骤之前执行。在一轮事件循环中，顺序是：宏任务 → 微任务 → rAF 回调 → 渲染。不过浏览器不一定每轮都渲染，通常按 60fps 来，大约 16.6ms 一次。

更详细的 Event Loop 规范可以参考 [HTML 标准中的 Event Loop 章节](https://html.spec.whatwg.org/multipage/webappapis.html#event-loops)。

## 综合：这些机制如何交织

这些概念并不是孤立的，它们经常在实际代码中交织出现。看一个综合例子：

```javascript
function createDelayLogger(prefix) {
  // 闭包捕获 prefix
  return function(msg, delay) {
    // 箭头函数捕获外层 this（此处是默认绑定）
    setTimeout(() => {
      // 宏任务回调
      Promise.resolve(`${prefix}: ${msg}`).then(text => {
        // 微任务
        console.log(text)
      })
    }, delay)
  }
}

const log = createDelayLogger('[App]')
log('started', 0)
log('loaded', 0)

// 两个 setTimeout 回调分别是两个宏任务
// 每个宏任务执行时会创建一个微任务
// 输出：[App]: started → [App]: loaded
```

闭包让 `prefix` 在 `createDelayLogger` 返回后仍然可用，`setTimeout` 把回调放到宏任务队列，回调内部的 `Promise.then` 又进入微任务队列。理解了各个机制，读这种嵌套的异步代码就不会犯晕。

## 最后

这些机制说起来都不复杂，每一条规则拆开看都挺清晰的。但组合到一起、混进真实业务代码里，就容易打结。我的建议是不用死记这些规则，但要建立起正确的心智模型——知道引擎在"编译时做了什么、运行时按什么顺序执行、内存里保留了什么"，碰到奇怪行为时就能自己推导出原因，而不是靠猜。

如果想深入某个方向，推荐直接读 [ECMAScript 规范](https://tc39.es/ecma262/) 和 [MDN Web Docs](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript)，比任何二手资料都靠谱。
