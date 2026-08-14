/**
 * 配置（环境变量，可放 .sandcastle/.env）：
 *   SANDBOX_IMAGE    沙箱镜像名         默认 sandcastle:pi-afk
 *   AGENT_MODEL      实现 agent 模型     默认 deepseek/deepseek-v4-flash
 *   PLANNER_MODEL    planner/merger 模型  默认同 AGENT_MODEL（Matt 用更强的模型做 plan）
 *   REVIEW_MODEL     review agent 模型   默认同 AGENT_MODEL
 *   AGENT_THINKING   pi 推理强度         默认 medium（off/minimal/low/medium/high/xhigh）
 *   MAX_PARALLEL     并行 issue 数       默认 2
 *   MAX_ITERATIONS   迭代轮数            默认 5（每轮重新 plan，消化依赖链）
 *   DELIVERY         完成策略            none=只留本地分支 / push=推送分支 / pr=推送并开 draft PR / merge=推送+迭代末合并 main+关 issue
 *   SKIP_LABELS      跳过带这些标签的 issue（逗号分隔）默认 agent:done
 *   GH_TOKEN         必须设置：planner 在沙箱里跑 gh 需要认证
 *
 * 沙箱隔离：不挂载宿主 ~/.pi（避免扩展/settings 污染）。
 *   - 配置目录：.sandcastle/pi-home（可写，sessions 落这里，捕获后仍回宿主 ~/.pi/agent/sessions）
 *   - 凭据：main.ts 读宿主 ~/.pi/agent/auth.json 的 deepseek key，以 DEEPSEEK_API_KEY env 注入
 *   - skills：仓库内嵌 .sandcastle/skills（见其 README）
 */

import * as sandcastle from '@ai-hero/sandcastle'

export const IMAGE = process.env.SANDBOX_IMAGE ?? 'sandcastle:pi-afk'
export const MODEL = process.env.AGENT_MODEL ?? 'deepseek/deepseek-v4-flash'
export const PLANNER_MODEL = process.env.PLANNER_MODEL ?? MODEL
export const REVIEW_MODEL = process.env.REVIEW_MODEL ?? MODEL
export const THINKING = (process.env.AGENT_THINKING ?? 'medium') as sandcastle.PiOptions['thinking']
export const MAX_PARALLEL = Number(process.env.MAX_PARALLEL ?? 2)
export const MAX_ITERATIONS = Number(process.env.MAX_ITERATIONS ?? 5)
export const DELIVERY = process.env.DELIVERY ?? 'merge' // none | push | pr | merge
export const SKIP_LABELS = (process.env.SKIP_LABELS ?? 'agent:done')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

export const WORKTREES_DIR = '.sandcastle/worktrees'
export const PI_HOME_DIR = '.sandcastle/pi-home'
