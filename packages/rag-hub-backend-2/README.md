# rag-hub-backend-2

在 backend-1 能力之上增加 RabbitMQ / Elasticsearch（IK）等异步 RAG 相关依赖。

```bash
# 1) 一条命令启动全部中间件（公共 nest-lab + 本包 rag-hub-backend-2）
pnpm --filter rag-hub-backend-2 docker:up

# 2) 应用（建议 PORT 与其它包错开，见 .env.example）
pnpm --filter rag-hub-backend-2 start:dev
```

停止本包专属服务（保留 Postgres/Mongo 等公共栈）：

```bash
pnpm --filter rag-hub-backend-2 docker:down
```

连同公共栈一起停止：

```bash
pnpm --filter rag-hub-backend-2 docker:down:all
```

环境变量模板：`.env.example`。

共享文档见仓库根 [docs/](../../docs/)（建模方法论、故障排查等）。
