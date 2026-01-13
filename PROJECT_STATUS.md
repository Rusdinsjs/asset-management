# Project Status Overview

**Last Updated:** 2026-01-12

This document provides a high-level overview of the Asset Management System's current implementation status across all modules.

## 🟢 Core Modules (Stable/Complete)

### 1. Asset Management (`src/api/handlers/asset_handler.rs`)

- **Features:** CRUD operations for Assets.
- **Fields:** Tag ID, Name, Category, Serial Number, Model, Purchase Info, etc.
- **Frontend:** List view with filtering, Create/Edit forms, QR Code generation.

### 2. Category Management (`src/api/handlers/category_handler.rs`)

- **Features:** Hierarchical categorization of assets.
- **Frontend:** Tree/List view, Add/Edit categories.

### 3. Authentication & RBAC (`src/api/handlers/auth_handler.rs`)

- **Auth:** JWT-based authentication.
- **RBAC:** 4-Level Permission System:
  - **L1 (Admin):** Full System Access.
  - **L2 (Manager):** Approvals (High Value), Reports, User Mgmt.
  - **L3 (Supervisor):** Approvals (Standard), Assign WOs.
  - **L4 (Operator):** View Assets, Create Requests/WOs.

### 4. Lifecycle Management (`src/api/handlers/lifecycle_handler.rs`)

- **State Machine:** Comprehensive lifecycle states (`planning` -> `procurement` -> ... -> `disposed`).
- **Approval Workflow:**
  - Transitions like `disposed` or `lost_stolen` trigger approval requests.
  - Integrated with **Unified Approval Center**.
- **History:** Full audit trail of status changes.

## 🟡 Work In Progress / Recently Completed

### 5. Work Order System (`src/api/handlers/work_order_handler.rs`)

- **Status:** **Feature Complete (Backend & Frontend)**
- **Key Features:**
  - **Integration:** Auto-updates Asset Lifecycle (`under_maintenance`, `under_repair`).
  - **Details:** Manage maintenance Tasks (checklist) and Spare Parts.
  - **Costing:** Auto-calculation of Labor + Parts cost.
  - **Smart Actions:** Start/Complete based on assignment.

### 6. Approvals (Unified) (`src/api/handlers/approval_handler.rs`)

- **Features:** Centralized hub for all requests (Lifecycle, Work Orders, etc.).
- **UI:** Filter by type, Approve/Reject actions, History view.

- **Dashboard (`dashboard_handler.rs`):** High-level metrics (Total Assets, Asset Value, Pending Wo, etc.).

## 🟡 Advanced Rental & Client Module (Sharpened)

### 8. Client & Rate Management (`src/api/handlers/client_handler.rs`)
- **Features:** Comprehensive Customer/Mitra database.
- **Rates:** Specialized per-asset or per-category pricing templates.
- **Frontend:** Dedicated Clients dashboard with quick search & contact management.

### 9. Evidence-Based Rental Workflow (`src/api/handlers/timesheet_handler.rs`)
- **Workflow:** 4-Step Validation (Operator HM -> Supervisor Photo Verification -> Client PIC Signature -> Admin Billing).
- **Timesheet Reviewer:** Professional side-by-side view comparing field logs with photo evidence.
- **Automated Billing:**
  - Automated accumulation of operating, standby, and breakdown hours.
  - Transparent calculation breakdown (Min 200 hours implementation).
  - Billable hours audit log integrated into the billing verification UI.

### 10. Mobile Field Sync (`mobile/`)
- **Status:** **Integrated with Field Reporting**
- **Features:**
  - Hour Meter (HM) logging with required Photo Evidence.
  - Offline-first support for remote project sites.
  - Real-time status sync with Web Admin Reviewer.

## ⚪ Remaining Modules
- **Audits (`audit_handler.rs`):** Stock taking and asset verification features.
- **Loans (`loan_handler.rs`):** Employee asset lending management.
- **Reports (`report_handler.rs`):** PDF/Excel export capabilities.

### 8. Mobile App (`mobile/`)

- **Status:** **Feature Complete (Core)**
- **Features:**
  - Authentication (JWT).
  - Dashboard (Active Rentals).
  - Timesheet Input (With Photo Upload).
  - History View.
- **Tech Stack:** Expo, React Native Paper, Zustand, React Query.

## 🛠 Tech Stack

- **Backend:** Rust (Axum, SQLx, Tokio)
- **Database:** PostgreSQL + Redis (Caching)
- **Frontend:** React (Vite, Mantine, React Query)
- **Infrastructure:** Docker Compose

## 🔄 Handoff Notes for Agents

- **Lifecycle & WO Integration:** Logic resides in `WorkOrderService` calling `LifecycleRepository`.
- **Workflow Docs:** Check `.agent/workflows/` for specific flow diagrams.
