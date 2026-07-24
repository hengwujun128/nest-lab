# 多环境数据迁移方法论：dev / test / prod

> 面向本项目（TypeORM + PostgreSQL、Mongoose + MongoDB）的实践指南。  
> 回答：三环境迁移有没有顺序、业界怎么做、注意点是什么、本项目怎么落地。  
> 建议与 [`entity-schema-dto-methodology.md`](./entity-schema-dto-methodology.md) 一起阅读。

---

## 1. 先澄清：迁移管的是什么

| 概念 | 含义 | 本项目 |
|------|------|--------|
| **Schema Migration** | 改库结构：建表、加列、改索引、改约束 | TypeORM Migration → PostgreSQL |
| **Data Migration** | 改已有数据：回填、拆分、清洗 | 可写在同一 Migration，或独立脚本 |
| **Index / Collection 变更** | Mongo 侧结构偏「软」 | Schema 声明索引 + 启动/CI 确保索引存在 |
| **Seed** | 灌入初始/演示数据 | 仅 dev（偶尔 test），**禁止**当 prod 常规手段 |

一句话：

- **Migration = 可版本化、可重复、可回滚（或可前进修复）的数据库变更**
- **环境 = 同一套 Migration 文件，在不同库上按顺序执行**

---

## 2. 核心结论：一套 Migration，多环境顺序推进

### 业界共识（国内外一致）

```
本地开发 (dev)
    → 合入主干 / PR
    → CI 在 test（或 staging）自动执行 Migration + 跑测试
    → 人工/发布流水线在 prod 执行同一批 Migration
    → 再（或同时）发布应用代码
```

| 原则 | 说明 |
|------|------|
| **Single Source of Truth** | 所有环境共用 Git 里同一份 Migration，禁止「只在 prod 手工改一下」 |
| **向上晋升 (Promote)** | 变更只从低环境 → 高环境推进，不反向抄 |
| **先库后码 / 兼容发布** | 生产上优先保证「新库结构仍兼容旧代码」，再切流量到新代码 |
| **自动化** | test/prod 的 migrate 由 CI/CD 执行，不靠人手连 GUI |
| **可观测** | 有 `migrations` 历史表（TypeORM 默认），能查「跑到哪了」 |

### 环境角色

| 环境 | 库数据特征 | Migration 目的 |
|------|------------|----------------|
| **dev** | 可丢、可乱、可反复重置 | 写 Migration、试错、本地验证 |
| **test**（含 CI / staging） | 接近生产结构，可用脱敏副本或合成数据 | 验证 Migration 在「非空库」上是否成功、应用是否兼容 |
| **prod** | 真实、不可丢 | 只执行已在 test 验证过的 Migration |

> 命名差异：有的团队叫 `staging` 而不叫 `test`。本质都是「prod 之前的最后一道真实演练」。本项目文档统一用 **dev → test → prod**。

---

## 3. 推荐顺序（发布一条变更时）

### 3.1 日常功能变更（加字段、加表、加索引）

```
① dev：改 Entity/Schema → 生成 Migration → 本地执行 → 自测 API
② PR：把 Entity + Migration 一并提交（缺 Migration 的 PR 不合并）
③ test：CI/CD 对 test 库执行 `migration:run` → 跑集成/E2E
④ prod：发布窗口执行同一批 `migration:run` → 再部署（或滚动）应用
⑤ 用监控/日志确认；GUI 仅做抽查，不当操作入口
```

### 3.2 为什么必须是这个顺序？

1. **dev 试错成本最低**：写错 Migration 可重置本地库  
2. **test 暴露「有数据时」的问题**：空库能过、有数据就失败（NOT NULL 无默认值、唯一索引冲突等）最常见  
3. **prod 只做「已知可成功」的动作**：不在生产现场发明新 SQL  

### 3.3 一张图

```
开发者笔记本 (dev)
        │  git push / PR
        ▼
   CI + test 库  ────  migration:run  ──►  测试通过？
        │                    否 → 修 Migration，重来
        │ 是
        ▼
   发布审批 / 流水线
        │
        ▼
   prod 库  ────  migration:run  ──►  部署新版本应用
```

---

## 4. Expand / Contract：生产安全变更的方法论

国内外（尤其 Google、GitHub、很多 SaaS 团队）对**有流量的生产库**，普遍采用 **Expand/Contract（扩展/收缩）**，而不是「一次 Migration 把旧列删掉并改死」。

### 阶段拆解

| 阶段 | 做什么 | 应用代码 |
|------|--------|----------|
| **Expand（扩展）** | 只「加」：新列、新表、新索引（尽量 `CONCURRENTLY`） | 旧代码仍能跑；新代码开始双写/读新字段 |
| **Migrate data** | 回填历史数据（可分批、可后台任务） | 新旧字段并存 |
| **Cut over** | 读路径切到新字段/新表 | 新代码为主 |
| **Contract（收缩）** | 删旧列、旧索引、旧表 | 确认无旧代码依赖后再删 |

### 为何重要？

滚动发布时，**短时间内新旧应用实例并存**。若 Migration 一次性删列，旧实例会直接报错。

### 本项目举例：给 `kh_document` 加 `source` 字段

1. Migration A：`ADD COLUMN source varchar NULL`（可空，旧代码无感）  
2. 部署支持读写 `source` 的新版本  
3. 后台回填历史行的 `source`  
4. （可选）Migration B：`SET NOT NULL` + 默认值  
5. 很久以后若有废弃字段，再 Contract 删除  

**禁止在 prod 直接：** `DROP COLUMN` 与「强制依赖新列的代码」同一发版硬切（除非停机窗口且已评估）。

---

## 5. Migration 与应用发布的时序

### 推荐默认：**先迁移，后发版（Forward-compatible）**

```
prod: migration:run  →  确认成功  →  部署应用新版本
```

前提：Migration **向后兼容旧代码**（Expand 优先）。

### 何时「先发版，后迁移」？

较少见。仅当新代码能在「尚未迁移」的旧结构上安全运行，且 Migration 只做清理时。新手默认不要选这条。

### 何时需要停机？

- 重写大表、强锁、无法 online 的变更  
- 无兼容期的破坏性变更  

能 online 就 online；不能则预约窗口，先演练 test。

---

## 6. PostgreSQL（TypeORM）实践要点

### 6.1 环境配置原则

| 配置 | dev | test | prod |
|------|-----|------|------|
| `synchronize` | 仅早期原型可 true，**尽快关掉** | **false** | **false** |
| Migration 执行 | 本地手动 / 启动脚本 | CI 自动 | CD 自动（需权限与审批） |
| 数据库账号 | 本地凭据 | CI Secret | 最小权限；migrate 可用独立角色 |

**铁律：test / prod 永远不要 `synchronize: true`。**

### 6.2 命令心智模型（落地时）

```bash
# 开发：根据 Entity 差异生成迁移（示例，以你接入 TypeORM CLI 后的脚本为准）
pnpm typeorm migration:generate src/database/migrations/AddDocumentSource

# 查看状态
pnpm typeorm migration:show

# 执行未跑过的迁移（test/prod 流水线核心步骤）
pnpm typeorm migration:run

# 回滚最后一批（仅当 Migration 实现了 down 且评估安全）
pnpm typeorm migration:revert
```

### 6.3 版本表

TypeORM 使用类似 `migrations` 的表记录已执行文件。  
**三个环境各自有自己的库 → 各自有一份执行历史。**  
同一 Migration 文件会在每个环境各执行一次（按时间戳顺序）。

### 6.4 注意点

1. **Migration 必须提交 Git**，与 Entity 同 PR  
2. **已合并到主干的 Migration 禁止改内容**（尤其已在 test/prod 跑过）；只能新增后续 Migration 修复  
3. **本地乱序**：多人并行生成同时间戳时注意冲突，合并后在干净库上重放验证  
4. **长锁**：大表 `ALTER`、建唯一索引要评估锁；PG 上建索引优先考虑并发策略与维护窗口  
5. **`down` 不是万能药**：prod 更常见是 **forward fix**（再写一个 Migration 修），而不是 revert  
6. **init-scripts ≠ Migration**：`init-scripts/postgresql/init.sql` 只服务 Docker **首次**空库；已有 volume 不会重跑。三环境日常变更必须走 Migration  

---

## 7. MongoDB（Mongoose）实践要点

Mongo 没有与 TypeORM 完全同构的「官方 Migration 必选方案」，业界常见组合：

| 做法 | 说明 |
|------|------|
| **Schema + 自动/显式建索引** | 应用启动或 CI 调用 `syncIndexes` / 确保索引 |
| **迁移脚本框架** | 如 migrate-mongo 等，把脚本纳入 Git，CI 执行 |
| **应用内兼容读写** | 代码同时容忍旧文档缺字段，读时给默认值 |

### 本项目建议

1. **结构约定写在** `schemas/*.schema.ts`（Source of Truth）  
2. **索引**：Schema 上声明；test/prod 发布时确保索引已建（启动检查或独立 job）  
3. **破坏性数据变更**（字段改名、拆集合）：写可重复执行的脚本，顺序同样是 **dev → test → prod**  
4. **不要在 mongo-express 上点点点改索引当发布手段**

### PG + Mongo 联动变更

例如「正文从某处迁到 Mongo」：

1. 先 Expand：Mongo 集合/索引就绪  
2. 应用双写或切换写路径  
3. 回填/校验  
4. 再 Contract：停旧路径  

跨库没有分布式事务时，按 **可重试、可对账、可补偿** 设计，而不是假设一次部署原子成功。

---

## 8. CI/CD 流水线怎么嵌 Migration

### 推荐流水线骨架

```
PR 合并到 main
    → build
    →（对 test）migration:run
    → e2e / integration tests
    →（通过后）制品可标记为可发布
发布到 prod
    → 备份 / 快照（按公司规范）
    → migration:run
    → deploy app
    → smoke test / 健康检查
    → 失败则回滚应用；库变更用 forward-fix 或预案处理
```

### 权限与密钥

- 连接串放 Secret（GitHub Actions / 公司 CI），不进仓库  
- prod migrate 角色可与运行时应用角色分离：migrate 可 DDL，应用仅 DML  

### 失败怎么处理

| 情况 | 做法 |
|------|------|
| test 迁移失败 | 阻断合并/发布，修脚本后重跑 |
| prod 迁移失败 | 停止后续部署；评估是否事务已回滚；需要时 forward-fix |
| 迁移成功但应用挂了 | 回滚应用版本（结构应仍兼容旧代码——这就是 Expand 的价值） |

---

## 9. 回滚策略：业界真实做法

很多人以为「迁移失败就 migration:revert」。生产上更常见：

| 策略 | 适用 |
|------|------|
| **回滚应用，保留库变更** | Migration 向后兼容时最安全 |
| **Forward fix** | 再发一个 Migration 把错误修正确 |
| **Revert Migration** | 仅当 `down` 正确、数据可逆、且未写入大量依赖新结构的数据 |
| **从备份恢复** | 灾难级；需演练，不是默认按钮 |

**注意：** 回滚应用容易；回滚「已改写的数据」很难。Data Migration 要可批、可停、可校验。

---

## 10. 三环境差异与注意点清单

### 数据

- **prod 数据绝不直接同步到个人笔记本**（合规）；需要时用脱敏副本  
- test 最好有「足够像 prod」的数据量，否则锁与性能问题测不出来  
- Seed 只服务 dev；test 用 fixture；prod 用正式运营/迁移任务  

### 流程

- 禁止跳过 test 直接改 prod  
- 禁止在 pgAdmin / mongo-express 上手改 prod 结构后「再补 Migration」（极易漂移）  
- 多人并行改同一表时，合并后在干净库从头 `migration:run` 验证一遍  

### 变更类型

- 加可空列、加表：低风险，可跟随常规发版  
- 改类型、删列、改唯一约束：高风险，走 Expand/Contract + 窗口  
- 大表回填：分批、限流、可观测进度  

### 本项目双库

- PG 用 TypeORM Migration 管死  
- Mongo 用 Schema + 索引同步/脚本管起来  
- 跨库变更拆步骤，每步可在 test 演练  

---

## 11. 反模式（看到就该停）

1. 三个环境各写一套不同的 SQL，靠人肉对齐  
2. prod 开 `synchronize: true`  
3. 只改 `init-scripts`，以为 test/prod 会自己更新  
4. 已上线的 Migration 文件被 rewrite 历史  
5. 删除列与依赖该列的旧代码同一时刻硬切，无兼容窗口  
6. 在 GUI 改完结构，忘记生成 Migration  
7. CI 不跑 migrate，靠发布同学本地连 prod 执行  

---

## 12. 针对本项目的落地规范（总结）

### 目录与职责（建议目标态）

```
src/
  database/
    migrations/          # TypeORM：PG 唯一结构变更入口
    data-source.ts       # CLI 用 DataSource
  document/
    entities/            # PG Entity
    schemas/             # Mongo Schema
init-scripts/            # 仅 Docker 空库引导，不参与三环境日常迁移
docs/
  entity-schema-dto-methodology.md
  multi-env-migration-methodology.md   # 本文
```

### 环境推进口令

```
dev 写迁移 → test 验证迁移 → prod 执行同一迁移 → 再发应用
```

### 发版检查清单（可复制到 PR）

- [ ] Entity / Schema 变更已提交  
- [ ] 对应 Migration（或 Mongo 索引/脚本）已提交  
- [ ] 本地 dev 已 `migration:run` 且接口自测通过  
- [ ] 变更是 Expand 优先？若有破坏性，是否写明 Contract 后续 PR？  
- [ ] test 流水线会执行 migrate + 测试  
- [ ] prod 发布步骤包含 migrate，且应用与结构兼容  
- [ ] 未改已上线 Migration 文件内容  
- [ ] 未依赖 init-scripts 更新已有环境  

### 与建模文档的衔接

| 文档 | 回答 |
|------|------|
| `entity-schema-dto-methodology.md` | 怎么建模、Entity/Schema/DTO 顺序 |
| **本文** | 建好的结构如何安全地推到 dev/test/prod |

---

## 13. 国内外实践关键词（便于继续检索）

- Expand/Contract pattern（并行变更 / 兼容发布）  
- Schema as Code / Migration-based workflow  
- TypeORM Migrations  
- migrate-mongo / MongoDB schema evolution  
- Blue-green / Rolling deploy + backward-compatible migrations  
- Flyway / Liquibase（Java 生态同源思想，可对照理解）  
- 12-Factor：把后端存储变更当作版本化发布的一部分  

---

## 14. 一句话记住

> **同一套 Migration，按 dev → test → prod 晋升；生产只做已验证的 Expand 式变更；GUI 不参与发布；init-scripts 不替代 Migration。**

---

## 参考

- [TypeORM — Migrations](https://typeorm.io/migrations)  
- [NestJS — Database](https://docs.nestjs.com/techniques/database)  
- [PostgreSQL — ALTER TABLE / Indexes](https://www.postgresql.org/docs/current/sql-altertable.html)  
- [Mongoose — Indexes](https://mongoosejs.com/docs/guide.html#indexes)  
- 并行变更思想：Expand/Contract（业界通称，见各类 SaaS 工程博客与 MariaDB/GitHub 工程实践）
