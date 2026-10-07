# Inventory & Sales Management System

A production-ready, single-tenant Inventory & Point-of-Sale (POS) system built with **Next.js 14 App Router**, **TypeScript**, **PostgreSQL**, **Drizzle ORM**, **Tailwind CSS**, and **shadcn/ui**, powered by **Bun**.

---

## Key Features

1. **Product & Stock Management**:
   - Product catalog with categories, units of measure, SKU generation, and barcode support.
   - **Immutable stock movement ledger**: Stock quantity is never directly mutated without an atomic ledger entry (`opening`, `purchase`, `sale`, `adjustment`, `void_return`).
   - Row-level locking (`SELECT ... FOR UPDATE`) prevents concurrent overselling.
   - Low stock threshold alerts and filtering.

2. **Point of Sale (POS) Counter**:
   - High-speed product search and barcoding interface with numeric pad and cart management.
   - Line-item and order-level discount support.
   - Strict server-side total and tax calculation with minor-unit integer arithmetic to prevent floating-point rounding errors.
   - **Flexible Payment Modes**: Full Payment, Partial Payment (Debt), and Full Credit.
   - Sequential, gap-free invoice numbers (`INV-000001`) backed by a PostgreSQL sequence.
   - Printable receipt modal formatted for 80mm thermal receipts and standard A4 invoices.

3. **Debt Tracking & Repayment**:
   - Outstanding customer receivables with overdue detection.
   - **FIFO Debt Repayment**: Automatic allocation of payments across the customer's oldest unpaid sales.
   - **Immutable Payment Reversals**: Reverses allocations and restores unpaid balances with mandatory audit justification.
   - Customer credit limits and chronological balance statements.

4. **Role-Based Access Control (RBAC)**:
   - 6 standard roles: `Owner`, `Admin`, `Manager`, `Cashier`, `Storekeeper`, `Viewer`.
   - 17 granular permission keys checked server-side via `can(user, permission)`.
   - Immediate session revocation when a user account is deactivated or modified.
   - Guardrails: The last active Owner cannot be demoted or deleted; Admins cannot alter Owners.

5. **Business Intelligence & Reporting**:
   - **Bento Grid Dashboard**: Real-time sales summary, cash collected, outstanding receivables, low-stock alerts, and daily sales trend chart via Recharts.
   - Daily profit and gross margin analysis (restricted to authorized roles).
   - Inventory asset valuation (at cost and at retail).
   - Aged receivables report (0-30, 31-60, 61-90, 90+ days).

6. **Forensic Audit Logging & CSV Export**:
   - Complete audit trail of all financial, stock, user, and catalog actions.
   - CSV export for products, sales, debts, and stock ledger movements.

---

## Tech Stack

- **Runtime & Package Manager**: [Bun](https://bun.sh)
- **Framework**: Next.js 14 (App Router, Server Actions)
- **Language**: TypeScript (strict mode, ES2022)
- **Database**: PostgreSQL with `citext` and `uuid-ossp` extensions
- **ORM**: Drizzle ORM + `postgres` driver
- **Styling**: Tailwind CSS, CSS variables, `next-themes` (Dark / Light mode)
- **Components**: shadcn/ui + Radix UI primitives + Lucide Icons
- **Forms & Validation**: Zod + React Hook Form
- **Charts**: Recharts
- **Containerization**: Docker & Docker Compose (`oven/bun` image)

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.2+
- [PostgreSQL](https://www.postgresql.org) v14+ (or Docker)

### 1. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Ensure `DATABASE_URL` and `SESSION_SECRET` are configured:

```env
DATABASE_URL="postgres://inventory:inventory_secret@localhost:5432/inventory"
SESSION_SECRET="your-super-secret-random-key-at-least-32-chars-long"
PORT=3000
```

### 2. Database Setup

Push the database schema and run the seed script:

```bash
# Push schema tables and indexes to PostgreSQL
bun run db:push

# Run seed script (creates sequence, default roles, permissions, units, and walk-in customer)
bun run db:seed
```

### 3. Running Locally

```bash
# Start development server
bun run dev

# Or build and run production server
bun run build
bun run start
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

- If the application has not been configured yet, you will be directed to the 4-step Onboarding Wizard at `/onboarding`.
- Complete the onboarding to establish your Company profile and create the initial Owner account.

---

## Running with Docker Compose

To run the complete stack (PostgreSQL + Next.js web application) via Docker:

```bash
docker compose up --build
```

The database service will initialize health checks, run migrations/seed on startup, and expose the app at [http://localhost:3000](http://localhost:3000).

---

## Scripts Reference

| Command | Description |
| :--- | :--- |
| `bun run dev` | Starts Next.js development server |
| `bun run build` | Compiles optimized Next.js production build and typechecks |
| `bun run start` | Runs production server |
| `bun run db:push` | Pushes Drizzle ORM schema directly to PostgreSQL |
| `bun run db:generate` | Generates SQL migrations |
| `bun run db:migrate` | Runs database migrations |
| `bun run db:seed` | Seeds default roles, permissions, units, and walk-in customer |
| `bunx tsc --noEmit` | Runs TypeScript typechecker across the codebase |
