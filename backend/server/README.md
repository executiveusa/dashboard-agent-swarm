# Multi-Agent Data Service

This service replaces the Supabase dependency with a self-hosted Postgres + SSE API that exposes
recent task and log activity to every UI surface. The service is designed for deployment on Coolify
or any container platform.

## Features

- REST endpoints for fetching the latest tasks and logs.
- Server-Sent Events (SSE) streams backed by Postgres `LISTEN/NOTIFY` for realtime dashboards.
- Lightweight Express runtime with configurable CORS and heartbeat support.
- SQL migrations that recreate the original Supabase schema plus triggers for realtime events.

## Getting started

```bash
cd backend/server
cp .env.example .env
npm install
npm run dev
```

The development server defaults to `http://localhost:8787`. Configure a Postgres instance and set
`DATABASE_URL` in the `.env` file before running.

## Environment variables

| name | description |
| --- | --- |
| `DATABASE_URL` | Connection string for Postgres (required). |
| `PORT` | HTTP port, defaults to `8787`. |
| `CORS_ORIGIN` | Comma-separated list of allowed origins. |
| `SSE_HEARTBEAT_INTERVAL_MS` | Interval for SSE keepalive messages (default 25000). |

## Migrations

Migrations are located in `migrations/`. Apply them with any Postgres migration tool (e.g. `psql` or
`atlas`). The `0001_init.sql` migration creates the schema and realtime triggers required for the
SSE feeds.
