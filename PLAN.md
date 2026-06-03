# Token 用量追踪 & 成就系统 — 实施计划

## Context

构建一个游戏化成就系统来追踪大模型 token 用量，后续新增桌面宠物通过 token "喂食"。项目从零开始，分三阶段推进。本次仅实施**第一阶段：Token 数据层 + CLI 面板**。

### 关键发现：Claude Code 已存储每条消息的 Token 数据

Claude Code 在 `~/.claude/projects/<hash>/<session-id>.jsonl` 中记录了每次对话的 token 用量。每条 `type: "assistant"` 的消息包含 `message.usage` 对象，无需自行搭建 API 代理即可采集数据。

---

## 技术选型

| 项目 | 选择 | 理由 |
|------|------|------|
| 语言 | TypeScript | 核心库可被 CLI 和未来的 Electron 桌面宠物共用 |
| 数据库 | SQLite (better-sqlite3) | 本地单文件，零配置，同步 API 适合 CLI |
| 包管理 | npm workspaces | monorepo，`core` / `cli` 分离 |
| CLI 框架 | commander.js + chalk + cli-table3 | 成熟稳定 |

---

## 项目结构

```
/Users/zhaoyan/wks/achievements/
├── package.json                  # npm workspace root
├── tsconfig.base.json
├── .gitignore
└── packages/
    ├── core/                     # @achievements/core — 纯逻辑，零 UI 依赖
    │   └── src/
    │       ├── index.ts          # 公开 API
    │       ├── types.ts          # 共享类型定义
    │       ├── db/
    │       │   ├── connection.ts # SQLite 连接单例
    │       │   └── migrations.ts # Schema 建表 & 迁移
    │       ├── ingest/
    │       │   ├── claude-code.ts # 解析 Claude Code JSONL 转录
    │       │   ├── manual.ts     # 手动输入
    │       │   └── index.ts
    │       └── query/
    │           ├── daily.ts      # 按天聚合
    │           ├── weekly.ts     # 按周聚合
    │           ├── models.ts     # 按模型分解
    │           ├── projects.ts   # 按项目分解
    │           └── stats.ts      # 整体统计
    └── cli/                      # @achievements/cli — 命令行界面
        └── src/
            ├── index.ts          # 入口 & bin 注册
            ├── commands/
            │   ├── ingest.ts
            │   ├── dashboard.ts
            │   ├── daily.ts
            │   ├── weekly.ts
            │   ├── models.ts
            │   ├── projects.ts
            │   └── add.ts        # 手动录入
            └── display/
                ├── table.ts
                └── format.ts
```

---

## SQLite 数据模型

### token_usage（核心表，每条 LLM 交互一行）

| 列 | 类型 | 说明 |
|----|------|------|
| id | INTEGER PK | 自增 |
| timestamp | TEXT | ISO 8601 |
| model | TEXT | 模型名 |
| input_tokens | INTEGER | 输入 token |
| output_tokens | INTEGER | 输出 token |
| cache_read_input_tokens | INTEGER | 缓存命中读取 |
| cache_creation_input_tokens | INTEGER | 缓存写入 |
| source | TEXT | `claude-code` / `manual` / `api` |
| project | TEXT | 项目路径 |
| session_id | TEXT | 会话 ID |
| message_id | TEXT UNIQUE | 消息 ID（去重） |

### daily_summary（物化视图，每次 ingest 后刷新）

按 `(date, model)` 聚合，加速面板查询。

### achievement_defs / user_achievements（Phase 2 占位表）

本次建表但不填充。

---

## CLI 命令设计

```
achievements
├── ingest            # 扫描并导入 Claude Code 转录
│   --all / --quick / --dry-run / --data-dir
├── dashboard         # 默认命令，最近 7 天概览
├── today             # 今日用量
├── daily [date]      # 某天报告
├── weekly [date]     # 某周报告
├── models            # 按模型分解
├── projects          # 按项目分解
├── add               # 手动录入 token
│   --model --input --output --source --project
└── stats             # 快速总览
```

---

## 数据采集流程

1. 扫描 `~/.claude/projects/**/` 下所有 `*.jsonl`
2. 筛选 `type === "assistant"` 且含 `message.usage` 的行
3. 提取 timestamp/model/tokens/project/session/message_id
4. `INSERT OR IGNORE`（依赖 message_id UNIQUE 去重）
5. 同样扫描 `subagents/` 子目录
6. 每次 ingest 后重建 `daily_summary`

---

## 实施步骤（16 步）

| Step | 内容 | 关键文件 |
|------|------|----------|
| 1 | 创建 monorepo 结构、根 package.json、tsconfig | 根目录文件 |
| 2 | types.ts — 共享接口定义 | `core/src/types.ts` |
| 3 | connection.ts — SQLite 单例 | `core/src/db/connection.ts` |
| 4 | migrations.ts — 建表迁移 | `core/src/db/migrations.ts` |
| 5 | claude-code.ts — JSONL 解析器 | `core/src/ingest/claude-code.ts` |
| 6 | manual.ts — 手动录入 | `core/src/ingest/manual.ts` |
| 7 | 查询函数 (daily/weekly/models/projects/stats) | `core/src/query/*.ts` |
| 8 | core/src/index.ts — 公开 API 导出 | `core/src/index.ts` |
| 9 | CLI 入口 + commander.js 注册 | `cli/src/index.ts` |
| 10 | ingest 命令 | `cli/src/commands/ingest.ts` |
| 11 | dashboard 命令 | `cli/src/commands/dashboard.ts` |
| 12 | daily/weekly/models/projects 命令 | `cli/src/commands/*.ts` |
| 13 | add 命令（手动录入） | `cli/src/commands/add.ts` |
| 14 | display 工具（表格/格式化） | `cli/src/display/*.ts` |
| 15 | bin 配置 + 端到端测试 | `cli/package.json` |
| 16 | .gitignore + README | 根目录 |

---

## Phase 2：成就系统（详细设计）

### 新增模块结构

```
packages/core/src/achievements/
  index.ts           — 公开 API（re-export）
  definitions.ts     — 15 个内置成就定义 + seedAchievements(db)
  evaluate.ts        — 评估引擎 + 6 个 evaluator 函数

packages/cli/src/commands/
  achievements.ts    — achievements list / achievements check 命令

需要修改的现有文件：
  packages/core/src/types.ts         — 新增类型 + cache_hit_rate 条件
  packages/core/src/index.ts         — 导出新模块
  packages/cli/src/index.ts          — 注册 achievements 子命令
  packages/cli/src/display/format.ts — 新增 progressBar()
  packages/cli/src/display/table.ts  — 新增 renderAchievementTable()
  packages/cli/src/commands/dashboard.ts — 底部展示成就进度
```

---

### 15 个内置成就

**token_volume（7 个，主线进度）:**

| id | 名称 | 图标 | 条件 |
|----|------|------|------|
| `first-steps` | First Steps / 初次尝试 | 🌱 | total_tokens ≥ 1,000 |
| `getting-warm` | Getting Warm / 渐入佳境 | 🔥 | total_tokens ≥ 10,000 |
| `token-novice` | Token Novice / Token学徒 | 📚 | total_tokens ≥ 50,000 |
| `token-scholar` | Token Scholar / Token学者 | 🎓 | total_tokens ≥ 200,000 |
| `token-master` | Token Master / Token大师 | 👑 | total_tokens ≥ 500,000 |
| `token-legend` | Token Legend / Token传奇 | 🌟 | total_tokens ≥ 1,000,000 |
| `power-hour` | Power Hour / 爆发时刻 | ⚡ | 单日 ≥ 20,000 tokens |

**streak（3 个，连续使用奖励）:**

| id | 名称 | 图标 | 条件 |
|----|------|------|------|
| `three-day-streak` | Three Day Streak / 三日之约 | 📅 | 连续 3 天 |
| `weekly-warrior` | Weekly Warrior / 周常勇士 | ⚔️ | 连续 7 天 |
| `fortnight-force` | Fortnight Force / 半月之力 | 🏰 | 连续 14 天 |

**model_variety（2 个，探索奖励）:**

| id | 名称 | 图标 | 条件 |
|----|------|------|------|
| `model-explorer` | Model Explorer | 🔍 | 使用 2 个模型 |
| `model-collector` | Model Collector | 🧩 | 使用 3 个模型 |

**project（2 个，广度奖励）:**

| id | 名称 | 图标 | 条件 |
|----|------|------|------|
| `project-starter` | Project Starter | 🚀 | 横跨 2 个项目 |
| `polyglot-coder` | Polyglot Coder | 🌐 | 横跨 5 个项目 |

**efficiency（1 个，优化奖励）:**

| id | 名称 | 图标 | 条件 |
|----|------|------|------|
| `cache-whisperer` | Cache Whisperer / 缓存低语者 | 💾 | 缓存命中率 ≥ 30% |

### 新增类型

在 `types.ts` 中新增：
- `AchievementCriteria` 增加 `{ type: 'cache_hit_rate'; ratio: number }` 变体
- `AchievementEvalResult` — 单条成就评估结果（含 progress、isNewlyUnlocked、unlockedAt、metadata）
- `EvaluateAllResult` — 聚合结果（含 results、newlyUnlocked、totalAchievements、totalUnlocked）

### 评估引擎设计

**核心函数：** `evaluateAll(db): EvaluateAllResult`

**解锁检测机制：** 用 `'in-progress'` 作为 `unlocked_at` 的哨兵值，标记未达成但已有进度的成就。user_achievements 表逻辑：
- 已解锁：正常行，`unlocked_at` = ISO 时间戳
- 进行中：`unlocked_at = 'in-progress'`，`progress` = 0.0~1.0
- 未开始：无对应行

**评估流程：**
1. `seedAchievements(db)` — 确保 15 条定义已入库（INSERT OR IGNORE）
2. 加载所有 achievement_defs
3. 加载已有的 unlocked 和 in-progress 记录
4. 对每条定义执行对应的 evaluator，计算 progress
5. progress ≥ 1.0 且未曾解锁 → 记录新解锁（DELETE in-progress + INSERT 时间戳）
6. progress < 1.0 → INSERT OR REPLACE 为 in-progress
7. 返回结果，标记 `isNewlyUnlocked` 用于 CLI 庆祝展示

**6 个评估器：**

| 评估器 | SQL/算法 |
|--------|----------|
| `evaluateTotalTokens` | `SELECT SUM(input+output) FROM token_usage` |
| `evaluateSingleDayVolume` | `SELECT MAX(day_sum) FROM (GROUP BY date)` |
| `evaluateDailyStreak` | 查询 DISTINCT dates → 遍历计算最长连续天数 |
| `evaluateModelCount` | `SELECT COUNT(DISTINCT model) FROM token_usage` |
| `evaluateProjectCount` | `SELECT COUNT(DISTINCT project) FROM token_usage WHERE project IS NOT NULL` |
| `evaluateCacheHitRate` | `SUM(cache_read) / SUM(input_tokens)` |

### CLI 命令

```
achievements          → achievements list（默认）
achievements list     → 查看所有成就，按类别分组，显示进度条和状态
achievements check    → 评估所有成就，如有新解锁显示庆祝动画
```

**list 输出示例：** 按类别分组的表格，每行显示图标、名称、进度条、百分比、元数据。用 ✨🔓/⬜/🔒 标记已解锁/进行中/锁定。

**check 输出示例：** 新解锁时显示大号庆祝框（🎉 ACHIEVEMENT UNLOCKED 🎉），列出最近解锁；无新解锁时显示当前进度和最接近达成的成就。

**dashboard 集成：** 在模型分解表下方新增一行紧凑的成就摘要：`🏆 Achievements: 5/15 unlocked | 🔜 Next: 👑 Token Master (61%)`

### 实施步骤（10 步）

| Step | 内容 | 关键文件 |
|------|------|----------|
| 1 | types.ts 新增 cache_hit_rate 条件、AchievementEvalResult、EvaluateAllResult | `core/src/types.ts` |
| 2 | definitions.ts — 15 条内置成就 + seedAchievements() | `core/src/achievements/definitions.ts` |
| 3 | evaluate.ts — 6 个评估器 + evaluateAll() 主逻辑 | `core/src/achievements/evaluate.ts` |
| 4 | achievements/index.ts — barrel export | `core/src/achievements/index.ts` |
| 5 | core/src/index.ts — 更新公开 API 导出 | `core/src/index.ts` |
| 6 | format.ts + table.ts — progressBar() + renderAchievementTable() | `cli/src/display/` |
| 7 | achievements.ts — list/check 命令实现 | `cli/src/commands/achievements.ts` |
| 8 | CLI 入口注册 achievements 子命令 | `cli/src/index.ts` |
| 9 | dashboard 底部集成成就进度摘要 | `cli/src/commands/dashboard.ts` |
| 10 | 构建验证 + 全流程测试 | `npm run build` + `achievements check` |

---

## Phase 3（后续预留）

桌面宠物：Electron 直接 import `@achievements/core`，读取同一个 SQLite；宠物饥饿度与近期 token 使用频率挂钩

---

## 验证方式（Phase 2）

1. `npm run build` — 编译通过
2. `achievements list` — 显示 15 条成就，根据现有数据已有部分解锁
3. `achievements check` — 运行评估，显示新解锁成就（首次应有多个）
4. `achievements check` — 再次运行，确认无重复解锁
5. `achievements dashboard` — 底部显示成就进度摘要
6. 再次 `npm run build` — 确认无 TS 错误
