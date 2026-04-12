# 🏪 OneShop – Integrated POS & E-Commerce Platform

**Project Status | License | Version**

Unifying in-store sales and online commerce into one seamless retail experience.

---

## 📖 Overview

**OneShop** is a cloud-based, multi-tenant **Progressive Web Application (PWA)** developed as an academic full-stack project. It is designed to help small and medium-scale retailers manage **physical store operations and online sales through a single integrated system**.

Unlike traditional POS systems or standalone e-commerce platforms, OneShop ensures **real-time inventory synchronization**, centralized customer management, and consistent sales tracking across both offline and online channels. The system supports uninterrupted sales through offline-first capabilities while maintaining data consistency once connectivity is restored.

---

## 🚀 Key Features

### 🧾 POS & Sales Management

* Product Search & Selection: Fast item lookup optimized for in-store checkout
* Shopping Cart Management: Add, update, remove items with real-time price calculation
* Multiple Payment Methods: Cash
* Receipt Generation & Printing
* Transaction History & Daily Sales Summary
* Offline Transaction Handling with auto-sync

### 📦 Inventory Management

* Product & Category Management (CRUD)
* Real-time Stock Tracking
* Stock Adjustment with reason logging
* Low-Stock Alerts and Monitoring
* Inventory Dashboard with key metrics
* Bulk Product Import via CSV with validation

### 👥 Customer Management

* Customer Database with full CRUD operations
* Advanced Search & Filtering
* Customer Profiles with notes and preferences
* Customer-to-Transaction Linking
* Order History per Customer

### 🌐 E-Commerce Integration

* Online Product Catalog synced with POS
* Unified Inventory for online and in-store sales
* Centralized Order Management

---

## 🏗️ System Architecture

OneShop follows a **Hybrid Architecture** combining **Three-Tier Architecture** with **MVC principles** for core modules such as the Shopping Cart.

### Architecture Overview

* **Presentation Layer**: React.js / Next.js (PWA)
* **Application Layer**: Node.js + Express.js (RESTful APIs)
* **Data Layer**: MongoDB Atlas

### MVC Implementation (Shopping Cart Module)

* Model: MongoDB Schemas
* Controller: Express Controllers
* Service Layer: Business Logic (price calculation, validation)
* View: React Cart UI

**Flow:**
Client → React UI → API Controller → Service → Model → MongoDB

---

## 🛠️ Tech Stack

### Frontend

* React.js / Next.js
* Progressive Web App (PWA)
* Tailwind CSS

### Backend

* Node.js
* Express.js
* RESTful API Architecture
* JWT Authentication

### Database

* MongoDB Atlas
* Mongoose ODM

---

## 📁 Repository Structure

```
oneshop/
│
├── frontend/          # React / Next.js (PWA)
│   ├── pages/
│   ├── components/
│   ├── services/
│
├── backend/           # Express.js (MVC)
│   ├── controllers/
│   ├── services/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│
├── docs/              # Diagrams & Documentation
│   ├── UML/
│   ├── ERD/
│   └── Architecture/
│
└── README.md

