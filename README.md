# nest-lab

NestJS monorepo（pnpm workspace），用于集中管理多个 Nest 后端实验/迭代包。

## 结构

```text
nest-lab/
├── docker/                      # 公共中间件（全仓唯一一套）
│   ├── docker-compose.yml       # Postgres / Mongo / RustFS / GUI
│   ├── init-scripts/
│   └── volumes/                 # 本地数据（gitignore，勿提交）
├── packages/
│   ├── rag-hub-backend-0/
│   ├── rag-hub-backend-1/
│   └── rag-hub-backend-2/       # 可另含本包专属 compose（RMQ / ES / Kibana）
├── docs/
│   └── add-package.md
├── package.json
└── pnpm-workspace.yaml
```

## 中间件怎么用（重要）

本机 **只跑一套公共中间件**，避免多 package 抢端口 / `container_name`。

| 层级 | 位置 | 内容 | 命令 |
|------|------|------|------|
| 公共 | `docker/` | Postgres、Mongo、RustFS、pgAdmin、mongo-express | `pnpm infra:up` |
| 包专属 | `packages/<name>/docker-compose.yml` | 仅该包需要的服务（如 ES、RabbitMQ） | `pnpm --filter <name> docker:up` |

应用一律通过 **localhost + 端口** 连接（见各包 `.env.example`），不要写容器名当 host。

### 日常流程

```bash
# 1. 安装依赖
pnpm install

# 2. 启动公共中间件（仓库根目录，只做一次）
pnpm infra:up
pnpm infra:ps

# 3. 若某个包有专属服务（例如 backend-2 的 RabbitMQ / ES）
pnpm --filter rag-hub-backend-2 docker:up

# 4. 启动应用（可并行；注意应用 PORT 不要冲突）
pnpm --filter rag-hub-backend-1 start:dev
pnpm --filter rag-hub-backend-2 start:dev   # 建议 .env 里 PORT=3001
```

停止：

```bash
pnpm --filter rag-hub-backend-2 docker:down   # 只停该包专属
pnpm infra:down                               # 停公共栈
```

### 公共栈端口与账号

| 服务 | 端口 | 说明 |
|------|------|------|
| Postgres | `5432` | user / 123456，库 `knowledge_hub` |
| pgAdmin | `8088` | admin@admin.com / admin |
| MongoDB | `27017` | mongo_user / mongo_pass123 |
| mongo-express | `8081` | me_admin / me_123456 |
| RustFS S3 | `9000` | rustfsadmin / rustfsadmin |
| RustFS Console | `9001` | 同上 |

backend-2 专属（需先 `infra:up`，网络 `nest-lab-net`）：

| 服务 | 端口 |
|------|------|
| RabbitMQ AMQP | `5672` |
| RabbitMQ 管理台 | `15672`（guest / guest） |
| Elasticsearch | `9200` |
| Kibana | `5601` |

容器名前缀统一为 `nest-lab-*`，公共网络 `nest-lab-net`。  
Compose 项目名：公共栈 `nest-lab`（`docker/docker-compose.yml` 的 `name`），backend-2 专属为包名 `rag-hub-backend-2`。

若 `infra:up` / `docker:up` 报端口占用，先查本机是否已有无关容器（如旧的 `es-dev`、`rabbitmq`）占用了 `5432` / `5672` / `9200` 等。

### 新 package 要不要写 compose？

- **只用 PG/Mongo/RustFS**：不要复制公共 compose；文档写明依赖 `pnpm infra:up` 即可。`docker:up` 可代理到根脚本（见 backend-0/1）。
- **有额外中间件**：在本包新增 `docker-compose.yml`，只声明专属服务，并：

```yaml
networks:
  default:
    name: nest-lab-net
    external: true
```

## 应用命令

```bash
pnpm --filter rag-hub-backend-0 start:dev
pnpm --filter rag-hub-backend-1 start:dev
pnpm --filter rag-hub-backend-2 start:dev

pnpm --filter <name> build
pnpm --filter <name> test
```

## 从旧 knowledge_hub_* 迁移说明

旧版各 package 内曾自带 `docker-compose.yml` / `volumes/` / `init-scripts/`，已收敛到 `docker/`。

若本机仍残留旧容器，可清理后改用新栈：

```bash
docker rm -f knowledge_hub_postgres knowledge_hub_postgres_1 \
  knowledge_hub_mongodb knowledge_hub_mongodb_1 \
  knowledge_hub_rustfs knowledge_hub_rabbitmq \
  knowledge_hub_elasticsearch knowledge_hub_kibana \
  knowledge_hub_pgadmin knowledge_hub_pgadmin_1 \
  knowledge_hub_mongo_express knowledge_hub_mongo_express_1 2>/dev/null

pnpm infra:up
```

数据目录改为 `docker/volumes/`（新库会按 `init-scripts` 初始化）。旧的 `packages/*/volumes` 已移除；若你本地还有备份副本，可自行决定是否迁入。

## 文档

- [新 Package 接入手册](./docs/add-package.md)
- [公共 Docker 说明](./docker/README.md)
