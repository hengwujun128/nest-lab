# docker/ — nest-lab 公共中间件

全仓只维护这一套共享基础设施（Postgres / Mongo / RustFS 及 GUI）。

```bash
# 在仓库根目录
pnpm infra:up
pnpm infra:ps
pnpm infra:down
```

包专属服务（如 RabbitMQ、ES）写在对应 `packages/<name>/docker-compose.yml`，并加入外部网络 `nest-lab-net`。
