# rag-hub-backend-1

```bash
# 公共中间件（仓库根）
pnpm infra:up

# 本包
pnpm --filter rag-hub-backend-1 start:dev
```

`docker:up` / `docker:down` 已代理到根目录 `infra:*`（本包无专属中间件）。
