---
title: "浏览器渲染与性能"
date: 2026-05-13
tags:
  - 浏览器
  - 性能优化
  - 前端基础
sort: 3
summary: 浏览器从拿到 HTML 到渲染出像素，中间经历了什么？重排和重绘的区别到底在哪？合成层又是什么？这篇文章带你重新理清浏览器渲染流水线的每个阶段。
---

# 浏览器渲染与性能

你肯定知道"减少重排"这种说法，但你真的清楚一次重排到底牵扯了多少事吗？浏览器渲染流水线这个话题，说大不大，说小不小——大部分时候你不需要关心它，但一旦遇到性能瓶颈，不理解底层机制就只能靠猜。

这篇文章不从零讲起，默认你已经知道 DOM 是什么、CSS 怎么写。我们直接进入浏览器拿到资源之后的事情。

## 关键渲染路径

关键渲染路径（Critical Rendering Path，CRP）是浏览器从收到 HTML 字节到屏幕上出现像素的完整过程。理解 CRP 的意义在于：你能判断哪些资源真正阻塞了首屏渲染，哪些可以延后。

整个流程大致是这样的：

```
HTML 字节 → DOM 树
CSS 字节  → CSSOM 树
           ↓
       渲染树（Render Tree）
           ↓
       Layout（布局）
           ↓
       Paint（绘制）
           ↓
       Composite（合成）
           ↓
       屏幕像素
```

看起来是线性的，但实际执行并不完全按顺序来。浏览器会尽可能并行和增量处理，比如 HTML 解析到一半就开始构建部分 DOM，遇到 CSS 链接就并行请求。但有些东西确实会卡住流程——这就是为什么我们总在说"渲染阻塞资源"。

### DOM 和 CSSOM 的构建

HTML 解析器逐字节读取 HTML，构建 DOM 树。这个过程是增量的，解析到哪就建到哪。但碰到 `<script>` 标签（没有 `async` 或 `defer`）就会停下来，等脚本下载执行完才继续——因为脚本可能调用 `document.write()` 改变后续的 HTML 结构。

CSSOM 的构建则不太一样。CSS 不像 HTML 那样可以增量解析，浏览器必须拿到完整的样式表才能构建 CSSOM。原因很简单：CSS 的级联特性意味着后面的规则可能覆盖前面的，不看完就没法确定最终样式。

这就引出一个关键点：CSS 是渲染阻塞资源。浏览器在 CSSOM 构建完成之前不会渲染任何内容。所以把关键 CSS 内联到 `<head>` 里，非关键 CSS 异步加载，是有道理的。

### 渲染树

DOM + CSSOM 合并成渲染树。渲染树只包含需要显示的节点——`display: none` 的元素不在其中（但 `visibility: hidden` 的在，因为它仍然占据布局空间）。`<head>`、`<script>` 这些不可见元素同样不会进入渲染树。

渲染树里的每个节点都带有计算后的样式信息，浏览器知道每个节点长什么样，但还不知道它在哪、多大。

## Layout、Paint、Composite

这三步是渲染流水线的核心，也是性能优化最需要关注的地方。

### Layout（布局 / 重排）

Layout 阶段计算每个元素的几何信息：位置、大小、边距。浏览器从渲染树的根节点开始，递归地计算每个节点的盒模型。

Layout 是比较贵的操作，因为一个元素的尺寸变化可能连锁影响到很多其他元素。想想看，你改了一个 `div` 的宽度，它的子元素、兄弟元素、甚至父元素的布局可能都要重新算。

### Paint（绘制 / 重绘）

Layout 算出了每个元素的几何信息后，Paint 阶段把它们转化为实际的像素。这一步处理的是视觉属性：颜色、背景、阴影、文字渲染等。

Paint 的输出不是直接画到屏幕上的，而是生成一系列绘制指令（Paint Records），记录"在坐标 (x, y) 画一个宽 w 高 h 的矩形，填充颜色 #fff"这类信息。

### Composite（合成）

现代浏览器不会把所有内容画在一个图层上。页面会被分成多个图层（Layer），每个图层独立绘制，最后由合成器（Compositor）把它们叠在一起。

合成阶段在 GPU 上执行，速度很快。这也是为什么触发合成而不触发 Layout 和 Paint 的 CSS 属性（比如 `transform` 和 `opacity`）性能更好——它们跳过了最贵的两步。

## 重排与重绘

这是面试里被问烂了的话题，但很多人对触发条件的理解还停留在表面。

### 什么触发重排

重排（Reflow）意味着浏览器需要重新计算元素的几何信息。以下操作会触发：

- 修改影响布局的 CSS 属性：`width`、`height`、`margin`、`padding`、`border`、`font-size`、`position`、`display`、`top`/`left`/`right`/`bottom` 等
- 增删 DOM 节点
- 修改元素的类名或内联样式（如果影响布局）
- 窗口 resize
- 读取某些布局属性（后面展开说）

重排一定伴随重绘，但重绘不一定触发重排。

### 什么只触发重绘

只修改视觉外观、不改变几何信息的操作只会触发重绘：

- `color`、`background-color`、`box-shadow`、`outline`
- `visibility`（注意不是 `display`）

### 强制同步布局

这个坑很多人踩过。浏览器通常会把多次 DOM 修改攒在一起，在下一帧统一处理。但如果你在修改 DOM 之后立刻读取布局属性，浏览器就不得不立刻执行 Layout——这叫强制同步布局（Forced Synchronous Layout）。

```javascript
// 反面教材：强制同步布局
const elements = document.querySelectorAll('.item');
for (let i = 0; i < elements.length; i++) {
  // 先写
  elements[i].style.width = box.offsetWidth + 'px';
  // offsetWidth 是读操作，但 box 不在循环内修改，这里其实还好
}

// 真正的问题是这种模式：
for (let i = 0; i < elements.length; i++) {
  elements[i].style.width = elements[i].offsetWidth * 2 + 'px';
  // 每次循环：写 style → 读 offsetWidth → 浏览器被迫立刻 Layout
  // 这就是 layout thrashing
}
```

修复方式很直接——先把要读的值全部读完，再统一写入：

```javascript
// 读写分离
const widths = [];
for (let i = 0; i < elements.length; i++) {
  widths.push(elements[i].offsetWidth);
}
for (let i = 0; i < elements.length; i++) {
  elements[i].style.width = widths[i] * 2 + 'px';
}
```

哪些属性的读取会触发强制 Layout？常见的有 `offsetWidth`、`offsetHeight`、`offsetTop`、`offsetLeft`、`clientWidth`、`clientHeight`、`scrollTop`、`scrollHeight`、`getComputedStyle()`、`getBoundingClientRect()` 等。Paul Irish 维护了一份完整的列表：[What forces layout/reflow](https://gist.github.com/paulirish/5d52fb081b3570c81e3a)，值得收藏。

## 合成层与 GPU 加速

理解合成层是做动画性能优化的关键。

浏览器在绘制阶段会把页面拆分成多个图层。大部分元素都在同一个图层上，但某些条件会让浏览器为一个元素单独创建图层（提升为合成层）：

- 使用 `transform: translate3d()`、`translateZ()`、`scale3d()` 等 3D 变换
- 使用 `will-change: transform`（或 `opacity`）
- 使用 `position: fixed`
- 使用了硬件加速的 `<video>`、`<canvas>`、`<iframe>`
- 有一个兄弟元素已经是合成层，且当前元素在它上面（隐式合成）

合成层的好处是：对它的 `transform` 和 `opacity` 修改只需要重新合成，不需要重新 Layout 和 Paint。GPU 直接处理图层的变换和混合，比 CPU 逐像素绘制快得多。

但合成层不是越多越好。每个图层都要占用 GPU 内存，过多的图层反而会导致性能下降。尤其要注意隐式合成——当一个 `z-index` 较高的元素被提升为合成层时，它下面的重叠元素也会被迫提升，可能在你不知道的情况下创建出大量图层。

在 Chrome DevTools 的 Layers 面板可以查看页面的图层结构和每个图层被创建的原因，排查的时候很有用。

## requestAnimationFrame

聊动画就绕不开 `requestAnimationFrame`（rAF）。它的核心价值是让你的代码在浏览器下一次重绘之前执行，通常是每秒 60 次（对应 60fps）。

为什么不用 `setTimeout` 或 `setInterval` 做动画？因为它们的回调时机不确定，可能在帧的任何时刻触发。如果回调在帧中间执行了一次 DOM 修改，浏览器要么等到下一帧才显示变化（视觉延迟），要么在当前帧强制重排（性能损耗）。

```javascript
// 用 rAF 做动画
function animate() {
  element.style.transform = `translateX(${position}px)`;
  position += 2;
  if (position < 300) {
    requestAnimationFrame(animate);
  }
}
requestAnimationFrame(animate);
```

rAF 还有个好处：当页面不可见时（比如切换了标签页），回调会自动暂停，省电省资源。

一个实用技巧是利用 rAF 来避免强制同步布局。如果你需要在事件回调里修改 DOM，可以把写操作放到 rAF 里：

```javascript
window.addEventListener('scroll', () => {
  // 读操作在事件回调里做
  const scrollTop = document.documentElement.scrollTop;

  // 写操作推迟到下一帧
  requestAnimationFrame(() => {
    header.style.transform = `translateY(${scrollTop * 0.5}px)`;
  });
});
```

不过要注意，rAF 里如果还是先写后读，照样会触发强制布局。rAF 只是帮你对齐了执行时机，不能替你解决读写顺序问题。

## 性能优化实践

把前面的知识串起来，落到具体操作上。

### 善用 transform 和 opacity 做动画

这两个属性只触发 Composite，是做动画的最佳选择。能用 `transform` 实现的效果就别用 `top`/`left`：

```css
/* 别这样 */
.animate-bad {
  transition: left 0.3s;
  position: relative;
  left: 0;
}
.animate-bad:hover {
  left: 100px;
}

/* 用这个 */
.animate-good {
  transition: transform 0.3s;
}
.animate-good:hover {
  transform: translateX(100px);
}
```

同样，淡入淡出用 `opacity` 而不是 `visibility` 或者改 `rgba` 的 alpha 值。

### will-change 的正确用法

`will-change` 告诉浏览器某个属性即将变化，浏览器可以提前做优化（通常是提升为合成层）。但它不是万能药：

```css
/* 正确：在即将发生动画的时候使用 */
.card:hover {
  will-change: transform;
}
.card:active {
  transform: scale(0.95);
}

/* 也可以在父元素 hover 时声明 */
.card-container:hover .card {
  will-change: transform;
}
```

不要这样用：

```css
/* 错误：给所有元素无条件加 will-change */
* {
  will-change: transform;
}

/* 错误：永久放在元素上 */
.some-element {
  will-change: transform, opacity;
}
```

`will-change` 会消耗额外的内存和 GPU 资源。它应该是"马上要动了"才加上，动完了就移除。如果你把它写死在样式表里，浏览器就没法释放那些预分配的资源了。

如果需要用 JavaScript 控制，可以在动画结束后移除：

```javascript
element.addEventListener('transitionend', () => {
  element.style.willChange = 'auto';
});
```

### 批量修改 DOM

前面说了读写分离可以避免 layout thrashing。除此之外还有几个常用技巧：

用 `DocumentFragment` 批量插入节点：

```javascript
const fragment = document.createDocumentFragment();
for (let i = 0; i < 100; i++) {
  const item = document.createElement('div');
  item.textContent = `Item ${i}`;
  fragment.appendChild(item);
}
container.appendChild(fragment);
```

或者更直接地，用 `display: none` 把元素从渲染树中摘除，批量修改完再显示：

```javascript
container.style.display = 'none';
// 一堆 DOM 操作...
container.style.display = 'block';
```

不过说实话，现代框架（React、Vue）的虚拟 DOM 已经帮你处理了大部分批量更新的问题。手动操作 DOM 的场景越来越少，但理解原理总没坏处。

### 利用 CSS Containment

`contain` 属性告诉浏览器某个元素的内部变化不会影响外部布局，浏览器可以跳过对外部的重新计算：

```css
.widget {
  contain: layout paint;
}
```

- `contain: layout` —— 元素内部的布局变化不影响外部
- `contain: paint` —— 元素内部的绘制不会溢出边界
- `contain: size` —— 元素的大小不依赖子元素
- `contain: content` —— 等价于 `layout paint`（但不含 `size`）
- `contain: strict` —— 等价于 `layout paint size`

对于页面上大量重复的卡片、列表项这类组件，加上 `contain: content` 效果比较明显。

### 用 DevTools 定位问题

理论说再多，最后还是要看数据。Chrome DevTools 的 Performance 面板是分析渲染性能的主要工具：

1. 打开 Performance 面板，点录制，操作页面，停止
2. 看 Main 线程的火焰图，找到长任务（标红的就是超过 50ms 的）
3. 关注 Layout、Paint 事件的耗时和触发频率
4. 如果看到大量紫色（Layout）或绿色（Paint）块，说明有优化空间

Rendering 面板（在 DevTools 的更多工具里）也很有用：

- Paint flashing —— 高亮正在重绘的区域，一眼看出哪些区域在不必要地重绘
- Layout Shift Regions —— 显示布局偏移
- Layer borders —— 显示合成层边界

更多细节可以看 Chrome 官方文档：[Analyze runtime performance](https://developer.chrome.com/docs/devtools/performance) 和 [web.dev 的渲染性能指南](https://web.dev/articles/rendering-performance)。

## 小结

浏览器渲染流水线的核心是 DOM → CSSOM → Render Tree → Layout → Paint → Composite 这条链路。性能优化的本质就是尽量让你的操作在这条链路上走得更短：

- 能只触发 Composite 就别触发 Paint
- 能只触发 Paint 就别触发 Layout
- 必须触发 Layout 的话，尽量减少影响范围

记住这个原则，再配合 DevTools 看实际数据，大部分渲染性能问题都能找到方向。
