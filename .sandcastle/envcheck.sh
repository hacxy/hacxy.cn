#!/usr/bin/env bash
# 工作容器环境自检：不通过立即退出并给出原因，避免"装到一半卡死"
set -uo pipefail

fail() { echo "❌ $1" >&2; exit 1; }
ok()   { echo "  ✅ $1"; }

echo "环境自检:"

node -v >/dev/null 2>&1 || fail "node 不可用"
ok "node $(node -v)"

pnpm -v >/dev/null 2>&1 || fail "pnpm 不可用"
ok "pnpm $(pnpm -v)"

git --version >/dev/null 2>&1 || fail "git 不可用"
ok "git $(git --version)"

gh --version >/dev/null 2>&1 || fail "gh 不可用"
ok "gh $(gh --version | head -1)"

[ -n "${PLAYWRIGHT_BROWSERS_PATH:-}" ] || fail "PLAYWRIGHT_BROWSERS_PATH 未设置"
[ -d "$PLAYWRIGHT_BROWSERS_PATH" ] || fail "浏览器目录不存在: $PLAYWRIGHT_BROWSERS_PATH"
ls "$PLAYWRIGHT_BROWSERS_PATH"/chromium-* >/dev/null 2>&1 || fail "chromium 未安装: $PLAYWRIGHT_BROWSERS_PATH"
ok "playwright chromium 就绪"

pi --version >/dev/null 2>&1 || fail "pi 不可用"
ok "pi $(pi --version)"

[ -d /workspace ] || fail "/workspace 不存在（检查 -v 挂载）"
ok "/workspace 已挂载"

[ -f /workspace/pnpm-lock.yaml ] || fail "/workspace/pnpm-lock.yaml 缺失（不是 pnpm 项目？）"
ok "pnpm-lock.yaml 存在"

[ "${CI:-}" = "true" ] || fail "CI=true 未设置（pnpm 无 TTY 会 abort）"
ok "CI=true"

echo "✅ 环境自检通过，可以开工"
