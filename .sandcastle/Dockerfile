# pi-afk 沙箱镜像
# 构建：docker build -t sandcastle:pi-afk .sandcastle/
FROM node:22-bookworm

# 系统依赖 + GitHub CLI（planner 在沙箱内执行 !`gh issue list` 拉取 issues）
RUN apt-get update && apt-get install -y \
  git \
  curl \
  jq \
  && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
  | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
  | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
  && apt-get update && apt-get install -y gh \
  && rm -rf /var/lib/apt/lists/*

# pnpm（与项目 lockfile 匹配）
RUN corepack enable && corepack prepare pnpm@11.21.0 --activate

# Playwright chromium + 系统库：e2e 视觉验证需要（agent 在沙箱内跑 playwright test）
# 浏览器版本必须与项目 @playwright/test 匹配（pnpm-lock.yaml: 1.62.1）——项目升级 playwright 后需重建镜像
# 浏览器装到全局路径 /ms-playwright（root 构建时下载，agent 只读使用）；--with-deps 自动 apt-get 装系统库
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN pnpm dlx playwright@1.62.1 install chromium --with-deps \
  && rm -rf /var/lib/apt/lists/*

# 安装 pi agent（与宿主版本一致）
# 必须在 USER 切换前用 root 安装：npm -g 写 /usr/local/lib 需要 root 权限
RUN npm install -g @earendil-works/pi-coding-agent@0.84.1

# Build-args for UID/GID 对齐（sandcastle docker build-image 默认用宿主 UID/GID）
ARG AGENT_UID=1000
ARG AGENT_GID=1000

# 把 node 用户改名为 agent 并对齐 UID/GID
RUN groupmod -o -g $AGENT_GID node && usermod -o -u $AGENT_UID -g $AGENT_GID -d /home/agent -m -l agent node
USER ${AGENT_UID}:${AGENT_GID}

# 以 agent 用户预热 corepack pnpm 缓存：
# 上面的 root 预热只写 /root/.cache，agent 用户每次容器首启都要重新下载 pnpm tarball——
# 那是一个失败点（网络抖动即挂），在这里以 agent 身份下载并写进镜像，容器内零下载。
RUN corepack prepare pnpm@11.21.0 --activate

WORKDIR /home/agent

# 沙箱模式：worktree 会被 bind-mount 到 /home/agent/workspace
ENTRYPOINT ["sleep", "infinity"]
