---
title: "CSS 布局与视觉格式化"
date: 2026-05-13
tags:
  - CSS
  - 前端基础
sort: 5
summary: BFC 到底是什么？Flex 和 Grid 的底层布局逻辑有什么区别？层叠上下文的优先级怎么算？这篇文章重新梳理 CSS 布局体系中那些容易混淆的核心概念。
---

# CSS 布局与视觉格式化

CSS 布局体系经过二十多年的演进，从最早的 table 布局、float 布局，到现在的 Flexbox 和 Grid，工具越来越好用。但与此同时，底层那些概念——盒模型、格式化上下文、层叠规则——反而容易被忽略。很多时候写样式"感觉对了"就过了，但真遇到诡异的布局问题，还是得回到这些基础上找答案。

这篇文章不会从零讲起，而是把那些"你可能知道但不一定记清楚"的点重新过一遍。

## 盒模型

每个元素在页面上都会生成一个矩形盒子，由四层组成：content → padding → border → margin。这个没什么好说的，关键是 `box-sizing` 的区别。

标准盒模型（`content-box`）下，`width` 和 `height` 只管 content 区域，padding 和 border 另算。IE 盒模型（`border-box`）下，`width` 包含了 padding 和 border。

现在几乎所有项目都会在全局设置：

```css
*, *::before, *::after {
  box-sizing: border-box;
}
```

这么做的理由很实际：你给一个元素设 `width: 200px`，它在页面上就占 200px，不会因为加了 padding 撑大。如果你维护的老项目没有这行全局 reset，改布局的时候要格外小心——同样的 `width` 值，在两种盒模型下算出的实际尺寸不一样。

一个容易踩坑的地方：`box-sizing` 不影响 margin。不管是哪种盒模型，margin 都不算在 `width` 里面。

## BFC：Block Formatting Context

BFC 大概是面试被问得最多、但日常写代码时想得最少的概念了。它本质上就是一个独立的渲染区域，内部元素的布局不会影响外部。

### 触发条件

以下任一条件可以创建一个新的 BFC（完整列表见 [MDN: Block formatting context](https://developer.mozilla.org/en-US/docs/Web/Guide/CSS/Block_formatting_context)）：

- 根元素 `<html>`
- `float` 不为 `none`
- `position` 为 `absolute` 或 `fixed`
- `display` 为 `inline-block`、`flow-root`、`table-cell`、`table-caption`
- `overflow` 不为 `visible`（比如 `auto`、`hidden`、`scroll`）
- `display: flex` 或 `display: grid` 的直接子元素
- `contain` 为 `layout`、`content` 或 `paint`

其中 `display: flow-root` 是专门为创建 BFC 设计的，没有副作用，是目前最干净的方式。如果你还在用 `overflow: hidden` 来创建 BFC，可以考虑换成 `flow-root`。

### 实际应用

BFC 解决的主要是三个问题：

清除浮动——BFC 容器会包含内部的浮动元素，不会让高度塌陷：

```css
.container {
  display: flow-root;
}
```

阻止 margin 合并——BFC 边界会阻止内外元素的 margin 合并（下面会展开讲）。

防止文字环绕浮动元素——BFC 容器不会和同级的浮动元素重叠：

```html
<div style="float: left; width: 100px; height: 100px; background: lightblue;"></div>
<div style="display: flow-root;">
  这段文字不会环绕左边的浮动元素，而是独占右侧空间。
</div>
```

## Margin 合并

这个行为让很多人困惑过。在正常文档流中，相邻的块级元素的垂直 margin 会合并成一个，取较大值而非相加。

合并发生的三种情况：

1. 相邻兄弟元素的上下 margin
2. 父元素与第一个/最后一个子元素的 margin（如果中间没有 padding、border 或 BFC 边界阻隔）
3. 空的块级元素自身的上下 margin

```css
.box-a { margin-bottom: 30px; }
.box-b { margin-top: 20px; }
```

这两个相邻元素之间的间距是 30px，不是 50px。

阻止合并的办法很多，但本质都是在两个 margin 之间制造一个"屏障"：

- 给父元素加 `padding-top` / `padding-bottom`（哪怕 1px）
- 给父元素加 `border-top` / `border-bottom`
- 让父元素创建新的 BFC
- 用 Flexbox 或 Grid 布局（它们的子元素不参与 margin 合并）

顺便提一句，`margin: auto` 不参与合并。而且水平方向的 margin 永远不合并——合并只发生在垂直方向的 block-level 盒子之间。

## position 各值的差异

`position` 有五个值，每个都有自己的定位逻辑和包含块规则。

`static` 是默认值，元素在正常文档流中，`top`/`right`/`bottom`/`left` 不生效，`z-index` 也无效。

`relative` 元素仍然占据原来的空间，但可以通过 `top`/`left` 等偏移属性做视觉上的位移。偏移不影响其他元素的布局位置。

`absolute` 元素脱离文档流，相对于最近的非 `static` 祖先定位。如果找不到，就相对于初始包含块（通常是视口）。这里有个常见套路：

```css
.parent {
  position: relative;
}
.child {
  position: absolute;
  top: 0;
  right: 0;
}
```

`fixed` 也脱离文档流，但相对于视口定位，滚动页面时位置不变。不过有个陷阱：如果祖先元素设了 `transform`、`perspective` 或 `filter`，`fixed` 定位会退化，改为相对于那个祖先元素定位。这个行为在 [CSS Transforms 规范](https://www.w3.org/TR/css-transforms-1/#propdef-transform) 中有定义，但实际碰到的时候很容易让人困惑。

`sticky` 是 `relative` 和 `fixed` 的混合体：正常情况下跟 `relative` 一样，滚动到阈值后"粘住"，表现像 `fixed`。需要注意的是，`sticky` 只在其包含块范围内生效——当包含块滚出视口后，sticky 元素也会跟着离开。

```css
.sticky-header {
  position: sticky;
  top: 0;
}
```

还有一点容易忽略：`sticky` 元素的包含块是其最近的滚动祖先。如果父元素的 `overflow` 不是 `visible`，sticky 可能不会按你预期的方式工作。

## Flexbox 布局

Flexbox 解决的是一维方向上的对齐和分配问题。它的核心概念是两根轴：主轴（main axis）和交叉轴（cross axis）。

### 轴与方向

`flex-direction` 决定主轴方向：`row`（默认，水平）或 `column`（垂直）。交叉轴永远与主轴垂直。

这里要注意，`justify-content` 永远作用于主轴，`align-items` / `align-self` 永远作用于交叉轴。不管主轴是水平还是垂直，这个规则不变。很多人把 `justify-content` 记成"水平对齐"，一旦 `flex-direction: column` 就乱了。

### flex-grow / flex-shrink / flex-basis

这三个属性控制弹性子项如何分配空间，经常被混用。

`flex-basis` 定义了子项在分配剩余空间之前的初始大小。默认值是 `auto`，意思是看 `width`（主轴为水平时）或 `height`（主轴为垂直时），如果没设就用内容大小。

`flex-grow` 决定剩余空间如何分配。如果三个子项的 `flex-grow` 分别是 1、2、1，那剩余空间按 1:2:1 分配。默认值是 0，即不增长。

`flex-shrink` 决定空间不够时如何收缩，但计算方式和 grow 不同——它是按 `flex-shrink * flex-basis` 的比例来缩减的，而不仅仅按 shrink 系数的比例。这意味着 basis 更大的元素实际缩减的像素也更多。默认值是 1。

一个实际的例子：

```css
.container {
  display: flex;
  width: 600px;
}

.item-a {
  flex: 1 1 200px; /* grow:1, shrink:1, basis:200px */
}

.item-b {
  flex: 2 1 100px; /* grow:2, shrink:1, basis:100px */
}
```

三个 basis 加起来 300px，容器 600px，剩余 300px。item-a 分到 100px（1/3），item-b 分到 200px（2/3）。最终 item-a 宽 300px，item-b 宽 300px。

简写 `flex: 1` 等于 `flex: 1 1 0%`（注意 basis 是 0%，不是 auto），和 `flex: 1 1 auto` 行为不同。前者让所有子项忽略内容大小，纯粹按比例分配；后者则先考虑内容的自然大小，再分配剩余空间。

### flex-wrap

默认情况下 Flex 容器不换行，所有子项挤在一行里（会触发 shrink）。设 `flex-wrap: wrap` 后允许换行，这时候 `align-content` 才有意义——它控制多行之间的间距分配。

## Grid 布局

Grid 处理的是二维布局，比 Flexbox 多了一个维度，概念也更多。

### 核心术语

Grid 有几个关键概念：

- 轨道（track）：一行或一列就是一个轨道
- 线（line）：轨道之间的分隔线，从 1 开始编号
- 区域（area）：由多条线围成的矩形区域
- 单元格（cell）：最小的区域单位

```css
.grid {
  display: grid;
  grid-template-columns: 200px 1fr 1fr;
  grid-template-rows: auto 1fr auto;
  gap: 16px;
}
```

`fr` 单位表示剩余空间的比例份额，跟 Flexbox 的 `flex-grow` 概念类似，但语法更直观。`1fr` 的计算发生在固定尺寸（px、%、minmax 的 min）分配完之后。

### 显式网格 vs 隐式网格

`grid-template-columns` 和 `grid-template-rows` 定义的是显式网格。当子项超出显式网格范围时，浏览器会自动创建隐式轨道来容纳它们。

隐式轨道的大小默认是 `auto`（取决于内容大小），可以用 `grid-auto-rows` 和 `grid-auto-columns` 控制：

```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: 100px;
  grid-auto-rows: 60px; /* 超出的行高 60px */
}
```

这是个容易忽略的细节——如果你只定义了一行但有六个子项，后面的子项会出现在隐式行中，尺寸可能和你预期的不一样。

### 区域命名

`grid-template-areas` 提供了一种可视化的布局定义方式：

```css
.layout {
  display: grid;
  grid-template-areas:
    "header header header"
    "sidebar main main"
    "footer footer footer";
  grid-template-columns: 200px 1fr 1fr;
  grid-template-rows: auto 1fr auto;
}

.header { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main { grid-area: main; }
.footer { grid-area: footer; }
```

这种写法最大的好处是可读性好，布局结构一目了然。但有个限制：区域必须是矩形，不能 L 形或 T 形。

### minmax 和 auto-fill / auto-fit

`minmax()` 在响应式布局中非常有用：

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}
```

这行代码实现了"每列最小 250px，自动填充尽可能多的列，剩余空间均分"。不用媒体查询就能做响应式网格。

`auto-fill` 和 `auto-fit` 的区别：`auto-fill` 会保留空轨道（即使没有子项填充），`auto-fit` 会把空轨道折叠为 0，让现有的子项撑满容器。内容少的时候差别很明显，内容填满时没区别。

## Flexbox vs Grid 怎么选

简单说：一维用 Flex，二维用 Grid。但现实中界限没这么清晰。

Flexbox 更适合：组件内部的对齐（按钮组、导航栏、工具栏），内容驱动的布局（子项大小不确定，让内容决定分配）。

Grid 更适合：页面整体框架（header/sidebar/main/footer），需要行列同时对齐的网格，明确的二维结构。

两者可以嵌套使用——Grid 做外层框架，Flex 做组件内部排列，这种组合很常见。

## 居中方案

居中大概是 CSS 里被讨论最多的话题了。这里列几个常用的，都是 2026 年还在用的方案：

Flexbox 居中，最通用的方案：

```css
.center {
  display: flex;
  justify-content: center;
  align-items: center;
}
```

Grid 居中，最简洁的写法：

```css
.center {
  display: grid;
  place-items: center;
}
```

`place-items: center` 是 `align-items: center` + `justify-items: center` 的简写。

absolute + transform，不需要知道元素尺寸：

```css
.center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
```

absolute + inset + margin auto，需要固定尺寸：

```css
.center {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 200px;
  height: 100px;
}
```

如果只需要水平居中，块级元素用 `margin: 0 auto` 就够了，行内元素用 `text-align: center`。这些基础方案别忘了。

## 层叠上下文（Stacking Context）

层叠上下文决定了元素在 z 轴上的绘制顺序。这是 CSS 里最容易踩坑的地方之一——很多人以为 `z-index` 越大就越靠前，但实际上 `z-index` 只在同一个层叠上下文内比较。

### 创建条件

以下情况会创建新的层叠上下文（完整列表见 [MDN: Stacking context](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_positioned_layout/Understanding_z-index/Stacking_context)）：

- 根元素 `<html>`
- `position` 为 `absolute` / `relative` / `fixed` / `sticky` 且 `z-index` 不为 `auto`
- `opacity` 小于 1
- `transform` 不为 `none`
- `filter` 不为 `none`
- `will-change` 指定了会创建层叠上下文的属性
- `isolation: isolate`
- Flex/Grid 子项且 `z-index` 不为 `auto`
- `contain` 为 `layout` 或 `paint`

### z-index 陷阱

经典的坑：一个元素的 `z-index: 9999` 被另一个 `z-index: 1` 的元素盖住了。这种情况几乎总是因为它们不在同一个层叠上下文里。

```html
<div class="a" style="position: relative; z-index: 1;">
  <div class="a-child" style="position: relative; z-index: 9999;">
    我 z-index 是 9999，但还是被 B 盖住了
  </div>
</div>
<div class="b" style="position: relative; z-index: 2;">
  B：我的 z-index 只有 2
</div>
```

`.a-child` 的 `z-index: 9999` 只在 `.a` 创建的层叠上下文内有效。`.a` 和 `.b` 在同一层级比较，`.a` 的 `z-index: 1` 小于 `.b` 的 `z-index: 2`，所以 `.a` 的整棵子树都在 `.b` 下面。

解决办法：要么提高 `.a` 的 `z-index`，要么干脆不让 `.a` 创建层叠上下文（去掉它的 `z-index` 或改为 `auto`），让 `.a-child` 在更高层级参与比较。

### 层叠顺序

在同一个层叠上下文内，绘制顺序从下到上是：

1. 层叠上下文的背景和边框
2. `z-index` 为负值的子层叠上下文
3. 正常文档流中的块级盒子
4. 浮动元素
5. 正常文档流中的行内/行内块元素
6. `z-index: 0` / `auto` 的定位元素
7. `z-index` 为正值的子层叠上下文

注意第 4 和第 5 点：浮动元素在块级盒子之上，但在行内内容之下——这就是为什么文字会环绕浮动元素，而不是被挡住。

### 实用技巧

`isolation: isolate` 是一个很干净的创建层叠上下文的方式，没有其他视觉副作用。适合用在组件根元素上，让组件内部的 `z-index` 不会泄漏到外面：

```css
.modal-overlay {
  isolation: isolate;
}
```

在实际项目中，建议用 CSS 变量统一管理 `z-index`，避免数值竞赛：

```css
:root {
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-modal: 300;
  --z-toast: 400;
}
```

## 写在最后

CSS 布局这套体系说复杂也复杂，说简单也简单——核心概念就那么几个，盒模型、格式化上下文、层叠上下文、弹性布局、网格布局。但这些概念之间的交互才是真正考验功力的地方。

比如你知道 `transform` 会创建层叠上下文，也知道它会影响 `fixed` 定位的包含块——这两个单独拿出来都好理解，但合在一起就可能制造出非常诡异的 bug。

遇到布局问题的时候，与其反复调数值碰运气，不如回到这些基础概念上推理一下。大部分时候，答案就在 [CSS 规范](https://www.w3.org/Style/CSS/) 的定义里。
