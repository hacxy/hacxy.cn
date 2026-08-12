/**
 * 配置（环境变量，可放 .sandcastle/.env）：
 *   SANDBOX_IMAGE    沙箱镜像名         默认 sandcastle:pi-afk
 *   AGENT_MODEL      实现 agent 模型     默认 deepseek/deepseek-v4-flash
 *   PLANNER_MODEL    planner 模型        默认同 AGENT_MODEL（Matt 用更强的模型做 plan）
 *   AGENT_THINKING   pi 推理强度         默认 medium（off/minimal/low/medium/high/xhigh）
 *   MAX_PARALLEL     并行 issue 数       默认 2
 *   MAX_ITERATIONS   迭代轮数            默认 5（每轮重新 plan，消化依赖链）
 *   DELIVERY         完成策略            none=只留本地分支 / push=推送分支 / pr=推送并开 draft PR
 *   SKIP_LABELS      跳过带这些标签的 issue（逗号分隔）默认 agent:done
 *   GH_TOKEN         必须设置：planner 在沙箱里跑 gh 需要认证
 */

import * as sandcastle from '@ai-hero/sandcastle'

export const IMAGE = process.env.SANDBOX_IMAGE ?? 'sandcastle:pi-afk'
export const MODEL = process.env.AGENT_MODEL ?? 'deepseek/deepseek-v4-flash'
export const PLANNER_MODEL = process.env.PLANNER_MODEL ?? MODEL
export const THINKING = (process.env.AGENT_THINKING ?? 'medium') as sandcastle.PiOptions['thinking']
export const MAX_PARALLEL = Number(process.env.MAX_PARALLEL ?? 2)
export const MAX_ITERATIONS = Number(process.env.MAX_ITERATIONS ?? 5)
export const DELIVERY = process.env.DELIVERY ?? 'pr' // none | push | pr
export const SKIP_LABELS = (process.env.SKIP_LABELS ?? 'agent:done')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

export const WORKTREES_DIR = '.sandcastle/worktrees'
