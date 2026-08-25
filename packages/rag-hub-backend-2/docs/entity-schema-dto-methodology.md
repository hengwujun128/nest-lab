# NestJS 数据建模方法论：Entity / Schema / DTO

> 面向本项目（TypeORM + PostgreSQL、Mongoose + MongoDB）的实践指南。  
> 回答三个核心问题：**三者分别是什么、按什么顺序写、表/集合与代码谁先谁后。**

---

## 1. 先澄清概念

| 概念 | 用在哪 | 职责 | 本项目对应 |
| --- | --- | --- | --- |
| **Entity** | 关系型库（PostgreSQL） | 映射「表 ↔ TypeScript 类」，给 ORM 读写用 | TypeORM `@Entity()`，如 `kh_document` |
| **Schema** | 文档型库（MongoDB） | 映射「集合 ↔ 文档结构」，给 ODM 读写用 | Mongoose `@Schema()`，如 `document_content` |
| **DTO** | HTTP 边界（Controller） | 描述「请求/响应长什么样」，做校验与序列化 | `CreateXxxDto` / `UpdateXxxDto` / Response DTO |

一句话：

- **Entity / Schema = 持久化模型**（和数据库打交道）
- **DTO = 传输模型**（和前端 / 调用方打交道）

**不要把 Entity/Schema 直接当 DTO 用。** 持久化字段（`deleted`、`createBy`、内部计数等）往往不该原样暴露给 API。

```
客户端 JSON
    ↓  ValidationPipe + DTO（入参校验）
Controller
    ↓  Service（业务编排）
Entity / Schema（ORM/ODM）
    ↓
PostgreSQL / MongoDB
```

---

## 2. 核心结论：不要用 GUI 当「建表源头」

### 常见疑惑

> 是不是先在 pgAdmin / mongo-express 建好表，再回项目对着字段写 Entity / Schema？

### 业界答案

**不推荐作为常规流程。** 国内外主流做法是：

| 流派 | 做法 | 适用场景 |
| --- | --- | --- |
| **Code-First（推荐）** | 先在代码里定义 Entity/Schema，再用 **Migration** 同步到数据库 | 新项目、业务迭代快、团队协作 |
| **Database-First** | 先有库表（遗留库、DBA 主导），再用工具生成 Entity | 对接已有库、强管控的 DBA 流程 |
| **GUI 手工建表** | 在 pgAdmin 点点点建表，再手写映射 | 仅适合个人临时实验，**不适合团队/生产** |

**推荐默认：Code-First + Migration。**

原因：

1. **可版本化**：表结构变更跟 Git 走，可 Review、可回滚
2. **可复现**：新环境 `migrate` 即可，不靠「某人电脑上的 pgAdmin 操作记录」
3. **环境一致**：dev / staging / prod 结构同源
4. **GUI 是观察工具，不是 Schema 源头**：用 pgAdmin / mongo-express **查看、调试数据**；用代码 + Migration **定义结构**

> 本项目里的 `init-scripts/`（SQL / JS）属于「容器首次启动的引导脚本」，适合**初始化空环境**，不等同于日常迭代的 Schema 管理。日常改表应逐步迁到 TypeORM Migration（及 Mongo 的显式索引定义）。

---

## 3. 推荐写作顺序（日常开发）

以「新增一个业务资源」为例（如 Document）：

```
① 领域字段清单（纸上 / Issue / 设计备注）
        ↓
② Entity（PG）和/或 Schema（Mongo）   ← 持久化真相
        ↓
③ Migration / 索引定义                ← 落到真实库
        ↓
④ DTO（Create / Update / Query / Response）
        ↓
⑤ Service（业务逻辑，Entity ↔ DTO 转换）
        ↓
⑥ Controller（路由 + 校验管道）
```

### 为什么是这个顺序？

1. **先定「存什么」**（Entity/Schema），再定「对外收什么 / 回什么」（DTO）—— 避免 API 和库表两套真相互相打架
2. **DTO 往往是 Entity 的子集或变形**，例如：
   - Create：不要带 `id`、`viewCount`、`createdAt`
   - Update：全部字段可选（`PartialType`）
   - Response：隐藏 `deleted`、`createBy` 等内部字段
3. Controller 最后写：接口形状稳定后再暴露路由，减少反复改契约

### 与脚手架的关系

`nest g resource document` 会同时生成 Controller / Service / DTO / Entity 空壳——**可以生成，但按上面顺序填内容**：先填满 Entity/Schema，再填 DTO，再写 Service。

---

## 4. 本项目双库实践

本项目拆库意图（见 `init-scripts`）：

| 存储                           | 内容                           | 代码层              |
| ------------------------------ | ------------------------------ | ------------------- |
| **PostgreSQL `kh_document`**   | 文档元数据、统计、权限相关字段 | TypeORM **Entity**  |
| **MongoDB `document_content`** | 正文大文本、`documentId` 关联  | Mongoose **Schema** |

关联约定：

- PG `content_id` ↔ Mongo `_id`（字符串）
- Mongo `documentId` ↔ PG `id`（雪花等业务主键）

### 4.1 PostgreSQL：Entity 示例骨架

```ts
// src/document/entities/document.entity.ts
import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity({ name: 'kh_document' })
export class DocumentEntity {
  @PrimaryColumn({ type: 'bigint' })
  id: string // bigint 建议用 string，避免 JS 精度丢失

  @Column({ type: 'varchar' })
  title: string

  @Column({ name: 'content_id', type: 'varchar', unique: true })
  contentId: string

  @Column({ type: 'varchar', nullable: true })
  summary?: string

  @Column({ name: 'status', type: 'smallint', default: 0 })
  status: number

  @Column({ name: 'is_public', type: 'boolean', default: false })
  isPublic: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @Column({ type: 'boolean', default: false })
  deleted: boolean

  // ...其余字段按表一一映射
}
```

注意点：

- **表名、列名显式写出**（`name: 'kh_document'`、`name: 'content_id'`），不要依赖隐式命名转换
- **bigint → string**（Node `number` 不安全）
- **软删除字段** `deleted` 与业务查询默认过滤要在 Service/Repository 统一处理
- **生产禁用** `synchronize: true`，改用 Migration

### 4.2 MongoDB：Schema 示例骨架

```ts
// src/document/schemas/document-content.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

export type DocumentContentDocument = HydratedDocument<DocumentContent>

@Schema({ collection: 'document_content', timestamps: true })
export class DocumentContent {
  @Prop({ required: true, unique: true })
  documentId: string // 对应 PG kh_document.id

  @Prop({ required: true })
  body: string // 正文

  @Prop({ default: false })
  deleted: boolean
}

export const DocumentContentSchema = SchemaFactory.createForClass(DocumentContent)
// 索引也可在 Schema 上声明，或在 init-scripts 中创建（二者选一个作为主来源）
DocumentContentSchema.index({ documentId: 1 }, { unique: true })
```

注意点：

- Mongo **没有强制表结构**，Schema 是应用层约束；缺少字段的旧文档仍可能存在，读的时候要容忍
- **索引**要显式管理（唯一性、查询性能）
- 大文本、非结构化内容放 Mongo；需要事务/关联查询/强约束的元数据放 PG

### 4.3 DTO 示例骨架

```ts
// dto/create-document.dto.ts
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class CreateDocumentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string

  @IsString()
  @MinLength(1)
  body: string // 写入 Mongo，不直接进 Entity

  @IsOptional()
  @IsString()
  summary?: string

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean
}
```

```ts
// dto/update-document.dto.ts
import { PartialType } from '@nestjs/mapped-types'
import { CreateDocumentDto } from './create-document.dto'

export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {}
```

注意点：

- DTO **只描述 API 契约**，可跨 PG + Mongo 字段组合（如同时含 `title` + `body`）
- Service 内拆分：元数据 → Entity；正文 → Schema
- 开启全局 `ValidationPipe({ whitelist: true, transform: true })`，拒绝未知字段

---

## 5. 推荐工作流（对照你现在的工具）

### ✅ 推荐流程

```
1. 在代码里设计 Entity / Schema（字段、类型、索引、关联）
2. 生成 / 手写 Migration（PG）；确认 Mongo 索引在 Schema 或迁移脚本中
3. 本地执行 Migration，用 pgAdmin / mongo-express 验证「结构是否正确」
4. 写 DTO + Service + Controller
5. 用 API 写入几条数据，再在 GUI 里看数据是否符合预期
```

### ❌ 不推荐流程

```
1. 打开 pgAdmin 手工 CREATE TABLE
2. 打开 mongo-express 手工建集合
3. 回 IDE 对着 GUI 抄字段写 Entity
4. 队友环境不一致 → 线上缺列 / 索引对不上
```

### 例外：何时 Database-First 合理？

- 对接**已有生产库**，表由 DBA / 其他系统拥有
- 用 `typeorm-model-generator` 等工具从库生成 Entity 初稿，再纳入 Git
- 之后的变更仍应回到 **Migration 驱动**，不要继续「只在 GUI 改」

### 本仓库 `init-scripts` 怎么定位？

| 用途                        | 建议                                                          |
| --------------------------- | ------------------------------------------------------------- |
| Docker 第一次起来、空库引导 | ✅ 继续用 `init-scripts`                                      |
| 功能迭代中途改字段          | ❌ 不要只改 init.sql（已初始化的 volume **不会重跑**）        |
| 迭代改结构                  | ✅ TypeORM Migration +（可选）独立 Mongo 索引脚本，并提交 Git |

本地若已有 `volumes/` 数据，改 `init-scripts` **不会生效**；要么 Migration，要么清 volume 重建（仅限本地）。

---

## 6. 三者对照：该写在哪？

| 字段例子    | Entity (PG) | Schema (Mongo) |    CreateDto    |   ResponseDto    |
| ----------- | :---------: | :------------: | :-------------: | :--------------: |
| `title`     |     ✅      |       ❌       |       ✅        |        ✅        |
| `body` 正文 |     ❌      |       ✅       |       ✅        | ✅（详情才返回） |
| `viewCount` |     ✅      |       ❌       |       ❌        |        ✅        |
| `createdAt` |     ✅      | ✅(timestamps) |       ❌        |        ✅        |
| `deleted`   |     ✅      |       ✅       |       ❌        |        ❌        |
| `createBy`  |     ✅      |      可选      | ❌（从 JWT 取） |      视需求      |
| `id`        |     ✅      |   `_id` 自动   |       ❌        |        ✅        |

原则：**谁产生、谁存储、谁可见，三者分开想。**

---

## 7. 注意点清单（避坑）

### 建模

1. Entity / Schema / DTO **分层清晰**，禁止 Controller 直接 `save(req.body)`
2. 命名：库用 `snake_case` 列名，TS 用 `camelCase`，用 `name:` 映射
3. 枚举状态（如 `status`）用 TS `enum` 或常量，避免魔法数字散落
4. 软删除优先统一封装，避免漏过滤

### ORM / ODM

5. **关闭生产 `synchronize`**，用 Migration
6. 关联查询注意 N+1；需要时用 `relations` / QueryBuilder / `populate`
7. 跨 PG + Mongo 的写操作：没有分布式事务时，采用「先写主、再写从 + 补偿/重试」或 Outbox 模式
8. Mongo Schema 变更是**向后兼容**思维：加字段给默认值；删字段先停写再清数据

### DTO / API

9. 入参用 `class-validator`；出参用 `class-transformer`（`@Exclude` / 专用 Response DTO）
10. Update 用 `PartialType`；不要和 Create 共用一个「全能 DTO」长期演进
11. 分页查询单独 `QueryDocumentDto`（page、pageSize、keyword…）

### 协作与环境

12. Schema 变更必须进 Git，并在 PR 中说明 Migration
13. GUI 仅用于观测；发现结构不对，回代码修，而不是只在 GUI 改一下
14. 文档 / 注释写「业务含义」，不写「这个字段对应第几列」这种易过时信息

---

## 8. 国内外业界共识（浓缩）

| 主题          | 共识                                                                           |
| ------------- | ------------------------------------------------------------------------------ |
| Schema 源头   | **代码 + Migration** 是 Source of Truth                                        |
| GUI 工具      | 运维/调试辅助，不是建模入口                                                    |
| DTO           | API 契约层，与持久化模型分离（DDD 里常称 Anti-Corruption / Presentation 边界） |
| Nest 官方倾向 | Resource 脚手架分 Entity + DTO；校验走 Pipe；配置模块化                        |
| 演进          | 早期可 `synchronize` 加速原型；**上线前必须切 Migration**                      |
| 遗留库        | Database-First 生成一次，之后仍用 Migration 管理变更                           |

相关关键词（便于继续检索）：

- TypeORM Migrations
- Prisma Migrate（同思路的另一套 ORM）
- Mongoose Schema Design
- NestJS ValidationPipe / mapped-types
- Database Schema as Code

---

## 9. 建议你在本项目落地的最小规范

1. **PG 元数据** → `entities/*.entity.ts` + TypeORM Migration
2. **Mongo 正文** → `schemas/*.schema.ts` + Schema 内声明索引
3. **API** → `dto/create-*.dto.ts`、`update-*.dto.ts`、必要时 `*-response.dto.ts`
4. **Service** 负责：DTO → 拆分写入 Entity + Schema；读取时再组装 Response
5. **pgAdmin / mongo-express** 只做：看数据、查慢查询、确认 Migration 结果

---

## 10. 一张图记住顺序

```
设计字段
   → Entity / Schema（怎么存）
   → Migration / Index（真正建起来）
   → DTO（怎么收、怎么回）
   → Service / Controller（怎么用）
   → GUI 验证（看一眼对不对）
```

**不是：** GUI 建表 → 抄字段写 Entity。

---

## 参考

- [NestJS — Database (TypeORM)](https://docs.nestjs.com/techniques/database)
- [NestJS — MongoDB (Mongoose)](https://docs.nestjs.com/techniques/mongodb)
- [NestJS — Validation](https://docs.nestjs.com/techniques/validation)
- [TypeORM — Migrations](https://typeorm.io/migrations)
- [Mongoose — Schemas](https://mongoosejs.com/docs/guide.html)
