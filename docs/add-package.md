# 新 Package 接入手册

本仓库是 **pnpm monorepo**。每个 Nest 应用作为 `packages/<name>` 下的一个 package。

## 命名约定

| 层级 | 示例 | 说明 |
|------|------|------|
| 目录名 | `packages/rag-hub-backend-2` | 与 package 名一致 |
| `package.json` → `name` | `rag-hub-backend-2` | 供 `pnpm --filter` 使用 |
| 公共容器 | `nest-lab-postgres` 等 | 定义在仓库根 `docker/`，全仓共享 |
| 包专属容器 | `nest-lab-elasticsearch` 等 | 仅写在该包 compose，且勿与公共栈撞名/撞端口 |

## 快速接入（已有 Nest 项目迁入）

1. 把应用放到 `packages/<name>/`，`package.json#name` 与目录名一致。
2. 依赖尽量用根目录 `catalog:`（见 `pnpm-workspace.yaml`）。
3. `pnpm install` → `pnpm --filter <name> build`。
4. **不要**再复制一份 Postgres/Mongo compose；公共中间件用根目录：

```bash
pnpm infra:up
```

5. 若本包需要额外中间件，只新增本包 `docker-compose.yml`（见下）。

## 从零新建 Nest package

```bash
pnpm dlx @nestjs/cli new packages/my-new-app --package-manager pnpm --skip-git
```

然后改 `name`、接 `catalog:`、验证 `start:dev`。

## 安装依赖并写入 catalog

在**包目录**里安装，并让版本登记到根目录 `pnpm-workspace.yaml` 的 `catalog:`，本包 `package.json` 写成 `"catalog:"`：

```bash
pnpm add <pkg> --save-catalog          # 运行时依赖
pnpm add -D <pkg> --save-catalog       # 开发依赖
```

在仓库根目录执行时必须指定包，否则依赖会写进根 `package.json`，不会共享：

```bash
pnpm --filter <name> add <pkg> --save-catalog
```

catalog 里已经有这个包时，同一条命令会复用已有版本，不会再写一条。

## 目录结构约定

```text
nest-lab/
├── docker/                      # 公共中间件（唯一）
│   ├── docker-compose.yml
│   ├── init-scripts/
│   └── volumes/
├── package.json                 # 含 infra:up / infra:down
├── docs/                        # 全仓共享文档
└── packages/
    └── <package-name>/
        ├── package.json
        ├── nest-cli.json
        ├── src/
        ├── docker-compose.yml   # 可选：仅本包专属服务
        └── .env.example         # localhost 连接公共栈
```

原则：

- 一个 Nest 应用 = 一个 package。
- **公共 DB / 对象存储只在 `docker/`**；包内禁止再起同端口的 PG/Mongo/RustFS。
- **文档放在仓库根 `docs/`**，勿在各 package 内复制；见 [README 文档索引](../README.md#文档)。
- 跨包复用代码成熟后再抽 `packages/shared-*`。

## Docker：公共 + 包专属

### 公共栈

```bash
pnpm infra:up
pnpm infra:ps
pnpm infra:down
```

网络名：`nest-lab-net`。应用连接 `localhost:<port>`。

仅依赖公共栈的包，可将脚本代理到根目录（参考 `rag-hub-backend-1`）：

```json
"docker:up": "pnpm --dir ../.. run infra:up",
"docker:down": "pnpm --dir ../.. run infra:down"
```

### 包专属栈

仅声明**本包多出来的服务**，并挂外部网络：

```yaml
services:
  my-extra:
    image: example:latest
    container_name: nest-lab-my-extra
    ports:
      - '9999:9999'

networks:
  default:
    name: nest-lab-net
    external: true
```

启动顺序：先 `pnpm infra:up`，再 `pnpm --filter <name> docker:up`。

### 冲突检查清单

| 冲突点 | 处理 |
|--------|------|
| 宿主机端口 | 全仓端口表见根 [README](../README.md)，新服务另选端口 |
| `container_name` | 使用 `nest-lab-` 前缀且全局唯一 |
| 网络 | 专属 compose 使用 `external: nest-lab-net` |
| 数据卷 | 公共数据在 `docker/volumes`；包专属数据在本包 `volumes/`（已 gitignore） |

## 常用命令

```bash
pnpm install
pnpm infra:up
pnpm --filter <name> start:dev
pnpm --filter <name> build
pnpm --filter <name> docker:up    # 有专属 compose 时
```

## Checklist（新包合并前）

- [ ] `packages/<name>/` 与 `package.json#name` 一致
- [ ] `pnpm --filter <name> build` 通过
- [ ] Nest 相关依赖尽量 `catalog:`
- [ ] 未复制公共 PG/Mongo/RustFS compose
- [ ] 若有专属 compose：端口 / 容器名不冲突，且 `nest-lab-net` 为 external
- [ ] `.env.example` 使用 localhost
- [ ] 包内 README 写明 `infra:up` + `filter` 启动命令
