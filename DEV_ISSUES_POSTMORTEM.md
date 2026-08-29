# Grocere Monorepo: Development Environment Postmortem & Troubleshooting Guide

This document details the issues encountered while running `pnpm dev` in the `grocere` monorepo, their underlying root causes, step-by-step resolution, and preventive measures.

---

## Executive Summary

When running `pnpm dev`, multiple runtime, build, database, and process management issues prevented the microservices (`api-gateway` and `auth-service`) from launching correctly. The issues spanned:
1. **Prisma ORM v7 & MongoDB Incompatibility**
2. **Missing `swagger-output.json` File Resolution (`ENOENT`)**
3. **Upstash Redis Connection Failure (`ENOTFOUND`)**
4. **PNPM Workspace Type Export Resolution (`PrismaClient` export error)**
5. **Port & Node Debugger Inspector Collisions**

All issues have been resolved, and the project is now stable with `pnpm dev`.

---

## Detailed Breakdown of Issues & Solutions

### 1. Prisma ORM v7 & MongoDB Incompatibility

* **Symptom / Error**:
  ```text
  Error: @prisma/client did not initialize yet.
  PrismaClient was instantiated without any options. A driver adapter is required.
  ```
* **Root Cause**:
  The project was upgraded/configured with Prisma ORM v7 (`7.9.1`). Prisma 7 requires SQL driver adapters and drops built-in support for MongoDB. MongoDB projects on Prisma v6 do not have an upgrade path to Prisma 7.
* **Resolution**:
  1. Downgraded `prisma` CLI and `@prisma/client` to the stable v6 release line (`^6.14.0` / `6.19.3`).
  2. Updated `prisma/schema.prisma`:
     - Set generator provider to `prisma-client-js`.
     - Explicitly defined `url = env("DATABASE_URL")` in `datasource db`.
  3. Removed non-v6 compatible `prisma.config.ts`.
  4. Updated `packages/lib/prisma/index.ts` to import `PrismaClient` directly from `@prisma/client`.
  5. Re-generated client using `npx prisma generate`.

---

### 2. TypeScript PNPM Resolution Error: `Module '"@prisma/client"' has no exported member 'PrismaClient'`

* **Symptom / Error**:
  ```text
  Module '"@prisma/client"' has no exported member 'PrismaClient'. @/packages/lib/prisma/index.ts:L3
  ```
* **Root Cause**:
  In PNPM monorepos, packages are installed into an isolated store (`node_modules/.pnpm`). When `prisma generate` creates engine code and types, they are generated inside `.pnpm/@prisma+client.../node_modules/.prisma`. If `node_modules/.prisma` is missing in the workspace root, TypeScript cannot resolve re-exported types from `@prisma/client`. Additionally, the editor's TypeScript Language Server cached stale declarations.
* **Resolution**:
  1. Created symlink mapping `node_modules/.prisma` to the generated PNPM client directory.
  2. Added `"postinstall": "prisma generate"` to root `package.json` to automate generation on dependency installs.
  3. Re-started/re-loaded TS server (verified zero errors with `npx tsc --noEmit`).

---

### 3. Missing `swagger-output.json` Asset (`ENOENT`)

* **Symptom / Error**:
  ```text
  Error: ENOENT: no such file or directory, open '/Users/.../apps/auth-service/dist/apps/auth-service/src/swagger-output.json'
  ```
* **Root Cause**:
  In `apps/auth-service/src/main.ts`, `swagger-output.json` was loaded using a static `join(__dirname, 'swagger-output.json')`. Depending on execution mode (ts-node vs compiled webpack bundle in `dist/`), `__dirname` pointed to different directory depths. Furthermore, `package.json` asset copy rules did not output the file to all expected dist locations.
* **Resolution**:
  1. Updated asset copy targets in `apps/auth-service/package.json` to include both file path & target output directory.
  2. Implemented resilient fallback file resolution in `apps/auth-service/src/main.ts` using `existsSync` across candidate paths (`__dirname`, `../`, `../../`, etc.).

---

### 4. Redis Host Domain Resolution Failure (`ENOTFOUND`)

* **Symptom / Error**:
  ```text
  Error: getaddrinfo ENOTFOUND https://lasting-rhino-78106.upstash.io
  ```
* **Root Cause**:
  `REDIS_HOST` in `.env` was configured with the protocol scheme included (`https://lasting-rhino-78106.upstash.io`). `ioredis` expects pure domain names without protocol schemes.
* **Resolution**:
  1. Sanitized `REDIS_HOST` in `.env` by removing the `https://` prefix.
  2. Updated `packages/lib/redis/index.ts` to automatically strip `http://` or `https://` prefixes at runtime via regex (`replace(/^https?:\/\//, '')`) and auto-enable TLS (`tls: {}`) for cloud Redis providers (e.g., Upstash).

---

### 5. Port and Inspector Process Collisions

* **Symptom / Error**:
  ```text
  Error: listen EADDRINUSE: address already in use :::8080
  Debugger listening on ws://127.0.0.1:9229/ Address already in use
  ```
* **Root Cause**:
  - Lingering background Node processes were holding port `8080`.
  - Multiple services running simultaneously via Nx serve tried to bind to the default Node inspector port `9229`.
* **Resolution**:
  1. Cleared stale background processes using `kill -9`.
  2. Added `"inspect": false` to serve targets in service `package.json` files to prevent default inspector port contention.
  3. Configured Nx automatic sync (`"sync": { "applyChanges": true }`) in `nx.json`.

---

## File Changes Summary

| File Path | Description of Modification |
| :--- | :--- |
| `prisma/schema.prisma` | Set provider to `prisma-client-js` and added explicit database URL. |
| `packages/lib/prisma/index.ts` | Updated import source to `@prisma/client`. |
| `packages/lib/redis/index.ts` | Added host protocol stripping and TLS support for cloud Redis. |
| `.env` | Stripped `https://` prefix from `REDIS_HOST`. |
| `apps/auth-service/src/main.ts` | Implemented fallback paths for `swagger-output.json`. |
| `apps/auth-service/package.json` | Configured Nx assets to copy `swagger-output.json`. |
| `apps/api-gateway/package.json` | Added `"inspect": false` option to avoid debugger port conflicts. |
| `package.json` | Added `"postinstall": "prisma generate"` script. |
| `nx.json` | Configured auto-application of sync changes. |

---

## Verification & Maintenance

To run the development environment cleanly:

```bash
# 1. Install dependencies and generate Prisma Client automatically
pnpm install

# 2. Start all microservices
pnpm dev
```
