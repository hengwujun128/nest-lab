# 故障排查

本仓库开发与运行中的常见问题与处理方式。

---

## Elasticsearch：`media_type_header_exception`

### 现象

应用启动或写入向量索引时报错：

```text
ES 索引创建失败：media_type_header_exception
  Caused by:
    status_exception: Accept version must be either version 8 or 7, but found 9.
    Accept=application/vnd.elasticsearch+json; compatible-with=9
  Root causes:
    media_type_header_exception: Invalid media-type value on headers [Accept, Content-Type]
```

### 原因

**`@elastic/elasticsearch` 客户端主版本与 ES 服务端主版本不一致。**

| 组件 | 本项目版本 |
|------|------------|
| ES 服务端（Docker） | **8.17.0**（见 `packages/rag-hub-backend-2/docker-compose.yml`） |
| `@elastic/elasticsearch` 客户端 | 须为 **8.x**（catalog 登记在 `pnpm-workspace.yaml`） |

v9 客户端会在请求头携带 `compatible-with=9`，而 ES 8 只接受 7 或 8，因此连接/建索引失败。

### 处理

1. 确认 `pnpm-workspace.yaml` catalog 中为：

   ```yaml
   '@elastic/elasticsearch': ^8.17.0
   ```

2. 根目录执行 `pnpm install`，重启应用。

3. 启动日志应出现：

   ```text
   VectorIndex ES 已连接：http://localhost:9200, status=...
   ES 索引创建成功：index=kh_chunk, dims=1024
   ```

### 原则

- **客户端主版本 = 服务端主版本**（8 对 8，9 对 9）。
- 升级 ES Docker 镜像时，同步升级 catalog 中的 `@elastic/elasticsearch`。
- IK 分词插件版本须与 ES 镜像主版本一致（见 `packages/rag-hub-backend-2/elasticsearch/Dockerfile`）。

### 相关文件

- `packages/rag-hub-backend-2/src/pipeline/vector-index.service.ts` — ES 客户端初始化与索引创建
- `packages/rag-hub-backend-2/docker-compose.yml` — ES / Kibana 服务定义
- `pnpm-workspace.yaml` — 客户端版本 catalog
