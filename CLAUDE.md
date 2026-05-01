# FileVault — Claude Context

Self-hosted file storage platform (Google Drive / Dropbox replacement). Runs on a single Linux server alongside PhotoVault.

## Repository layout

```
backend/    NestJS API (TypeORM + PostgreSQL)
web/        React + TypeScript + Vite (no Tailwind — pure CSS variables)
worker/     Python RQ worker (thumbnails, text indexing)
ios/        Swift/SwiftUI — Phase 3
android/    Kotlin/Jetpack Compose — Phase 3
desktop/    Rust + Tauri — Phase 3
infra/      Caddy, Postgres init, Prometheus config, Grafana provisioning
```

## Running locally

```bash
cp .env.example .env   # fill in secrets
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

- Web UI: http://localhost:5173
- API:    http://localhost:3001/api
- API docs: http://localhost:3001/api/docs
- MinIO console: http://localhost:9001
- Grafana: http://localhost:3000

## Key architecture decisions

- **No ORM migrations in dev** — TypeORM `synchronize: true` in development, migration files in production.
- **MinIO as blob store** — all file bytes live in MinIO (`filevault-data` bucket); PostgreSQL holds only metadata.
- **Redis Streams for real-time** — WebSocket events are brokered through Redis so multiple backend replicas stay in sync.
- **RQ for background jobs** — thumbnail generation and text indexing are async; the backend enqueues tasks and the Python worker consumes them.
- **Co-tenancy** — same Postgres instance as PhotoVault (different DB), same Redis (prefix `fv:`), same MinIO (different bucket), same Caddy.

## Design system

- Pure CSS custom properties, no Tailwind — see `web/src/index.css` for tokens.
- Dark theme by default; accent colour `#7c6af7`.
- Component CSS lives alongside each component (`*.css` next to `*.tsx`).

## Current phase

Phase 0/1 — Core backend + web MVP. Focus: upload, download, folder tree, versioning, sharing.
Next: Phase 2 polish (previews, drag-and-drop), then Phase 3 (mobile + desktop sync).

## Commands

```bash
# Backend
cd backend && npm run start:dev

# Web
cd web && npm run dev

# Worker
cd worker && python -m app.main

# Run full stack
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Lint all
cd backend && npm run lint
cd web && npm run lint
```
