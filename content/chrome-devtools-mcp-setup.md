---
title: "Chrome DevTools MCP：在 Claude Code 中控制浏览器"
date: 2026-05-11
tags:
  - ClaudeCode
  - MCP
  - Chrome
  - 工具
summary: 记录如何配置 chrome-devtools-mcp，让 Claude Code 能拉起浏览器并截图、操作页面、调试前端。覆盖 --autoConnect 快速连接、Chrome for Testing 完整安装、以及 40+ 工具的分类说明。
---

# Chrome DevTools MCP：在 Claude Code 中控制浏览器

[chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) 给 Claude Code 配了一双眼睛和一双手——截图、点击、填表、读控制台报错、跑 Lighthouse、录性能 trace……工具挺多的，做前端调试很实用。

## 前置条件

- 已安装并配置好 Claude Code
- macOS（本文以 Apple Silicon 为例）

---

## 一、选择连接方式

有两种方式把 MCP 接到浏览器，根据你的 Chrome 版本选一个。

### 方式 A：autoConnect（Chrome 144+，推荐）

Chrome 144 开始支持自动连接，不需要指定可执行路径，配置最简单。

先用 `--remote-debugging-port` 启动 Chrome：

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222
```

然后 MCP 配置里加 `--autoConnect`：

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest", "--autoConnect"]
    }
  }
}
```

MCP 启动时会自动找到正在运行的 Chrome 实例并连接，不用手动指定路径。

### 方式 B：Chrome for Testing + 指定路径

如果 Chrome 版本低于 144，或者想要一个干净的、与日常浏览器完全隔离的环境，用 Chrome for Testing。

去官方下载页面：**[https://googlechromelabs.github.io/chrome-for-testing/](https://googlechromelabs.github.io/chrome-for-testing/)**

找 **Stable** 频道，根据芯片选：
- Apple Silicon（M 系列）→ `mac-arm64`
- Intel → `mac-x64`

下载 zip 解压，把 `Google Chrome for Testing.app` 拖入 `/Applications/`。

MCP 配置：

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "-y",
        "chrome-devtools-mcp@latest",
        "--executable-path",
        "/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
      ]
    }
  }
}
```

MCP 启动时会自动拉起浏览器，不需要手动操作。

---

## 二、完整参数参考

常用的列一下，用不到的可以不管：

| 参数 | 说明 |
|------|------|
| `--autoConnect` | 自动连接已运行的 Chrome 实例（需要 Chrome 144+） |
| `--executable-path <path>` / `-e` | 指定 Chrome 可执行文件路径 |
| `--browser-url <url>` / `-u` | 连接已运行的 Chrome，默认 `http://127.0.0.1:9222` |
| `--ws-endpoint <url>` / `-w` | 通过 WebSocket 端点连接 |
| `--headless` | 无界面模式 |
| `--isolated` | 使用临时 user-data-dir，关闭后自动清理，适合干净测试 |
| `--user-data-dir <path>` | 指定用户数据目录 |
| `--channel <canary\|dev\|beta\|stable>` | 指定 Chrome 渠道 |
| `--viewport <宽x高>` | 设置初始视口，如 `1280x720` |
| `--proxy-server <url>` | 代理服务器 |
| `--accept-insecure-certs` | 忽略自签名证书错误 |
| `--slim` | 精简模式，只暴露导航、脚本执行、截图三类工具 |
| `--experimental-vision` | 启用基于坐标的点击工具（`click_at`） |
| `--experimental-screencast` | 启用录屏工具（需要 ffmpeg） |
| `--chrome-arg <arg>` | 传额外参数给 Chrome |
| `--log-file <path>` | 写入调试日志 |

---

## 三、添加权限

用项目级 `.claude/settings.json` 时，加上 MCP 工具权限，省得每次弹确认：

```json
{
  "permissions": {
    "allow": [
      "mcp__chrome-devtools__*"
    ]
  }
}
```

---

## 四、工具分类

默认启用的工具挺多，大概分这几类：

**页面操作**：`click`、`fill`、`fill_form`、`hover`、`drag`、`press_key`、`type_text`、`upload_file`、`handle_dialog`

**导航**：`navigate_page`、`new_page`、`close_page`、`list_pages`、`select_page`、`wait_for`

**调试**：`take_screenshot`、`take_snapshot`、`evaluate_script`、`get_console_message`、`list_console_messages`、`lighthouse_audit`

**网络**：`list_network_requests`、`get_network_request`

**性能**：`performance_start_trace`、`performance_stop_trace`、`performance_analyze_insight`

**内存**：`take_memory_snapshot`、`get_memory_snapshot_details`、`get_nodes_by_class`

默认关闭的（需要手动开启）：
- `--category-extensions`：扩展相关工具
- `--experimental-screencast`：录屏（需要 ffmpeg）
- `--category-experimental-webmcp`：WebMCP 工具（需要 Chrome 149+）

---

## 五、验证

重启 Claude Code，试一下：

```
截一下当前页面的截图
```

```
列出当前浏览器中打开的页面
```

```
帮我分析一下 https://example.com 的性能
```

能正常返回结果就配好了。

---

## 六、常见问题

**autoConnect 连不上**

确认 Chrome 是用 `--remote-debugging-port=9222` 启动的，普通方式打开的 Chrome 不支持远程调试。

**Chrome for Testing 登录问题**

它和普通 Chrome 的 cookie 不共享，第一次用需要在它的窗口里手动登录一遍，之后 cookie 会留着。

**截图空白**

通常是目标页面需要登录。手动在 Chrome for Testing 里打开并登录，再让 Claude Code 操作。

**端口冲突**

默认用 `9222`，被占用的话：

```bash
lsof -i :9222 | grep LISTEN
kill <PID>
```
