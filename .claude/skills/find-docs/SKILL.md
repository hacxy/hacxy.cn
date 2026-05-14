---
name: find-docs
description: >-
  使用 Context7 CLI 获取任意开发技术的最新文档、API 参考和代码示例。
  当用户询问具体的库、框架、SDK、CLI 工具或云服务时都应使用本 skill
  （包括 React、Next.js、Prisma、Express、Tailwind、Django、Spring Boot
  等常见技术）。训练数据可能无法反映近期 API 变更或版本更新。

  以下场景必须优先使用：API 语法问题、配置项问题、版本迁移问题、包含库名的
  “如何实现”问题、涉及库特定行为的调试、安装/初始化说明、CLI 使用方式。

  即使你认为自己知道答案，也不要直接依赖训练数据来回答 API 细节、函数签名
  或配置项；这些内容经常过时。请始终以最新官方文档为准。对于库文档和 API 细节，
  优先使用本 skill 而不是普通网页搜索。
---

# 文档检索

使用 Context7 CLI 获取任意库的最新文档与代码示例。

执行命令前，先确保 CLI 为最新版本：

```bash
npm install -g ctx7@latest
```

或者无需安装，直接运行：

```bash
npx ctx7@latest <command>
```

## 工作流

采用两步流程：先把库名解析为 ID，再用该 ID 查询文档。

```bash
# 第一步：解析库 ID
ctx7 library <name> <query>

# 第二步：查询文档
ctx7 docs <libraryId> <query>
```

你必须先调用 `ctx7 library` 获取合法的库 ID，除非用户已经明确提供了 `/org/project` 或 `/org/project/version` 格式的库 ID。

重要：每个问题最多执行 3 次相关命令。如果 3 次后仍无法找到理想结果，使用当前最佳结果作答。

## 第一步：解析库

将包名/产品名解析为 Context7 兼容的库 ID，并返回候选库。

```bash
ctx7 library react "How to clean up useEffect with async operations"
ctx7 library nextjs "How to set up app router with middleware"
ctx7 library prisma "How to define one-to-many relations with cascade delete"
```

必须始终提供 `query` 参数。该参数是必填项，并且会直接影响结果排序。请根据用户意图构造 query，帮助在同名或近似名称库之间做出区分。query 中不要包含任何敏感或机密信息，例如 API Key、密码、凭据、个人数据或私有代码。

### 返回字段

每条结果包含：

- **Library ID** — Context7 兼容标识（格式：`/org/project`）
- **Name** — 库或包名称
- **Description** — 简短描述
- **Code Snippets** — 可用代码示例数量
- **Source Reputation** — 来源权威性（High、Medium、Low 或 Unknown）
- **Benchmark Score** — 质量评分（满分 100）
- **Versions** — 可用版本列表。若用户指定了版本，请优先使用列表中的对应版本（格式：`/org/project/version`）。

### 选择流程

1. 分析 query，明确用户要找的是哪个库/包
2. 按以下维度选择最相关结果：
   - 名称与 query 的相似度（优先精确匹配）
   - 描述与用户意图的相关性
   - 文档覆盖度（优先 Code Snippets 数量更多者）
   - 来源权威性（优先 High 或 Medium）
   - Benchmark Score（越高越好，满分 100）
3. 若有多个高质量候选，需说明这一点，但继续使用最相关的一个
4. 若没有合适候选，需明确告知并建议用户优化 query
5. 若 query 含糊不清，先向用户澄清，再决定是否用最可能匹配继续

### 版本化 ID

若用户提到特定版本，应使用带版本的库 ID：

```bash
# 通用（索引中的最新版本）
ctx7 docs /vercel/next.js "How to set up app router"

# 指定版本
ctx7 docs /vercel/next.js/v14.3.0-canary.87 "How to set up app router"
```

可用版本会在 `ctx7 library` 输出中给出。应选择与用户指定版本最接近的条目。

## 第二步：查询文档

基于已解析出的库 ID，获取最新文档与代码示例。

```bash
ctx7 docs /facebook/react "How to clean up useEffect with async operations"
ctx7 docs /vercel/next.js "How to add authentication middleware to app router"
ctx7 docs /prisma/prisma "How to define one-to-many relations with cascade delete"
```

### 如何写高质量 query

query 会直接影响结果质量。应尽量具体并包含关键细节。query 中不要包含任何敏感或机密信息，例如 API Key、密码、凭据、个人数据或私有代码。

| Quality | Example |
|---------|---------|
| Good | `"How to set up authentication with JWT in Express.js"` |
| Good | `"React useEffect cleanup function with async operations"` |
| Bad | `"auth"` |
| Bad | `"hooks"` |

尽可能直接使用用户完整问题作为 query；过于模糊的单词 query 往往只会返回泛化结果。

输出通常包含两类内容：**code snippets**（带标题和语言标记的代码块）与 **info snippets**（带上下文路径的信息说明）。

### 结果不理想时，用 `--research` 重试

如果默认 `ctx7 docs` 结果不满足需求，在放弃或改用训练数据回答前，应先用 **相同命令 + `--research`** 重试。该模式会通过沙箱代理拉取真实源码仓库并结合实时网页搜索后再综合生成答案。其成本高于默认模式，请作为定向重试使用。

```bash
ctx7 docs /vercel/next.js "How does middleware matcher handle dynamic segments in v15?" --research
```

## 认证

无需认证也可使用；若需更高额度可进行认证：

```bash
# 方式 A：环境变量
export CONTEXT7_API_KEY=your_key

# 方式 B：OAuth 登录
ctx7 login
```

## 错误处理

如果命令因配额报错（例如 “Monthly quota reached” 或 “quota exceeded”）：
1. 明确告知用户 Context7 配额已耗尽
2. 建议用户认证以提高额度：`ctx7 login`
3. 若用户无法或不愿认证，可基于训练知识回答，但必须明确说明内容可能已过时

不要静默回退到训练数据回答，必须明确说明为什么没有使用 Context7。

## 常见错误

- Library ID 必须带 `/` 前缀：应为 `/facebook/react`，而不是 `facebook/react`
- 必须先执行 `ctx7 library`：例如 `ctx7 docs react "hooks"` 会因缺少合法 ID 而失败
- query 要具体，不要只写单个词：应写 `"React useEffect cleanup function"`，而不是 `"hooks"`
- query 中不要包含敏感信息（API Key、密码、凭据等）
