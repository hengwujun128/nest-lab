# 新 Package 接入手册

本仓库是 **pnpm monorepo**。每个 Nest 应用（或可独立运行的后端）作为 `packages/<name>` 下的一个 package。

## 命名约定

| 层级 | 示例 | 说明 |
|------|------|------|
| 目录名 | `packages/rag-hub-backend-0` | 与 package 名一致 |
| `package.json` → `name` | `rag-hub-backend-0` | 供 `pnpm --filter` 使用 |
| Docker `container_name` | `knowledge_hub_postgres` | **可与 package 名不同**；按业务/产品命名即可 |
| Compose 项目名 | 默认取目录名 | 见下文「Docker」 |

建议：

- 包名用 **kebab-case**，且全局唯一（例如 `rag-hub-backend-0`、`typeorm-pg-crud`）。
- 同一产品的迭代/实验可用后缀：`-0`、`-v2`、`-experiment`。
- **不必**把 Docker 容器改成与 package 同名；容器名稳定更重要（已有数据卷、脚本依赖时尤其如此）。

## 快速接入（已有 Nest 项目迁入）

1. 把整个应用目录放到 monorepo：

```bash
# 在 nest-lab 根目录
mkdir -p packages
mv /path/to/your-app packages/your-app-name
```

2. 确认 `packages/your-app-name/package.json` 的 `name` 与目录名一致，例如 `"name": "your-app-name"`。

3. （推荐）依赖版本改用根目录 catalog，避免各包 Nest 大版本漂移：

```json
{
  "dependencies": {
    "@nestjs/common": "catalog:",
    "@nestjs/core": "catalog:"
  },
  "devDependencies": {
    "@nestjs/cli": "catalog:",
    "typescript": "catalog:"
  }
}
```

若 catalog 里还没有该依赖，在根目录 `pnpm-workspace.yaml` 的 `catalog:` 中补上一行版本。

4. 根目录安装并验证：

```bash
pnpm install
pnpm --filter your-app-name build
pnpm --filter your-app-name start:dev
```

5. （可选）在根 `package.json` 的 scripts 里无需改动；统一用 `--filter` 操作单个包即可。

## 从零新建 Nest package

```bash
cd /Users/martin/Documents/AI/nest-lab
pnpm dlx @nestjs/cli new packages/my-new-app --package-manager pnpm --skip-git
# 或手动 nest new 后再移入 packages/
```

然后：

1. 把生成目录放到 `packages/my-new-app`（若 CLI 生成位置不对）。
2. 改 `package.json` 的 `name` 为 `my-new-app`。
3. 常用依赖改为 `catalog:`，缺的补进 `pnpm-workspace.yaml`。
4. `pnpm install` → `pnpm --filter my-new-app start:dev`。

## 目录结构约定

```text
nest-lab/
├── package.json                 # 根：聚合脚本、共享 prettier 等
├── pnpm-workspace.yaml          # packages/* + catalog
├── docs/                        # 仓库级文档
└── packages/
    └── <package-name>/
        ├── package.json
        ├── nest-cli.json
        ├── src/
        ├── test/
        ├── docker-compose.yml   # 可选：仅本包基础设施
        ├── init-scripts/        # 可选
        └── volumes/             # 本地数据，已 gitignore，勿提交
```

原则：

- **一个 Nest 应用 = 一个 package**，各自保留 `nest-cli.json` / `tsconfig` / `dist`。
- 跨包复用代码成熟后再抽 `packages/shared-*`，不要一开始强拆。
- `volumes/`、`.env` 留在**本包**内，不要放到 monorepo 根（除非明确要做「全仓共享一套 DB」）。

## Docker Compose（不会因改 package 名而坏）

### 结论

把应用从 `rag-hub-backend` 改成 package `rag-hub-backend-0`，**不会自动改掉 Docker**。Compose 只认：

- 本包内的 `docker-compose.yml`
- 相对路径（`./volumes`、`./init-scripts`）
- `container_name` / 端口 / 网络名

当前 `rag-hub-backend-0` 仍使用：

- 容器：`knowledge_hub_postgres`、`knowledge_hub_mongodb` 等
- 卷目录：`packages/rag-hub-backend-0/volumes/`
- 网络：`common-network`

因此：**包名用 `rag-hub-backend-0` 即可；Docker 侧继续叫 `knowledge_hub_*` 完全没问题。**

### 正确启动方式

必须在**包目录**起 Compose（脚本已封装）：

```bash
# 推荐（cwd 会落在该 package）
pnpm --filter rag-hub-backend-0 docker:up
pnpm --filter rag-hub-backend-0 docker:down

# 或手动
cd packages/rag-hub-backend-0
docker compose up -d
```

不要在 monorepo 根目录直接 `docker compose up`（根下没有这份 compose，路径也会错）。

### 多 package 同时跑 Docker 时注意

| 冲突点 | 处理 |
|--------|------|
| 宿主机端口（如 `5432`、`27017`） | 第二个包改成 `5433:5432` 等 |
| `container_name` 全局唯一 | 新包用不同前缀，如 `other_app_postgres` |
| `networks.default.name: common-network` | 若要隔离，删掉固定 name 或改成各自网络名 |
| 数据卷 | 各自放在自己的 `volumes/`，不要共用 |

### 要不要把容器改成 `rag-hub-backend-0_*`？

**一般不需要。**

- 已有 `volumes/` 和习惯用的 `knowledge_hub_*` 名称时，改容器名等于换身份，容易让人以为是新环境。
- 若追求「包名 = 资源前缀」统一，可以改，但属于可选清理，与 monorepo 迁移无关。

## 常用命令速查

```bash
# 根目录
pnpm install
pnpm build                                          # 构建全部有 build 脚本的包
pnpm --filter <name> start:dev
pnpm --filter <name> build
pnpm --filter <name> test
pnpm --filter <name> docker:up

# 同时对多个包
pnpm --filter "rag-hub-*" build
```

## Checklist（新包合并前）

- [ ] 位于 `packages/<name>/`，且 `package.json#name` 一致
- [ ] 已 `pnpm install`，`pnpm --filter <name> build` 通过
- [ ] Nest 相关依赖尽量使用 `catalog:`
- [ ] 若有 Compose：端口 / `container_name` / 网络不与其它包冲突
- [ ] `volumes/`、`.env` 已在 `.gitignore` 覆盖范围内
- [ ] 包内 README 写明 `filter` 启动命令
