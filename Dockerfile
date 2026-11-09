FROM node:24-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

# Prisma and tsx are also needed by Railway's migration/seed pre-deploy step.
RUN npm ci

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/server apps/server
COPY apps/web apps/web

# Prisma loads its config while generating; building never connects to this URL.
RUN DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build npm run build

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

USER node
# Also initialize the database when the platform's pre-deploy hook is not applied.
# exec keeps Node as PID 1 so it receives shutdown signals directly.
CMD ["sh", "-c", "npm run db:deploy && npm run db:seed && exec node apps/server/dist/index.js"]
