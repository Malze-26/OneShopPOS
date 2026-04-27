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

## Tech Stack

### Frontend
- Next.js (App Router), React 19, TypeScript
- Tailwind CSS v4, Lucide React, Recharts / Chart.js

### Backend
- Express.js, TypeScript, Mongoose
- JWT Authentication, bcryptjs, Multer

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
- Subscription plan management (free / basic / premium / enterprise)
- Analytics dashboard with tenant growth metrics
