FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./

COPY backend/api/package.json ./backend/api/package.json

COPY packages ./packages

RUN pnpm install --frozen-lockfile

COPY backend/api ./backend/api

WORKDIR /app/backend/api

RUN pnpm exec prisma generate

RUN pnpm run build

EXPOSE 4000

CMD ["node", "dist/index.js"]