---
date: 2024-12-24
sidebar:
  title: vitepress主题开发日记
title: 初衷
description: "开发vitepress主题的初衷"
category: vitepress主题开发日记
tags:
  - vitepress
---

# 初衷 & 背景

2024 年年初 vitepress 终于发布了第一个正式版, 之前也用过 vuepress, 使用起来感觉比较重, 相比较起来我更喜欢 vitepress 的简约和轻便, vitepress 更能让我专注内容创作而不是花费更多精力在处理交互上.

而开发一个 vitepress 主题, 是我从它发布的第一个版本开始就一直存在的执念 😂, 再一个原因是目前所有我可以接触到的主题都不能满足我的个人需求

最近我觉得时机差不多成熟了, 也是时候趁这个机会重新入门一下 vue 了, 写了两年的 react, 再不写写 vue, 怕是都要忘干净了.

## [vitepress-theme-mild](https://github.com/hacxy/vitepress-theme-mild)

![](https://raw.githubusercontent.com/hacxy/hacxy/main/images/Kapture%202024-12-26%20at%2015.52.02.gif)

经过几轮测试, 我还是带来了: [vitepress-theme-mild](https://github.com/hacxy/vitepress-theme-mild)

[vitepress-theme-mild](https://github.com/hacxy/vitepress-theme-mild) 是一个简约风的主题, 它继承了 vitepress 的本质: 使开发者更专注内容, 同时它也是基于默认主题开发的, 不局限于某个文档站类型, 同时支持博客和技术文档.

### 我希望这个主题:

- 使用和配置都非常简单, 插拔都非常容易, 即使在现有的 vitepress 项目中也只需要简单的配置就可以使用主题的全部功能
- 风格干净简约, 兼容 vitepress 默认主题的所有配置, 在默认主题配置基础上增加更多自定义功能
- 内置常用功能, 搜索、标签、分类、评论等
- 独立的开源项目卡片页, 用于展示我的个人项目
- 尽可能少的依赖其他包
- 顺便加入一些过渡动画效果
- 高度可自定义

> 💡 以上内容已实现了部分, 目前还是 beta 测试版本, 完整内容请等待最终正式版

## 准备与调研

### 开发前准备

在此之前我也反复阅读过 vitepress 的文档, 而在实际开发时, 我发现只靠文档远远不够, 我必须阅读部分源码才能解决一些问题, 这些我后面会讲到.

### 调研

我也曾调研过目前还在积极维护的一些比较优秀的主题, 例如: [@sugarat/theme](https://github.com/ATQQ/sugar-blog)、[vitepress-blog-pure](https://github.com/airene/vitepress-blog-pure) 等; 它们都是非常优秀的主题, 我承认我有借鉴过这些主题的样式, 以及它们在处理各需求时的解决方案, 如果你正在寻找合适的博客主题, 也不彷试试它们, 毕竟适合自己的才是最好的.

## 解决方案

经过长期的准备我搜罗了一些满足现有需求的解决方案:

- 组件库:

  - 本来我是不打算使用组件库的, 但基础组件的样式需要花费大量时间去开发, 所以还是去找了一些:
    - [vuetify](https://github.com/vuetifyjs/vuetify) 样式实在不符合我的审美, pass 掉了
    - [element plus](https://github.com/element-plus/element-plus) 存在 `dayjs` 模块导出的异常问题, 详见[issues/29087](https://github.com/nuxt/nuxt/issues/29087)
    - [antdv](https://github.com/vueComponent/ant-design-vue) 同样也是 `dayjs` 导致生产环境出现问题, 后面我索性就排除了所有上游依赖存在`dayjs`的组件库
    - [Naive UI](https://github.com/tusen-ai/naive-ui) 是我最终选择的组件库, 首先它没有依赖`dayjs`, 其次组件样式非常符合我的个人审美, 而且还支持按需引入

- 解析 frontmatter: [gray-matter](https://github.com/jonschlinkert/gray-matter) vitepress 官方在使用的库
- 文件路径查找: [tinyglobby](https://github.com/SuperchupuDev/tinyglobby) 这也是 vitepress 官方在使用的库
- 动画效果: [@vueuse/motion](https://github.com/vueuse/motion) 支持指令和自定义指令, 非常好用
- Hooks: [vueuse](https://github.com/vueuse/vueuse) 有些方法懒得自己在实现一遍了, 这也是 vitepress 默认主题正在使用的库
- 获取文章阅读时间: [reading-time-estimator](https://github.com/lbenie/reading-time-estimator) 这个支持国际化, 目前看起来没啥问题

我花费了一些时间尝试了各种库, 最终是确定下来用以上这些解决方案来应对接下来的各种需求.

## 结尾

后面我会详细的讲到我在开发主题时遇到的各种问题, 以及我是如何解决它们的.

最后也欢迎大家来尝试下这个主题, 如果喜欢的话不妨点个 star
