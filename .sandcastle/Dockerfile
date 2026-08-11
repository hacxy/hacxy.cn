# pi-afk 沙箱镜像
# 构建：docker build -t sandcastle:pi-afk .sandcastle/
FROM node:22-bookworm

# 系统依赖
RUN apt-get update && apt-get install -y \
  git \
  curl \
  jq \
  && rm -rf /var/lib/apt/lists/*

# pnpm（与项目 lockfile 匹配）
RUN corepack enable && corepack prepare pnpm@11.21.0 --activate

# Build-args for UID/GID 对齐（sandcastle docker build-image 默认用宿主 UID/GID）
ARG AGENT_UID=1000
ARG AGENT_GID=1000

# 把 node 用户改名为 agent 并对齐 UID/GID
RUN groupmod -o -g $AGENT_GID node && usermod -o -u $AGENT_UID -g $AGENT_GID -d /home/agent -m -l agent node
USER ${AGENT_UID}:${AGENT_GID}

# 安装 pi agent（与宿主版本一致）
RUN npm install -g @earendil-works/pi-coding-agent@0.84.1

WORKDIR /home/agent

# 沙箱模式：worktree 会被 bind-mount 到 /home/agent/workspace
ENTRYPOINT ["sleep", "infinity"]
