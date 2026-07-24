# nest-lab

NestJS monorepo（pnpm workspace），用于集中管理多个 Nest 后端。

## 结构

```text
nest-lab/
├── packages/
│   └── rag-hub-backend-0/
├── docs/
│   └── add-package.md      # 新 package 接入手册
├── package.json
└── pnpm-workspace.yaml
```

## 快速开始

```bash
pnpm install
pnpm --filter rag-hub-backend-0 start:dev
pnpm --filter rag-hub-backend-0 build
pnpm --filter rag-hub-backend-0 docker:up
```

## 文档

- [新 Package 接入手册](./docs/add-package.md)（迁入/新建、catalog、Docker 注意点）
