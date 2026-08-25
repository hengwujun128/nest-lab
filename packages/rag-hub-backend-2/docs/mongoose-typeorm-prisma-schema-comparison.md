# Mongoose `@Schema` · TypeORM `@Entity` · Prisma Schema 对比

> 结合本项目 `DocumentContent`（Mongo）与 `DocumentEntity`（Postgres）说明三种「表/集合结构映射」的写法异同与注意点。

---

## 1. 一句话定位

| 方案 | 定位 | 定义语言 | 典型数据库 |
| --- | --- | --- | --- |
| **Mongoose `@Schema`** | ODM：文档 ↔ TS 类 | TypeScript 装饰器 | MongoDB |
| **TypeORM `@Entity`** | ORM：表行 ↔ TS 类 | TypeScript 装饰器 | PostgreSQL / MySQL 等 |
| **Prisma Schema** | Schema-first ORM | 独立 DSL（`.prisma`） | PostgreSQL / MySQL / Mongo 等 |

共同点：都在描述「持久化结构 → 应用层类型」。  
最大分野：前两者是 **Code-first（类即模型）**；Prisma 是 **Schema-first（DSL 生成 Client）**。

---

## 2. 本项目对照示例

### 2.1 Mongoose（正文集合）

```ts
@Schema({ collection: 'document_content', timestamps: true, versionKey: false })
export class DocumentContent {
  _id!: Types.ObjectId

  @Prop({ type: String, required: true, index: true })
  documentId!: string

  @Prop({ type: String, required: true, default: '' })
  content!: string

  @Prop({ type: Boolean, default: false })
  deleted!: boolean
}

export const DocumentContentSchema = SchemaFactory.createForClass(DocumentContent)
```

要点：

- `@Schema` 描述集合级选项（集合名、时间戳、`versionKey`）
- `@Prop` 描述字段类型、默认值、索引
- 必须再 `SchemaFactory.createForClass` 得到真正的 Mongoose Schema
- `_id` 由 Mongo 驱动生成，类上声明是为了类型与业务关联说明

### 2.2 TypeORM（元数据表）

```ts
@Entity('kh_document')
export class DocumentEntity {
  @PrimaryColumn({ type: 'bigint', transformer: bigintTransformer })
  id!: string

  @Column({ name: 'content_id', type: 'varchar', unique: true })
  contentId: string

  @Column({ name: 'word_count', type: 'int', default: 0 })
  wordCount: number

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date
}
```

要点：

- `@Entity('表名')` 直接对应关系表
- `@Column` 要写清 **SQL 类型**、列名、nullable、默认值
- 主键用 `@PrimaryColumn` / `@PrimaryGeneratedColumn`
- `bigint` ↔ JS `string` 常靠 `transformer`（避免 Number 精度丢失）
- 命名风格：TS 用 camelCase，DB 用 snake_case（靠 `name:` 映射）

### 2.3 Prisma（等价写法示意，本仓库暂无）

```prisma
model Document {
  id           BigInt   @id                  // 雪花 ID，应用侧写入
  title        String
  contentId    String   @unique @map("content_id")
  wordCount    Int      @default(0) @map("word_count")
  status       Int      @default(0)          // 或用 enum
  isPublic     Boolean  @default(false) @map("is_public")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  deleted      Boolean  @default(false)

  @@map("kh_document")
}

// Mongo 侧若也用 Prisma（可选）
model DocumentContent {
  id             String  @id @default(auto()) @map("_id") @db.ObjectId
  documentId     String
  content        String  @default("")
  contentLength  Int     @default(0)
  deleted        Boolean @default(false)

  @@index([documentId])
  @@map("document_content")
}
```

要点：

- 单一 `schema.prisma` 声明模型；`prisma generate` 产出类型安全 Client
- 字段映射用 `@map` / `@@map`，不用装饰器
- 关系、索引、唯一约束写在 schema 里，迁移由 `prisma migrate` 管理

---

## 3. 写法对照表

| 维度 | Mongoose `@Schema` | TypeORM `@Entity` | Prisma Schema |
| --- | --- | --- | --- |
| **定义载体** | TS class + 装饰器 | TS class + 装饰器 | `.prisma` DSL |
| **类型来源** | 手写 class / `HydratedDocument` | 手写 class | `generate` 后的 Client 类型 |
| **表/集合名** | `@Schema({ collection })` | `@Entity('name')` | `@@map("name")` |
| **字段声明** | `@Prop({...})` | `@Column({...})` | `field Type @attrs` |
| **主键** | 默认 `_id: ObjectId` | `@PrimaryColumn` / 自增 | `@id` + `@default(...)` |
| **可空** | 不写 `required` 即可选 | `nullable: true` + TS `?` | `Type?` |
| **默认值** | `@Prop({ default })` | `@Column({ default })` | `@default(...)` |
| **索引** | `@Prop({ index })` / `@Index()` | `@Index()` / `unique: true` | `@@index` / `@unique` |
| **时间戳** | `timestamps: true` → `createdAt/updatedAt` | `@CreateDateColumn` / `@UpdateDateColumn` | `@default(now())` / `@updatedAt` |
| **关系** | `ref` + `populate`（引用，非强 FK） | `@ManyToOne` 等 + 真实 FK | `relation` 字段 + `@relation` |
| **迁移** | 通常无强制迁移（schema 宽松） | migration / `synchronize`（慎用） | `prisma migrate` 一等公民 |
| **运行时校验** | Schema 校验（可关） | DB 约束为主 | DB 约束 + Client 类型 |
| **Nest 接入** | `@nestjs/mongoose` + `InjectModel` | `@nestjs/typeorm` + Repository/EM | `@prisma/client` 或 nest-prisma 封装 |

---

## 4. 相同点

1. **都是「持久化映射层」**，不应直接当 HTTP DTO 用。
2. **都要处理命名映射**：应用层 camelCase ↔ 库侧 snake_case / 集合名。
3. **都要处理 ID 策略**：自增、UUID、雪花、ObjectId —— 策略决定类型（`string` / `bigint` / `ObjectId`）。
4. **默认值、唯一、索引** 三家都能表达，只是语法不同。
5. **软删除、审计字段**（`deleted` / `createBy`）都是业务约定，框架不替你定义语义。

---

## 5. 关键差异

### 5.1 数据模型哲学

| | 关系型（TypeORM / Prisma→PG） | 文档型（Mongoose / Prisma→Mongo） |
| --- | --- | --- |
| 结构 | 固定列、强类型 SQL | 文档灵活，嵌套自然 |
| 约束 | FK、CHECK、事务强 | 引用弱一致，事务能力有限 |
| 变更 | 迁移改表成本高 | 加字段成本低，易出现「历史文档缺字段」 |

本项目拆库正是利用差异：**元数据（可筛、可关联）放 PG；大正文放 Mongo**。

### 5.2 Code-first vs Schema-first

- **TypeORM / Mongoose**：改 class → 跑起来（或再写 migration）。类型与运行时模型同一份源码，但容易「类上写了、库里还没有」。
- **Prisma**：改 `.prisma` → `migrate` → `generate`。Client API 与 schema 强一致，但多一步生成；不能像改 class 那样「只改装饰器就完事」。

### 5.3 空值与类型严格度

- Mongoose：`required: true` 是 ODM 校验；关掉校验或直接插库可绕过。
- TypeORM：`nullable` 应对齐 DB；TS `?` 与 DB null 不一致会埋雷。
- Prisma：`String?` 同时驱动类型与（迁移后的）列可空，一致性最好。

### 5.4 大整数 / 特殊类型

- TypeORM：Postgres `bigint` 常用 `transformer` 转成 `string`（本项目 `bigintTransformer`）。
- Prisma：`BigInt` 映射为 JS `bigint`（序列化到 JSON 要额外处理）。
- Mongoose：一般用 `String` 存雪花 ID（本项目 `documentId: string`），避免精度问题。

---

## 6. 注意点（易踩坑）

### Mongoose

1. **`!` 断言**：字段由驱动注入，未在构造函数赋值，需 `prop!: Type`，否则 `strictPropertyInitialization` 报错。
2. **`SchemaFactory.createForClass` 不能忘**：只有 class 没有 Schema，Nest 注入会失败。
3. **`timestamps: true` 与手写 `createdAt`**：不要重复定义两套。
4. **`versionKey: false`**：关掉 `__v`；若自己做乐观锁，用业务 `version` 字段（本项目有）。
5. **索引**：`@Prop({ index: true })` 非 unique；一对一业务键应考虑 `unique: true`。
6. **无强 FK**：`documentId` 不会自动保证 PG 行存在，跨库一致性要业务层保证。

### TypeORM

1. **列名 `name`**：漏写会导致查错列（`contentId` vs `content_id`）。
2. **`synchronize: true`**：开发可临时用，生产禁止；用 migration。
3. **`bigint` + JS Number**：必用 string/transformer，否则雪花 ID 失真。
4. **`nullable` 与 TS 可选**：`summary?: string | null` 要同时表达「没传」和「库里是 null」。
5. **装饰器元数据**：需 `emitDecoratorMetadata` + `reflect-metadata`。
6. **Entity ≠ 表结构真相**：以迁移 SQL 为准，Entity 只是映射。

### Prisma

1. **改 schema 必 generate**：否则类型与运行时 Client 不一致。
2. **`@map` / `@@map`**：漏写会导致列名与现有库对不上（尤其对接已有 `kh_document`）。
3. **Mongo 支持是另一套心智**：`@db.ObjectId`、复合 ID、关系限制与 PG 不同。
4. **迁移与多人协作**：`migrate` 历史要进仓库；避免手改 DB 与 schema 漂移。
5. **JSON 序列化 `BigInt`**：API 层通常转 string。
6. **与 Nest 结合**：PrismaClient 生命周期（单例、`$connect`/`$disconnect`）要管好。

### 三者共用

1. **不要把持久化模型直接当 DTO**（本项目已有 `CreateDocumentDto` 分离）。
2. **默认值写在哪**：应用层、ORM/ODM、DB —— 三处重复易不一致，约定单一真相源。
3. **软删除**：框架不自动过滤；查询必须显式 `deleted = false`（本项目 `findAll`/`findOne` 已做）。
4. **双写场景**（本项目 create）：两套模型无分布式事务，补偿与写序比「装饰器写法」更关键。

---

## 7. 怎么选（简表）

| 场景 | 更合适 |
| --- | --- |
| Nest + Mongo 文档/正文 | **Mongoose `@Schema`** |
| Nest + PG，已有 TypeORM 习惯 / 复杂 Entity 关系 | **TypeORM `@Entity`** |
| 想要迁移与类型强一致、多语言团队共享 schema | **Prisma** |
| 本项目现状：PG 元数据 + Mongo 正文 | **TypeORM Entity + Mongoose Schema**（已落地） |
| 绿场单体、主要 PG | Prisma 或 TypeORM 二选一即可，避免同域双 ORM |

---

## 8. 速查：同一字段三写法

以「文档字数、默认 0、列名 `word_count`」为例：

```ts
// Mongoose（嵌在文档里，无独立列名映射压力）
@Prop({ type: Number, default: 0 })
wordCount!: number
```

```ts
// TypeORM
@Column({ name: 'word_count', type: 'int', default: 0 })
wordCount: number
```

```prisma
// Prisma
wordCount Int @default(0) @map("word_count")
```

以「关联文档 ID + 索引」为例：

```ts
// Mongoose
@Prop({ type: String, required: true, index: true })
documentId!: string
```

```ts
// TypeORM（若在 PG 表）
@Column({ name: 'document_id', type: 'bigint', transformer: bigintTransformer })
@Index()
documentId: string
```

```prisma
documentId String @map("document_id")
@@index([documentId])
```

---

## 9. 小结

| | Mongoose | TypeORM | Prisma |
| --- | --- | --- | --- |
| **像什么** | 给 Mongo 文档画轮廓的 TS 类 | 给 SQL 表画轮廓的 TS 类 | 给数据库画蓝图的 DSL |
| **强项** | 嵌套文档、灵活演进 | 装饰器生态、与 Nest 经典组合 | 类型安全、迁移流程清晰 |
| **弱项** | 跨文档一致性弱 | 大项目 Entity/迁移易臃肿 | 生成步骤、高级 SQL/动态查询有时受限 |
| **本项目用法** | `document_content` | `kh_document` | 未使用（可作对照学习） |

记住一条实践原则：

> **Schema/Entity/Prisma 模型描述「库里有什么」；DTO 描述「接口收发什么」；Service 负责两者之间的转换与一致性。**
