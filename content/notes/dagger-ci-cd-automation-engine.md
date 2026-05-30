---
title: "Dagger：让 CI/CD 变得像写代码一样优雅"
date: 2026-05-30
tags:
  - CI/CD
  - DevOps
  - 容器化
  - 自动化
summary: "Dagger 是一个基于容器的 CI/CD 自动化引擎，让你用代码定义流水线，在本地、CI 或云端无缝运行，真正实现一次编写到处运行。"
---

## 什么是 Dagger？

说白了，Dagger 就是一个**让 CI/CD 变得像写代码一样优雅的自动化引擎**。

传统 CI/CD 的痛点大家应该都经历过：本地跑得好好的，推到 CI 就挂了；换个平台又要重新写一遍流水线；调试个构建问题要在 CI 上反复提交测试……

Dagger 的核心思路是：**用容器化的方式把整个构建流程打包起来**，确保你在本地跑和在 CI 上跑的结果完全一致。写一次，到处运行。

{icon:lucide:star} 15.8k | {icon:lucide:code} Go | {icon:lucide:git-fork} 878

## 为什么选择 Dagger？

### 1. 本地和 CI 完全一致

这是 Dagger 最核心的价值。传统 CI/CD 的"在我电脑上能跑"问题，Dagger 直接用容器解决了。

你在本地写好流水线，跑一遍确认没问题，然后推到 GitHub Actions、GitLab CI 或者任何支持 Dagger 的平台——结果一定是一样的。因为整个构建环境都被容器化了，依赖、工具链、系统配置全部打包在镜像里。

### 2. 像写代码一样写流水线

Dagger 支持用 Go、Python、TypeScript 等通用编程语言来定义流水线，而不是学一堆 YAML 配置。

```go
package main

import (
    "dagger/dagger/internal/dagger"
)

func Build(ctx context.Context, source *dagger.Directory) *dagger.Directory {
    return dag.Container().
        From("golang:1.22").
        WithMountedDirectory("/src", source).
        WithWorkdir("/src").
        Exec(dagger.ContainerExecOpts{Args: []string{"go", "build", "-o", "myapp"}}).
        Directory("/src")
}
```

这段代码定义了一个构建流水线：基于 Go 1.22 镜像，挂载源码目录，执行 `go build`，返回构建产物。写法和普通 Go 函数没什么区别，IDE 自动补全、类型检查、单元测试都能用。

### 3. 可复用的流水线模块

Dagger 的流水线是模块化的。你可以把常用的构建步骤封装成函数，其他项目直接复用。

比如你写了一个 `Build()` 函数来构建 Go 项目，另一个项目只需要调用这个函数，传入不同的源码目录就行。这比复制粘贴 YAML 配置优雅多了。

### 4. 智能缓存

Dagger 会自动缓存构建依赖和中间产物。第二次构建同样的项目，速度会快很多——因为它知道哪些步骤没变，可以直接复用缓存。

这对大型项目特别有用。想象一下，你的项目有几百个依赖，每次 CI 都要重新下载安装，光这一步就要好几分钟。Dagger 的缓存机制可以跳过这些重复工作。

### 5. 跨平台支持

同一个 Dagger 流水线可以在：

- 本地终端
- GitHub Actions
- GitLab CI
- Dagger Cloud（官方托管服务）
- 任何支持容器的环境

切换平台不需要改一行代码，只需要在对应的 CI 平台配置里调用 Dagger 就行。

## 技术架构

Dagger 的技术选型挺讲究的：

- **Go 语言** - 高性能、编译型，适合构建底层基础设施工具
- **容器深度集成** - 基于 OCI 镜像标准，兼容 Docker 和其他容器运行时
- **GraphQL API** - 提供灵活的查询接口，方便与其他工具集成
- **DAG 调度** - 用有向无环图管理任务依赖，自动并行执行无依赖的步骤

架构上，Dagger 分为三层：

1. **CLI 层** - 开发者直接使用的命令行工具
2. **Engine 层** - 核心引擎，处理流水线定义、执行、缓存
3. **Runtime 层** - 容器运行时，负责实际执行构建任务

这种分层设计让 Dagger 可以灵活适配不同的 CI 平台和容器环境。

## 实际使用体验

### 快速上手

安装 Dagger CLI 后，进入项目目录运行：

```bash
dagger init
dagger develop
dagger call build
```

就这么简单。Dagger 会自动检测项目类型，生成对应的配置文件。

### 集成到 GitHub Actions

```yaml
name: CI
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dagger/dagger-for-github@v6
        with:
          verb: call
          args: build
```

几行配置就搞定了，不需要写一堆 `apt-get install`、`npm install` 之类的步骤。

### 调试体验

本地调试是 Dagger 的强项。你可以直接在终端运行流水线，看到完整的输出日志，用 `dagger call --interactive` 进入交互模式调试。

相比传统 CI 的"提交-等待-看日志-再提交"循环，效率高了不止一个量级。

## 适合什么场景？

Dagger 特别适合：

- **多平台 CI/CD** - 需要在多个 CI 平台运行相同流水线
- **复杂构建流程** - 构建步骤多、依赖关系复杂的项目
- **团队协作** - 需要复用和共享流水线配置
- **本地优先开发** - 希望在本地就能完整测试 CI 流程

不太适合的场景：

- 简单的静态网站部署（GitHub Actions 原生够用）
- 不需要跨平台的单一 CI 环境
- 团队对现有 CI 工具已经很熟悉，没有迁移动力

## 与其他方案对比

| 特性 | Dagger | GitHub Actions | GitLab CI |
|------|--------|----------------|-----------|
| 本地运行 | {icon:lucide:check} 完整支持 | {icon:lucide:x} 不支持 | {icon:lucide:x} 不支持 |
| 跨平台 | {icon:lucide:check} 任意平台 | {icon:lucide:x} 仅 GitHub | {icon:lucide:x} 仅 GitLab |
| 配置语言 | Go/Python/TypeScript | YAML | YAML |
| 可复用性 | {icon:lucide:check} 函数级别 | 有限 | 有限 |
| 缓存机制 | {icon:lucide:check} 智能缓存 | 基础缓存 | 基础缓存 |

## 总结

Dagger 解决的是 CI/CD 领域一个很实际的问题：**如何让构建流程在不同环境下保持一致**。

用容器化的方式把构建环境标准化，用编程语言而不是配置文件来定义流水线，用智能缓存加速重复构建——这些设计决策都很务实。

如果你的项目需要在多个 CI 平台上运行，或者构建流程复杂到 YAML 配置已经难以维护，Dagger 值得试试。它不会让你的 CI/CD 变得神奇，但会让你少踩很多坑。

---

**相关链接：**

- [Dagger 官网](https://dagger.io)
- [GitHub 仓库](https://github.com/dagger/dagger)
- [Dagger 文档](https://docs.dagger.io)
