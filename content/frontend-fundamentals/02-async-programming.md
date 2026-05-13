---
title: "异步编程全貌"
date: 2026-05-13
tags:
  - JavaScript
  - 前端基础
sort: 2
summary: 从回调地狱到 async/await，JavaScript 的异步编程演进了好几代。这篇文章回顾 Promise 的实现原理、async/await 的本质、Generator 的协程思想，以及实际开发中的并发控制技巧。
---

# 异步编程全貌

JavaScript 是单线程的，但我们每天都在写异步代码。这个矛盾从语言诞生之初就存在，而围绕它的解决方案经历了好几轮进化。回调、Promise、Generator、async/await——每一代都在解决上一代留下的痛点。

这篇不打算从零讲"什么是异步"（事件循环的基础模型在[上一篇](/frontend-fundamentals/01-javascript-core)已经讲过），而是回顾这些机制背后的设计动机和实现原理。你可能每天都在用 async/await，但它底下到底发生了什么？Promise 的微任务调度是怎么回事？并发控制有哪些被忽视的坑？

## 回调模式：问题出在哪

回调本身没什么问题，它就是"把一个函数传给另一个函数，等事情办完了调它"。事件监听器、Node.js 的 fs 模块，到处都是回调。

真正出问题的是嵌套回调——所谓的"回调地狱"：

```javascript
getUser(userId, (err, user) => {
  if (err) return handleError(err);
  getOrders(user.id, (err, orders) => {
    if (err) return handleError(err);
    getOrderDetails(orders[0].id, (err, details) => {
      if (err) return handleError(err);
      // 终于拿到数据了...
    });
  });
});
```

不过说实话，嵌套只是表面问题，用命名函数拆开就能解决。更深层的问题是控制反转（Inversion of Control）：你把后续逻辑的执行权交给了别人。调用方没有任何保证——回调可能被调多次、可能不被调、可能同步调、可能在错误的时机调。

这才是 Promise 要解决的核心问题。

## Promise：一个状态机

### 三种状态

Promise 的设计其实非常简洁——它就是一个状态机，只有三种状态：

- pending（进行中）
- fulfilled（已完成）
- rejected（已拒绝）

状态只能从 pending 变为 fulfilled 或 rejected，变了就不能再变。这个不可变性是 Promise 可靠性的根基——它解决了回调模式的信任问题：结果只会被 resolve 一次，不会被意外覆盖。

### 微任务调度

Promise 的 `.then()` 回调不是同步执行的，也不是像 `setTimeout` 那样丢进宏任务队列，而是进入微任务队列（microtask queue）。

```javascript
console.log('1');

Promise.resolve().then(() => {
  console.log('2');
});

console.log('3');
// 输出：1, 3, 2
```

微任务在当前宏任务的同步代码全部执行完毕后、下一个宏任务开始前执行。而且微任务队列会被完全清空——如果一个微任务里又产生了新的微任务，它也会在本轮处理完：

```javascript
Promise.resolve().then(() => {
  console.log('微任务 1');
  Promise.resolve().then(() => {
    console.log('微任务 2');
  });
});

setTimeout(() => {
  console.log('宏任务');
}, 0);
// 输出：微任务 1, 微任务 2, 宏任务
```

这个特性在写业务代码时偶尔会踩坑——如果你在循环里不断产生微任务，理论上可以"饿死"宏任务队列（虽然实际场景中不太容易遇到）。

关于事件循环的完整规范，可以参考 [HTML Living Standard 的 Event Loop 章节](https://html.spec.whatwg.org/multipage/webappapis.html#event-loops)。

### 链式调用的实现

`.then()` 之所以能链式调用，关键在于它返回一个新的 Promise。这个新 Promise 的状态取决于 `.then()` 回调的返回值：

```javascript
fetch('/api/user')
  .then(res => res.json()) // 返回一个新 Promise
  .then(user => fetch(`/api/orders/${user.id}`)) // 返回值是 Promise，则"打平"
  .then(res => res.json())
  .then(orders => console.log(orders));
```

如果回调返回的是普通值，新 Promise 直接以该值 fulfill；如果返回的是另一个 Promise，新 Promise 会等它 settle 再跟着 settle。这个"自动打平 Promise"的行为（规范里叫 Promise Resolution Procedure）是链式调用能用得这么顺畅的原因。

简化一下核心逻辑，手写 Promise 的 `then` 大概长这样：

```javascript
class SimplePromise {
  constructor(executor) {
    this.state = 'pending';
    this.value = undefined;
    this.callbacks = [];

    const resolve = (value) => {
      if (this.state !== 'pending') return;
      this.state = 'fulfilled';
      this.value = value;
      this.callbacks.forEach(cb => cb.onFulfilled(value));
    };

    const reject = (reason) => {
      if (this.state !== 'pending') return;
      this.state = 'rejected';
      this.value = reason;
      this.callbacks.forEach(cb => cb.onRejected(reason));
    };

    try {
      executor(resolve, reject);
    } catch (e) {
      reject(e);
    }
  }

  then(onFulfilled, onRejected) {
    return new SimplePromise((resolve, reject) => {
      const handle = (fn, fallback) => (value) => {
        try {
          const result = (fn || fallback)(value);
          if (result instanceof SimplePromise) {
            result.then(resolve, reject);
          } else {
            resolve(result);
          }
        } catch (e) {
          reject(e);
        }
      };

      if (this.state === 'pending') {
        this.callbacks.push({
          onFulfilled: handle(onFulfilled, v => v),
          onRejected: handle(onRejected, e => { throw e; }),
        });
      } else if (this.state === 'fulfilled') {
        queueMicrotask(() => handle(onFulfilled, v => v)(this.value));
      } else {
        queueMicrotask(() => handle(onRejected, e => { throw e; })(this.value));
      }
    });
  }
}
```

这个版本省略了很多边界处理（比如 thenable 检测、循环引用检查），但核心思路就是这样。想完整过一遍的话，推荐看 [Promises/A+ 规范](https://promisesaplus.com/)，比 MDN 更底层。

### 错误处理的传播

Promise 链中的错误会沿着链条一直往下传播，直到碰到一个 `.catch()`（或者 `.then(null, onRejected)`）：

```javascript
fetch('/api/data')
  .then(res => res.json())
  .then(data => processData(data))
  .then(result => saveResult(result))
  .catch(err => {
    // 上面任何一步出错都会跑到这里
    console.error('出错了:', err);
  });
```

这比回调时代每一层都写 `if (err)` 优雅多了。但也有个容易被忽视的点：`.catch()` 自己也返回一个 Promise，如果 catch 回调正常返回（没有 throw），后续的 `.then()` 还是会正常执行：

```javascript
Promise.reject('boom')
  .catch(err => {
    console.log('已处理:', err);
    return 'recovered';
  })
  .then(val => {
    console.log(val); // 'recovered'
  });
```

这其实是 Promise 的"错误恢复"机制，有时候是你想要的，有时候不是。

## Generator 与协程

在聊 async/await 之前，得先说 Generator，因为 async/await 就是建立在它上面的。

Generator 函数可以暂停和恢复执行——这在 JavaScript 里是很特别的能力。普通函数一旦开始执行就必须跑完，Generator 可以在中途"让出"控制权：

```javascript
function* fibonacci() {
  let a = 0, b = 1;
  while (true) {
    yield a;
    [a, b] = [b, a + b];
  }
}

const gen = fibonacci();
gen.next(); // { value: 0, done: false }
gen.next(); // { value: 1, done: false }
gen.next(); // { value: 1, done: false }
gen.next(); // { value: 2, done: false }
```

`yield` 关键字让函数暂停执行并返回一个值，下次调用 `.next()` 时从暂停的地方继续。这种"可暂停的函数"在计算机科学里叫协程（coroutine）。准确地说，Generator 是半协程（semi-coroutine），因为控制权只能让给调用者，不能让给任意协程。

Generator 跟异步的关系在于：你可以 yield 一个 Promise，然后让一个外部"执行器"等 Promise settle 了再把结果送回来：

```javascript
function* fetchUserOrders(userId) {
  const user = yield fetch(`/api/users/${userId}`).then(r => r.json());
  const orders = yield fetch(`/api/orders/${user.id}`).then(r => r.json());
  return orders;
}
```

看着是不是已经很像 async/await 了？区别在于你需要一个执行器来驱动它。

### 自动执行器

```javascript
function runGenerator(genFn) {
  const gen = genFn();

  function step(result) {
    if (result.done) return Promise.resolve(result.value);

    return Promise.resolve(result.value).then(
      value => step(gen.next(value)),
      err => step(gen.throw(err))
    );
  }

  return step(gen.next());
}

runGenerator(function* () {
  const user = yield fetch('/api/user').then(r => r.json());
  const orders = yield fetch(`/api/orders/${user.id}`).then(r => r.json());
  console.log(orders);
});
```

这段代码做的事情：调用 `.next()` 拿到 yield 出来的 Promise，等它 resolve 了，把值通过下一次 `.next(value)` 送回 Generator，重复这个过程直到 done 为 true。

当年 [co](https://github.com/tj/co) 库做的就是这件事，在 async/await 还没进标准之前，很多 Node.js 项目都用 co + Generator 来写"同步风格的异步代码"。Babel 早期编译 async/await 的产物跟上面这段代码几乎一模一样。

## async/await 的本质

理解了 Generator + 自动执行器，async/await 就没什么神秘的了。

`async function` 本质上就是一个返回 Promise 的函数，`await` 就是 `yield` 的语法糖，引擎内置了自动执行器。

```javascript
async function fetchUserOrders(userId) {
  const user = await fetch(`/api/users/${userId}`).then(r => r.json());
  const orders = await fetch(`/api/orders/${user.id}`).then(r => r.json());
  return orders;
}
```

这段代码在语义上跟前面 Generator 版本完全等价。引擎在底层做的事情也差不多——碰到 await 就暂停当前函数，把后面的代码注册为微任务，等 Promise settle 了再恢复执行。

几个容易被忽略的细节：

`await` 后面不一定要跟 Promise。如果跟的是普通值，它会被 `Promise.resolve()` 包一层，所以 `await 42` 也是合法的——虽然没有实际的异步操作，但执行权还是会让出一次（产生一个微任务）。

`async function` 的返回值永远是 Promise。即使你 return 一个普通值，调用者拿到的也是 Promise：

```javascript
async function answer() {
  return 42;
}
answer().then(v => console.log(v)); // 42
```

错误处理方面，async/await 的好处是可以直接用 try/catch，跟同步代码的心智模型一致：

```javascript
async function loadData() {
  try {
    const res = await fetch('/api/data');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('加载失败:', err);
    return null;
  }
}
```

但也有个常见问题——忘记处理错误。一个没有 catch 的 Promise rejection 会变成 [unhandledrejection](https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event) 事件。在 Node.js 里，从 v15 开始未处理的 rejection 默认会让进程崩溃。

### 常见的性能陷阱

顺序 await 是最常见的性能问题：

```javascript
// 串行执行，两个请求互不依赖却要等上一个完成
async function slow() {
  const users = await fetch('/api/users').then(r => r.json());
  const posts = await fetch('/api/posts').then(r => r.json());
  return { users, posts };
}

// 并行执行，快得多
async function fast() {
  const [users, posts] = await Promise.all([
    fetch('/api/users').then(r => r.json()),
    fetch('/api/posts').then(r => r.json()),
  ]);
  return { users, posts };
}
```

说白了，只有后一个请求依赖前一个的结果时才应该用顺序 await。能并行的就并行。

## 并发控制

### Promise 静态方法全家桶

ES2015 到 ES2021 陆续加入了四个并发控制方法，各有各的适用场景：

`Promise.all()` 全部成功才成功，一个失败就全部失败。适合"所有数据都拿到才能继续"的场景。

```javascript
const [user, config, notifications] = await Promise.all([
  fetchUser(),
  fetchConfig(),
  fetchNotifications(),
]);
```

`Promise.allSettled()` 等所有 Promise 都 settle（不管成功还是失败），返回每个的结果。适合"尽量多拿数据，个别失败了也行"的场景。

```javascript
const results = await Promise.allSettled([
  fetchCriticalData(),
  fetchOptionalData(),
  fetchAnalytics(),
]);

results.forEach((result, i) => {
  if (result.status === 'fulfilled') {
    console.log(`任务 ${i} 成功:`, result.value);
  } else {
    console.warn(`任务 ${i} 失败:`, result.reason);
  }
});
```

`Promise.race()` 返回第一个 settle 的结果（不管成功失败）。最典型的用法是超时控制：

```javascript
async function fetchWithTimeout(url, ms) {
  return Promise.race([
    fetch(url),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('请求超时')), ms)
    ),
  ]);
}
```

`Promise.any()` 返回第一个成功的结果，全部失败才失败（抛出 [AggregateError](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AggregateError)）。适合"有一个成功就行"的场景，比如从多个 CDN 源加载资源：

```javascript
const image = await Promise.any([
  loadFromCDN1(url),
  loadFromCDN2(url),
  loadFromCDN3(url),
]);
```

### 并发池限制

实际开发中经常遇到这样的场景：有 100 个请求要发，但不能同时发出去——可能会打爆服务端、触发限流、或者浏览器连接数到上限。这时需要一个并发池来控制同时进行的任务数量。

核心思路很简单：维护一个计数器，同时进行的任务不超过 N 个，一个完成了再放下一个进来。

```javascript
async function concurrentPool(tasks, limit) {
  const results = [];
  const executing = new Set();

  for (const [index, task] of tasks.entries()) {
    const p = Promise.resolve().then(() => task());
    results[index] = p;
    executing.add(p);

    const clean = () => executing.delete(p);
    p.then(clean, clean);

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  return Promise.all(results);
}
```

用法：

```javascript
const urls = Array.from({ length: 100 }, (_, i) => `/api/item/${i}`);
const tasks = urls.map(url => () => fetch(url).then(r => r.json()));

const results = await concurrentPool(tasks, 5);
```

这里有个细节：`tasks` 数组里放的是函数（`() => fetch(url)`），不是直接放 `fetch(url)`。因为 Promise 一旦创建就开始执行了，如果直接写 `fetch(url)` 放进数组，100 个请求会立刻全部发出去，并发池就白写了。

生产环境里可以直接用 [p-limit](https://github.com/sindresorhus/p-limit) 这类成熟的库，但理解原理能让你在遇到更复杂的调度需求时自己扩展。

### 错误重试

网络请求失败了自动重试几次，这个模式太常见了：

```javascript
async function retry(fn, maxRetries = 3, delay = 1000) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise(r => setTimeout(r, delay * Math.pow(2, attempt)));
    }
  }
}

const data = await retry(() => fetch('/api/unstable').then(r => r.json()));
```

这里用了指数退避（exponential backoff）——每次重试的等待时间翻倍。这个策略在处理限流（429 Too Many Requests）时尤其有用，避免密集重试让情况变得更糟。

## 异步迭代

ES2018 引入了 `for await...of`，让异步数据流的消费变得很自然：

```javascript
async function* streamLines(url) {
  const response = await fetch(url);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      yield line;
    }
  }
  if (buffer) yield buffer;
}

for await (const line of streamLines('/api/stream')) {
  console.log(line);
}
```

`async function*` 是 async 和 Generator 的结合体——既能 await 异步操作，又能 yield 产生值序列。在处理 SSE、WebSocket 消息流、大文件逐行读取这些场景时特别好用。

## 最后

JavaScript 异步编程的进化路线其实很清晰：回调解决了"怎么做"，Promise 解决了"信任和组合"，Generator 提供了"暂停和恢复"的能力，async/await 把这些包装成最符合直觉的语法。

理解这条线上每一环的设计动机，比死记语法有用得多。下次碰到复杂的异步场景——比如需要取消正在进行的请求（[AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)）、管理竞态条件、或者编排多阶段的工作流——你就不会觉得无从下手。
