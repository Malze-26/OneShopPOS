# OneShop – Integrated POS & Tenant Management Platform

**Project Status | License | Version**

Unifying in-store sales and online commerce into one seamless retail experience.

---

## Overview

**OneShop** is a cloud-based, multi-tenant **Progressive Web Application (PWA)** developed as an academic full-stack project. It is designed to help small and medium-scale retailers manage **physical store operations and online sales through a single integrated system**.

Unlike traditional POS systems or standalone e-commerce platforms, OneShop ensures **real-time inventory synchronization**, centralized customer management, and consistent sales tracking across both offline and online channels.

---

## Repository Structure

```
OneShop_POS/
│
├── backend/                         # POS API — Express + TypeScript (port 5000)
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   └── index.ts
│   ├── .env
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                        # POS Frontend — Next.js (port 3000)
│   ├── app/
│   ├── utils/
│   ├── .env.local
│   └── package.json
│
├── oneshop-tenant-factory/          # Super Admin system (separate service)
│   ├── backend/                     # Tenant Factory API — Express + TypeScript (port 6000)
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── middleware/
│   │   │   ├── models/
│   │   │   ├── routes/
│   │   │   └── index.ts
│   │   ├── .env
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── frontend/                    # Tenant Factory Frontend — Next.js (port 3001)
│       ├── app/
│       ├── utils/
│       ├── .env.local
│       └── package.json
│
├── shared-models/
└── README.md
```

---

## Services & Ports

| Service                    | Port | Description                              |
|----------------------------|------|------------------------------------------|
| POS API                    | 5000 | REST API for tenant POS operations       |
| POS Frontend               | 3000 | Cashier / Manager UI                     |
| Tenant Factory API         | 6100 | REST API for super admin tenant mgmt     |
| Tenant Factory Frontend    | 3001 | Super admin dashboard UI                 |

---

## Running the Project

Open **4 separate terminals** and run each command below.

### 1 — POS API
```bash
cd backend
npm run dev
```

### 2 — POS Frontend
```bash
cd frontend
npm run dev
```

### 3 — Tenant Factory API
```bash
cd oneshop-tenant-factory/backend
npm run dev
```

### 4 — Tenant Factory Frontend
```bash
cd oneshop-tenant-factory/frontend
npm run dev
```

> **Quick shortcut** (runs POS backend + frontend together via npm workspaces):
> ```bash
> npm run dev
> ```

---

## Environment Variables

### `backend/.env`
```
PORT=5000
MONGODB_URI=<tenant db connection string>
JWT_SECRET=<secret>
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
```

### `oneshop-tenant-factory/backend/.env`
```
PORT=6000
MONGODB_URI=<OneShop admin db connection string>
JWT_SECRET=<secret>
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3001
```

### `frontend/.env.local`
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### `oneshop-tenant-factory/frontend/.env.local`
```
NEXT_PUBLIC_API_URL=http://localhost:6100/api
```

---

## File Uploads (S3)

Uploads go **browser → S3 directly**, using a short-lived presigned POST. The
file never passes through the API.

```
1. POST /api/uploads/presign  { kind, contentType, extension }
      -> { key, post: { url, fields }, maxBytes }
2. POST <post.url>            multipart form with post.fields + the file
3. POST /api/settings/logo    { key }        (or /auth/profile/avatar, /products/:id/images)
```

**Why not multipart through the API.** The previous flow wrote to `uploads/` on
local disk via multer, which made the API undeployable to any ephemeral
filesystem — `mkdirSync` ran at module load and would throw on a read-only
runtime. It also allowed 10 files x 5MB in one request, well over the 6MB
synchronous payload ceiling on Lambda.

**Tenant isolation.** Every object is stored under `tenants/<tenantDb>/...`, and
the API rejects any key that does not sit under the calling tenant's prefix, so
a tampered key cannot address another store's assets.

**Limits are enforced by S3**, not by the client. The presigned POST carries a
`content-length-range` condition (2MB logos and avatars, 5MB product images) and
an exact `Content-Type` condition — both verified against the live bucket: an
oversized upload returns `400 EntityTooLarge`, and tampering with the
`Content-Type` field returns `403 AccessDenied`.

Note what this does and does not do. S3 does not inspect file *contents*, so a
caller can upload arbitrary bytes under an allowed image type. What it cannot do
is choose how those bytes are served: the stored `Content-Type` is pinned to the
server-approved value, so HTML uploaded as `image/png` is served as `image/png`
and the browser will not execute it. That is what closes the stored-XSS path.
Content types outside the allowlist are rejected at presign time, before S3 is
involved.

### Required configuration

| Variable | Purpose |
|---|---|
| `S3_BUCKET` | Bucket receiving uploads |
| `AWS_REGION` | Bucket region |
| `ASSET_BASE_URL` | CDN base for serving objects; falls back to direct S3 URLs |

Credentials come from the execution role in AWS; only set `AWS_ACCESS_KEY_ID` /
`AWS_SECRET_ACCESS_KEY` for local development.

The bucket needs CORS allowing `POST` from the storefront and POS origins.

### Migrating existing assets

Records written before this change store relative paths (`/uploads/products/...`).
Those files must be copied into the bucket under the owning tenant's prefix and
the stored URLs rewritten, otherwise existing images 404 once `express.static`
is removed. `express.static('/uploads')` is still mounted so nothing breaks on a
container deployment before that migration runs.

---

## Tech Stack

### Frontend
- Next.js (App Router), React 19, TypeScript
- Tailwind CSS v4, Lucide React, Recharts / Chart.js

### Backend
- Express.js, TypeScript, Mongoose
- JWT Authentication, bcryptjs, AWS S3 (presigned uploads)

### Database
- MongoDB Atlas (multi-tenant — one DB per tenant for POS, shared admin DB for tenant factory)

---

## Key Features

### POS & Sales Management
- Product search, cart management, multiple payment methods
- Receipt generation, transaction history, offline support

### Inventory Management
- Product & category CRUD, real-time stock tracking
- Low-stock alerts, bulk CSV import

### Customer Management
- Customer database, order history, customer-to-transaction linking

### Super Admin (Tenant Factory)
- Provision and manage tenant businesses
- Subscription plan management (basic / premium)
- Analytics dashboard with tenant growth metrics
