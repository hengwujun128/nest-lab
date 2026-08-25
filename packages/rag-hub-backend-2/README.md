# rag-hub-backend-2

在 backend-1 能力之上增加 RabbitMQ / Elasticsearch（IK）等异步 RAG 相关依赖。

```bash
# 1) 公共中间件
pnpm infra:up

# 2) 本包专属：RabbitMQ + ES + Kibana
pnpm --filter rag-hub-backend-2 docker:up

# 3) 应用（建议 PORT 与其它包错开，见 .env.example）
pnpm --filter rag-hub-backend-2 start:dev
```

环境变量模板：`.env.example`。
