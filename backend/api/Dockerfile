FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

# Copiar archivos raíz del monorepo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./

# Copiar package.json del backend
COPY backend/api/package.json ./backend/api/package.json

# Copiar paquetes compartidos necesarios
COPY packages ./packages

# Instalar dependencias desde la raíz del monorepo
RUN pnpm install --frozen-lockfile

# Copiar el código del backend
COPY backend/api ./backend/api

WORKDIR /app/backend/api

RUN pnpm exec prisma generate

RUN pnpm run build

EXPOSE 4000

CMD ["node", "dist/index.js"]