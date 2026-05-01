FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=optional

# ── Development ───────────────────────────────────────────────────────────
FROM base AS development
RUN npm ci
COPY . .
CMD ["npm", "run", "start:dev"]

# ── Build ────────────────────────────────────────────────────────────────
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

# ── Production ────────────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev --omit=optional && npm cache clean --force

COPY --from=build /app/dist ./dist

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3001
CMD ["node", "dist/main"]
