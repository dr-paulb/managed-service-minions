FROM node:22-bookworm-slim AS builder

RUN apt-get update && apt-get install -y python3 make g++ curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.10.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json .npmrc ./
COPY packages/framework-core/package.json ./packages/framework-core/
COPY extensions/mcp-toolshed/package.json ./extensions/mcp-toolshed/
COPY extensions/agent-dashboard/package.json ./extensions/agent-dashboard/

RUN pnpm install --frozen-lockfile

COPY packages/framework-core ./packages/framework-core
COPY extensions/mcp-toolshed ./extensions/mcp-toolshed
COPY extensions/agent-dashboard ./extensions/agent-dashboard

RUN pnpm -r --filter agent-dashboard... build \
    && pnpm --filter agent-dashboard deploy --prod --legacy /prod

FROM node:22-bookworm-slim

WORKDIR /app

RUN mkdir -p /data

COPY --from=builder /prod .

ENV NODE_ENV=production
ENV SQLITE_PATH=/data/dashboard.db

VOLUME ["/data"]

CMD ["node", "dist/index.js"]
