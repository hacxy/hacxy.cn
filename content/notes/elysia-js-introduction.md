---
title: "Elysia.js：为 Bun 而生的 TypeScript 后端框架"
date: 2026-05-31
tags:
  - TypeScript
  - Bun
  - 后端
  - Elysia
summary: 为 Bun 而生的 TypeScript 后端框架，Schema 即类型、端到端类型安全、OpenAPI 自动生成——和 Express/Fastify/NestJS 不是一个时代的产物。
---

# Elysia.js：为 Bun 而生的 TypeScript 后端框架

Node.js 后端框架这片土地上，[Express](https://expressjs.com) 老当益壮，[Fastify](https://fastify.dev) 性能为王，[NestJS](https://nestjs.com) 架构拉满。但最近一两年，有一匹黑马从 Bun 生态里杀出来——[Elysia.js](https://elysiajs.com)。

它不是又一个 Express wrapper，也不是 Fastify 的换皮。它的设计哲学很明确：**TypeScript 不应该是后端的二等公民**。

## Elysia 是什么

Elysia 是一个专为 [Bun](https://bun.sh) 运行时设计的 TypeScript web 框架。它追求三件事：

1. **端到端类型安全**——从后端路由到前端调用，类型一路穿透，不需要手动写 `.d.ts`
2. **极致性能**——基于 Bun 的高性能 HTTP 服务器，基准测试中表现亮眼
3. **开发体验**——链式 API、自动 OpenAPI 文档生成、开箱即用的参数校验

一个最小的 Elysia 服务器长这样：

```typescript
import { Elysia } from 'elysia'

new Elysia()
  .get('/', 'Hello World')
  .get('/user/:id', ({ params: { id } }) => id)
  .post('/form', ({ body }) => body)
  .listen(3000)
```

没有 `app`、`res`、`next`，也没有 `createServer`。直接 `new Elysia()` 就完事了。

## 为什么不用 Express / Fastify

Express 的问题不是它老，而是它的设计已经跟不上 TypeScript 时代。你在 Express 里写路由，参数类型全靠手动标注，中间件的类型推断基本靠猜。Fastify 好一些，有 JSON Schema 校验和插件系统，但类型安全还是差一截——你得自己维护 schema 和 TypeScript 类型的对应关系。

Elysia 的思路不一样。它把 **运行时校验** 和 **编译时类型** 统一起来了。你定义一个 schema，运行时自动校验请求参数，编译时自动推断 TypeScript 类型。不需要写两遍。

## 和其他框架的对比

| 特性 | Express | Fastify | Hono | NestJS | **Elysia** |
|------|---------|---------|------|--------|------------|
| 运行时 | Node.js | Node.js | 多运行时 | Node.js | **Bun** |
| 类型安全 | 手动 | JSON Schema | Zod 等 | 装饰器 | **内置 (TypeBox)** |
| 端到端类型 | 无 | 无 | RPC 模式 | 无 | **Eden Treaty** |
| 参数校验 | 中间件 | JSON Schema | 中间件 | DTO + class-validator | **Schema 即类型** |
| OpenAPI 文档 | 手动 | 插件 | 插件 | 插件 | **自动生成** |
| WebSocket | 需额外库 | 插件 | 内置 | Gateway | **原生支持** |
| 学习曲线 | 低 | 中 | 低 | 高 | **低** |
| 生态成熟度 | 极高 | 高 | 中 | 高 | 中 |

Express 和 Fastify 的生态优势依然明显，npm 上海量的中间件和插件不是 Elysia 短期内能追上的。但如果你的项目是 TypeScript 优先、跑在 Bun 上、前后端都想共享类型——Elysia 目前没有对手。

[Hono](https://hono.dev) 是个有趣的对比。它走的是多运行时路线（Deno、Bun、Cloudflare Workers、Node.js 都能跑），设计哲学和 Elysia 有相似之处。但 Elysia 在 Bun 上的优化更深，端到端类型方案也更完整。

## 核心特性

### Schema 校验与类型推断

Elysia 使用 [TypeBox](https://github.com/sinclairzx81/typebox) 作为 schema 定义语言。定义 schema 的同时，TypeScript 类型自动推断出来：

```typescript
import { Elysia, t } from 'elysia'

new Elysia()
  .post('/user', ({ body }) => {
    // body 的类型自动推断为 { name: string; email: string; age: number }
    return { created: body.name }
  }, {
    body: t.Object({
      name: t.String({ minLength: 1 }),
      email: t.String({ format: 'email' }),
      age: t.Number({ minimum: 0 })
    }),
    response: t.Object({
      created: t.String()
    })
  })
  .listen(3000)
```

不需要手动写 `interface CreateUserDto`，schema 定义就是类型定义，一个东西干两件事。

参数自动类型转换也很实用——路由里的 `:id` 默认是字符串，但你声明成 `t.Number()`，Elysia 会自动把字符串转成数字：

```typescript
.get('/item/:id', ({ params }) => params.id, {
  params: t.Object({
    id: t.Number() // 自动从 string 转成 number
  })
})
```

### 生命周期钩子

Elysia 的请求处理有一套清晰的生命周期，每个阶段都可以插入钩子：

```typescript
import { Elysia } from 'elysia'

new Elysia()
  .onRequest(({ request }) => {
    console.log(`${request.method} ${request.url}`)
  })
  .onBeforeHandle(({ headers, status }) => {
    if (!headers.authorization) {
      return status(401, 'Unauthorized')
    }
  })
  .get('/protected', () => 'Secret data')
  .onAfterHandle(({ response }) => {
    console.log('Response sent')
  })
  .onError(({ code, error }) => {
    if (code === 'VALIDATION') return { error: error.message }
    return { error: 'Internal Server Error' }
  })
  .listen(3000)
```

代码里的 `onBeforeHandle` 是全局钩子（对所有路由生效），而路由选项里的 `beforeHandle` 只对单个路由生效。两者行为一致：返回值会中断后续处理——这个设计和 Express 的 `next()` 不同，更像中间件短路，但写起来更直觉。

### Guard：批量应用校验

如果你有一组路由需要相同的校验规则，不用每个都写一遍，用 `guard` 批量应用（下面的 `signUp`、`signIn`、`isUserExists` 需要自行实现）：

```typescript
import { Elysia, t } from 'elysia'

new Elysia()
  .guard(
    {
      body: t.Object({
        username: t.String(),
        password: t.String()
      })
    },
    (app) =>
      app
        .post('/sign-up', ({ body }) => signUp(body))
        .post('/sign-in', ({ body }) => signIn(body), {
          beforeHandle: isUserExists
        })
  )
  .get('/', 'hi')
  .listen(3000)
```

### 插件系统

Elysia 的插件系统用 `state`（共享状态）、`decorate`（扩展上下文）和 `derive`（派生数据）来组合功能：

```typescript
import { Elysia } from 'elysia'

const authPlugin = new Elysia({ name: 'auth' })
  .state('users', new Map<string, { name: string }>())
  .decorate('generateToken', () => crypto.randomUUID())
  .get('/auth/check', ({ store }) => ({ userCount: store.users.size }))

const apiPlugin = new Elysia({ name: 'api', prefix: '/api' })
  .use(authPlugin)
  .get('/profile', ({ store, generateToken }) => ({
    token: generateToken(),
    users: store.users.size
  }))

new Elysia()
  .use(authPlugin)
  .use(apiPlugin)
  .listen(3000)
```

`name` 属性用于去重——同一个插件被 `.use()` 多次时，Elysia 只会注册一次。

### OpenAPI 自动生成

加一个插件，你的 API 文档就自动有了：

```typescript
import { Elysia, t } from 'elysia'
import { openapi } from '@elysia/openapi'

new Elysia()
  .use(openapi({
    documentation: {
      info: { title: 'My API', version: '1.0.0' },
      tags: [{ name: 'users', description: 'User operations' }]
    }
  }))
  .post('/users', ({ body }) => ({ id: '1', ...body }), {
    body: t.Object({
      name: t.String(),
      email: t.String({ format: 'email' })
    }),
    response: t.Object({
      id: t.String(),
      name: t.String(),
      email: t.String()
    }),
    detail: {
      tags: ['users'],
      summary: 'Create a user',
      description: 'Creates a new user account'
    }
  })
  .listen(3000)
```

启动后访问 `http://localhost:3000/openapi` 就能看到 Swagger UI。不需要手写 YAML，schema 定义直接变成文档。

### Eden Treaty：端到端类型安全

这是 Elysia 最杀手级的特性。通过 [Eden Treaty](https://elysiajs.com/eden/treaty/overview)，前端调用后端 API 时，类型是自动推断的——不需要代码生成，不需要手动维护类型文件。

后端：

```typescript
// server.ts
import { Elysia, t } from 'elysia'

const app = new Elysia()
  .get('/users', () => [{ id: '1', name: 'John' }])
  .get('/users/:id', ({ params }) => ({ id: params.id, name: 'John' }))
  .post('/users', ({ body }) => ({ id: '1', ...body }), {
    body: t.Object({ name: t.String(), email: t.String() })
  })
  .listen(3000)

export type App = typeof app
```

前端：

```typescript
// client.ts
import { treaty } from '@elysiajs/eden'
import type { App } from './server'

const api = treaty<App>('localhost:3000')

// 类型完全自动推断，包括路径参数和请求体
const { data: users } = await api.users.get()
const { data: user } = await api.users({ id: '123' }).get()
const { data, error } = await api.users.post({
  name: 'Jane',
  email: 'jane@example.com'
})
```

改了后端的 schema，前端的类型提示立刻跟着变。这比 [tRPC](https://trpc.io) 轻量得多，而且不需要额外的构建步骤。

## 架构总览

<img src="/images/elysia-js-introduction/architecture.svg" alt="Elysia.js 架构概览" width="100%" style="max-width:560px" />

## 跑一个完整示例

下面是一个稍微完整点的例子——一个简单的用户管理 API，带校验、错误处理和 OpenAPI 文档：

```typescript
import { Elysia, t } from 'elysia'
import { openapi } from '@elysia/openapi'

// 模拟数据库
const db = new Map<string, { name: string; email: string }>()
db.set('1', { name: 'Alice', email: 'alice@example.com' })
db.set('2', { name: 'Bob', email: 'bob@example.com' })

class NotFoundError extends Error {
  status = 404
  constructor(id: string) {
    super(`User ${id} not found`)
  }
}

const app = new Elysia()
  .use(openapi({
    documentation: {
      info: { title: 'User API', version: '1.0.0' }
    }
  }))
  .error({ NotFoundError })
  .onError(({ code, error, status }) => {
    switch (code) {
      case 'NotFoundError':
        return status(404, { error: error.message })
      case 'VALIDATION':
        return status(400, { error: error.message })
      default:
        return status(500, { error: 'Internal server error' })
    }
  })
  .get('/users', () => [...db.entries()].map(([id, user]) => ({ id, ...user })), {
    detail: { summary: '获取所有用户' }
  })
  .get('/users/:id', ({ params: { id } }) => {
    const user = db.get(id)
    if (!user) throw new NotFoundError(id)
    return { id, ...user }
  }, {
    params: t.Object({ id: t.String() }),
    detail: { summary: '根据 ID 获取用户' }
  })
  .post('/users', ({ body }) => {
    const id = String(db.size + 1)
    db.set(id, body)
    return { id, ...body }
  }, {
    body: t.Object({
      name: t.String({ minLength: 1 }),
      email: t.String({ format: 'email' })
    }),
    detail: { summary: '创建用户' }
  })
  .delete('/users/:id', ({ params: { id } }) => {
    if (!db.has(id)) throw new NotFoundError(id)
    db.delete(id)
    return { deleted: id }
  }, {
    params: t.Object({ id: t.String() }),
    detail: { summary: '删除用户' }
  })
  .listen(3000)

console.log('Server running at http://localhost:3000')
console.log('API docs at http://localhost:3000/openapi')

export type App = typeof app
```

### 运行步骤

```bash
# 1. 安装 Bun（如果还没有）
curl -fsSL https://bun.sh/install | bash

# 2. 创建项目
bun create elysia my-api
cd my-api

# 3. 安装 OpenAPI 插件
bun add @elysia/openapi

# 4. 把上面的代码写入 src/index.ts，然后启动
bun dev
```

启动后你可以：

- 访问 `http://localhost:3000/users` 查看用户列表
- 访问 `http://localhost:3000/openapi` 查看自动生成的 API 文档
- 用 curl 测试创建用户：

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Charlie", "email": "charlie@example.com"}'
```

如果传了不合法的邮箱格式，Elysia 会自动返回 400 错误，不需要你写一行校验代码。

## 什么时候该用 Elysia

**适合的场景：**
- TypeScript 优先的项目，前后端都想共享类型
- 新项目，没有历史包袱，可以自由选择运行时
- 需要快速出 API 文档的项目（OpenAPI 自动生成太香了）
- 对性能有要求，但又不想写 Go/Rust

**暂时不太适合的场景：**
- 必须跑在 Node.js 上（Elysia 是 Bun 原生框架，虽然也有 Node.js 适配，但最佳体验在 Bun 上）
- 团队已经深度绑定 NestJS 的装饰器模式
- 依赖大量 Node.js 生态中间件且无法替代

## 我怎么看 Elysia

Elysia 不是来取代 Express 的——它解决的是一个不同的问题：**在 TypeScript + Bun 的组合下，后端开发能做到多舒服**。

它的杀手锏不是性能（虽然确实快），而是"写一遍 schema，校验和类型都有了"这件事。如果你受够了在 Express/Fastify 里手动维护 DTO 和校验逻辑的重复劳动，Elysia 能让你少写不少胶水代码。

[官方文档](https://elysiajs.com) 写得很好，从 Quick Start 到高级用法都有覆盖，建议直接上手跑一遍。
