# Inventory & Sales System: Build Specification

> Instructions for the AI agent: build exactly what is described here. Where something is ambiguous, choose the simplest option that keeps data correct. Do not add features that are not listed. Correctness of stock and money is more important than visual polish.

---

## 1. Product Summary

A simple, reliable web application for a small or medium business to:

1. Manage products and stock levels.
2. Record sales, either **fully paid** or **on debt (credit)**, and correctly track what customers still owe.
3. Record debt repayments over time.
4. Manage staff users with clear roles and permissions.

Single company per installation (one deployment = one company). No multi-tenancy.

---

## 2. Tech Stack (required)

| Layer | Choice |
|---|---|
| Framework | **Next.js (latest stable, App Router)** with **TypeScript**, full-stack in one app |
| Database | **PostgreSQL** |
| ORM / migrations | **Drizzle ORM** + drizzle-kit migrations (Prisma is acceptable if preferred) |
| UI | **shadcn/ui** + **Tailwind CSS** + lucide-react icons |
| Forms and validation | React Hook Form + **Zod** (the same Zod schemas validate client and server) |
| Tables | TanStack Table (via the shadcn Data Table pattern) |
| Charts | Recharts (via shadcn Chart components) |
| Auth | **Better Auth** or **Auth.js** with email + password (credentials), secure HTTP-only cookie sessions, passwords hashed with argon2 or bcrypt |
| Server logic | Next.js Server Actions and Route Handlers; all business logic lives in a `services/` layer, not in components |
| File storage (logo) | Local disk in `/uploads` by default, abstracted behind a storage interface so S3-compatible storage can be added later |
| Deployment | Docker + `docker-compose.yml` (app + postgres). Config via `.env` |
| Tooling | ESLint, Prettier, **`bun`** as package manager and script runner (`bun install`, `bun run dev`, `bun run db:migrate`, `bun run db:seed`). Commit `bun.lock`; do not use npm, pnpm, or yarn. In Docker, use the official `oven/bun` image for install/build steps. |

### Environment variables
```
DATABASE_URL=postgres://user:pass@localhost:5432/inventory
AUTH_SECRET=change-me
APP_URL=http://localhost:3000
```

---

## 3. Design System

Use a **blend of these styles**:

- **Base: Clean SaaS / Flat.** Light surfaces, subtle 1px borders, light shadows, one accent color, shadcn default components. Dark mode supported via shadcn theme toggle.
- **Dashboard: Bento grid.** The home dashboard uses modular rounded cards of mixed sizes, each showing one metric or chart.
- **Numbers and finance: Neutral Utility.** Tabular numerals (`font-variant-numeric: tabular-nums`), right-aligned money columns, clear status colors.
- **Productivity: Linear-style touches.** Command palette (`Cmd/Ctrl + K`) for quick navigation and "New sale" / "New product" actions, keyboard-friendly forms.

### Design tokens
- Font: **Inter** (UI), **JetBrains Mono** optional for SKUs/invoice numbers.
- Radius: `0.5rem` base (shadcn `--radius`), cards `1rem`.
- Accent: configurable primary color (default indigo or blue). Onboarding may let the admin pick from 6 preset accent colors.
- Status colors (use consistently everywhere):
  - Paid: green
  - Partial: amber
  - Unpaid / Credit: red
  - Voided: gray with strikethrough
  - Low stock: amber; Out of stock: red
- Layout: left sidebar (collapsible) + top bar (search, theme toggle, user menu). Company logo and name shown at the top of the sidebar.
- Fully responsive. The **New Sale** screen must work well on tablet and phone.
- Empty states, loading skeletons, and toast feedback (sonner) on all actions.
- Accessibility: keyboard navigable, visible focus rings, sufficient contrast.

### shadcn/ui components to install
`button, input, label, textarea, select, combobox/command, dialog, alert-dialog, sheet, dropdown-menu, table, data-table, form, card, badge, tabs, tooltip, popover, calendar, date-picker, checkbox, switch, avatar, separator, skeleton, sonner, sidebar, chart, breadcrumb, pagination`

---

## 4. Onboarding (first-run setup)

On first launch, if no company exists in the database, **every route redirects to `/onboarding`**. Once completed, `/onboarding` is permanently disabled (returns 404 or redirects to login).

A multi-step wizard with a progress indicator:

**Step 1: Company**
- Company name (required)
- Logo upload (optional; PNG/JPG/SVG/WebP, max 2 MB, preview shown)
- Currency (required; searchable list of ISO 4217 codes, e.g. USD, EUR, ETB)
- Phone, email, address (optional)
- Invoice prefix (default `INV`)

**Step 2: Admin account**
- Full name, email, password (min 8 chars, strength meter), confirm password
- This user is created with the **Owner** role.

**Step 3: Preferences**
- Allow selling with insufficient stock? (default: **No**)
- Low-stock default threshold (default: 5)
- Allow credit sales? (default: **Yes**)
- Tax: enable? If yes, a default tax rate % (default: disabled)

**Step 4: Review and finish.** Create the company, Owner user, default roles and permissions, default units (pcs, kg, box, litre, meter), and a default category "General". Sign the Owner in and redirect to the dashboard.

All of step 4 runs in **one database transaction**.

---

## 5. Roles and Permissions

Roles are seeded by the system. Store them in the database so permissions can be adjusted later; the permission check is a single helper `can(user, permission)` used by both UI and server. **Never rely on UI hiding alone; always enforce on the server.**

### Default roles

| Role | Purpose |
|---|---|
| **Owner** | Full control. Exactly one or more owners; the last Owner cannot be deleted or demoted. Can manage company settings and all users. |
| **Admin** | Everything except transferring ownership and deleting the company. Manages users except Owners. |
| **Manager** | Runs daily operations: products, stock, sales, customers, debts, reports. Cannot manage users or settings. |
| **Cashier / Sales** | Creates sales, records debt payments, views products and customers. Cannot edit products, prices, or stock. Cannot void sales. |
| **Storekeeper** | Manages products and stock (receive, adjust). Cannot see profit or customer debts. Cannot create sales. |
| **Viewer / Accountant** | Read-only access to products, sales, debts, and reports. |

### Permission matrix

| Permission | Owner | Admin | Manager | Cashier | Storekeeper | Viewer |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| company.manage (settings, logo) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| users.manage (invite, edit, disable, change role) | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ |
| products.view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| products.manage (create, edit, archive) | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| products.view_cost (cost price) | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| stock.adjust / stock.receive | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| sales.create | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| sales.view | ✅ | ✅ | ✅ | ✅ (own only) | ❌ | ✅ |
| sales.void | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| sales.discount (apply discounts) | ✅ | ✅ | ✅ | ✅ (up to configurable max %) | ❌ | ❌ |
| customers.manage | ✅ | ✅ | ✅ | ✅ (create/edit) | ❌ | ❌ |
| customers.view | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| payments.record (debt repayments) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| debts.view | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| reports.view (incl. profit) | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| audit.view | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

\* Admin cannot create, edit, or delete Owners and cannot promote anyone to Owner.

---

## 6. User Management

Page: `/settings/users` (requires `users.manage`).

- Table: name, email, role, status (Active / Disabled / Invited), last login, actions.
- **Add user:** Admin enters name, email, role, and either sets a temporary password or sends an invite link (token valid 72 hours; the user sets their own password). If no email provider is configured, show the invite link in the UI for the admin to copy.
- **Edit user:** name, role. Cannot edit your own role.
- **Disable / enable user:** disabled users cannot log in and their sessions are revoked immediately. Users are **never hard-deleted** if they have sales or movements (soft-disable instead).
- **Reset password:** admin generates a reset link or temporary password; the user is forced to change it at next login.
- **Guardrails:** the last active Owner cannot be disabled, deleted, or demoted. A user cannot disable themselves.
- **Profile page** (`/profile`) for every user: change name, change password, view own role.
- Login page, logout, session expiry (e.g. 7 days sliding), basic login rate limiting.
- All user changes are written to the audit log.

---

## 7. Core Features

### 7.1 Products
Fields:
- `name` (required), `sku` (unique, auto-generated if blank), `barcode` (optional, unique)
- `category`, `unit`
- `cost_price`, `selling_price`
- `stock_qty` (read-only in the UI; changed only via stock movements)
- `low_stock_threshold` (falls back to company default)
- `image` (optional), `description` (optional)
- `is_active` (archive instead of delete)

Screens:
- Product list: search (name/SKU/barcode), filter by category and stock status (in stock, low, out), sort, pagination, CSV export.
- Create / edit in a sheet or dialog.
- Product detail: info, current stock, and **stock movement history** table.
- Initial stock when creating a product creates an `opening` stock movement.
- A product with any sales history cannot be deleted, only archived.
- Categories and units: simple CRUD under `/settings/catalog`.

### 7.2 Stock movements (the stock ledger)
Every change to stock is a row in `stock_movements`. **`products.stock_qty` is only updated inside the same transaction that inserts a movement.**

Movement types: `opening`, `purchase` (receive stock), `sale`, `sale_void` (return from voided sale), `adjustment_in`, `adjustment_out`, `return`.

- **Receive stock** screen: pick product(s), quantity, optional new cost price, supplier/note. Optional: updates the product's cost price.
- **Adjust stock** (damage, loss, recount): requires quantity and a **reason** (mandatory).
- Movements are immutable. Mistakes are corrected with a reversing movement, never edited.

### 7.3 Customers
Fields: name (required), phone, email, address, notes, optional `credit_limit`.
- A built-in **"Walk-in customer"** record is used for anonymous paid sales. Walk-in cannot be used for credit sales.
- Customer detail page: contact info, **total outstanding balance**, list of sales, list of payments, and a statement (chronological ledger).

### 7.4 Sales (most important flow)

**New Sale screen** (POS-style, fast):
1. Add items by search or barcode scan; adjust quantity and unit price (price override only with permission); optional per-line or whole-sale discount.
2. Pick customer (default Walk-in).
3. Choose payment:
   - **Paid in full** (cash / card / bank transfer / mobile money): amount paid = total.
   - **Partial payment (debt for the rest)**: customer required; enter amount paid now; the remainder becomes debt.
   - **Full credit (no payment now)**: customer required; amount paid = 0.
4. Optional due date for debt, and notes.
5. Confirm. A printable receipt/invoice is shown (A4 and 80mm thermal-friendly print CSS).

**Rules (enforced on the server, inside ONE database transaction):**
1. Re-read each product row with `SELECT ... FOR UPDATE` to prevent race conditions and overselling.
2. If insufficient stock and the company setting disallows it, reject the entire sale with a clear error naming the product.
3. Calculate all totals on the server from product/quantity/price inputs; **never trust client-calculated totals**.
4. Snapshot `unit_price` and `unit_cost` on each sale item (so later price changes never alter history and profit is accurate).
5. Insert the `sale`, `sale_items`, one `stock_movement` per item (negative qty), and, if `amount_paid > 0`, a `payment` row.
6. Compute and store: `total`, `amount_paid`, `balance_due = total − amount_paid`, and `payment_status`:
   - `paid` if balance_due = 0
   - `partial` if 0 < amount_paid < total
   - `unpaid` if amount_paid = 0 and total > 0
7. If `balance_due > 0`: customer must not be Walk-in, credit sales must be enabled, and (if set) the customer's outstanding balance + new debt must not exceed `credit_limit`, otherwise reject.
8. `amount_paid` can never exceed `total` on a sale (no overpayment in v1).
9. Invoice numbers are sequential and gap-free-ish (`INV-000001`), generated from a database sequence inside the transaction.
10. Any failure rolls everything back. There is never a half-saved sale.

**Voiding a sale** (`sales.void`, mandatory reason):
- Marks the sale `voided`; creates `sale_void` movements returning stock; marks its payments as reversed. The sale stays visible in lists (strikethrough) and is excluded from revenue and debt totals.
- A sale cannot be edited after creation. To correct, void and re-create.
- A voided sale cannot be voided again.

### 7.5 Debts and payments
- **Debts page** (`/debts`): list of customers with outstanding balances (customer, total owed, oldest unpaid date, overdue flag). Filter: overdue, search by customer.
- **Record payment:** from a customer or a specific sale, enter amount, method, date, note.
  - Payment applies to a specific sale, or to the customer's **oldest unpaid sales first (FIFO)** when recorded at customer level. Each application is stored so every sale's `amount_paid`, `balance_due`, and status stay accurate.
  - Payment cannot exceed the amount currently owed.
  - Payments are immutable; mistakes are fixed with a reversal (`payments.reversed_at`, with reason), not by deleting.
- Customer balance is always **computed from sales and payments**, never typed in by hand. Optionally cache it, but recalc inside the same transaction.
- Overdue = `due_date < today` and `balance_due > 0`.

### 7.6 Dashboard (Bento grid)
Cards (date-range selectable: today, 7d, 30d, custom):
- Today's sales total (and number of sales)
- Cash collected (payments received)
- Outstanding debt (total owed by customers) with link to `/debts`
- Low stock and out-of-stock counts with link
- Sales trend chart (line/bar)
- Top 5 selling products
- Recent sales list
- Gross profit (only for roles with `reports.view`)

### 7.7 Reports
Simple, with date filters and CSV export:
- Sales report (by day, by product, by customer, by cashier)
- Profit report (revenue − cost of goods sold, using snapshot costs)
- Stock valuation (qty × cost) and low-stock list
- Debt aging (0–30, 31–60, 61–90, 90+ days)
- Stock movement report

### 7.8 Audit log
`/settings/audit` records: who, when, action, entity, and before/after summary for: user changes, role changes, product price/cost changes, stock adjustments, sale voids, payment reversals, settings changes, logins (success/failure).

---

## 8. Database Schema (PostgreSQL)

Use `uuid` primary keys (`gen_random_uuid()`), `timestamptz` for all timestamps, `created_at` / `updated_at` on every table.

**Money:** store as `numeric(14,2)` (never float). Do all arithmetic on the server using a decimal-safe approach (integer minor units or a decimal library). Quantities: `numeric(14,3)` to allow weights/litres.

```
company            (id, name, logo_url, currency, phone, email, address,
                    invoice_prefix, allow_negative_stock bool, low_stock_default int,
                    allow_credit bool, tax_enabled bool, tax_rate numeric(5,2),
                    accent_color, onboarded_at)

roles              (id, key unique, name, is_system bool)
permissions        (id, key unique)
role_permissions   (role_id, permission_id)

users              (id, name, email unique (citext), password_hash, role_id,
                    status enum[active,disabled,invited], must_change_password bool,
                    last_login_at)
sessions / accounts / verification  -> as required by the chosen auth library
invites            (id, user_id, token_hash, expires_at, used_at)

categories         (id, name unique)
units              (id, name unique, short_name)

products           (id, name, sku unique, barcode unique null, category_id, unit_id,
                    cost_price, selling_price, stock_qty numeric(14,3) default 0,
                    low_stock_threshold null, image_url, description,
                    is_active bool default true)

stock_movements    (id, product_id, type enum, qty_change numeric(14,3),  -- signed
                    qty_after numeric(14,3), unit_cost null,
                    reference_type null, reference_id null,  -- e.g. 'sale', uuid
                    reason text null, created_by, created_at)

customers          (id, name, phone, email, address, notes, credit_limit null,
                    is_walk_in bool default false, is_active bool)

sales              (id, invoice_no unique, customer_id, status enum[completed,voided],
                    subtotal, discount_total, tax_total, total,
                    amount_paid, balance_due,
                    payment_status enum[paid,partial,unpaid],
                    due_date null, notes, created_by, created_at,
                    voided_at null, voided_by null, void_reason null)

sale_items         (id, sale_id, product_id, product_name_snapshot, sku_snapshot,
                    qty, unit_price, unit_cost, discount, line_total)

payments           (id, customer_id, method enum[cash,card,bank_transfer,mobile_money,other],
                    amount, paid_at, note, created_by,
                    reversed_at null, reversed_by null, reverse_reason null)

payment_allocations(id, payment_id, sale_id, amount)

audit_logs         (id, user_id, action, entity_type, entity_id, details jsonb, ip, created_at)
```

### Constraints and indexes
- `CHECK (qty > 0)` on sale_items; `CHECK (amount > 0)` on payments and allocations.
- `CHECK (amount_paid >= 0 AND amount_paid <= total)` and `CHECK (balance_due = total - amount_paid)` on sales.
- `CHECK (stock_qty >= 0)` on products **unless** negative stock is allowed (enforce in service layer when the setting is on; keep the DB check by default).
- Indexes: `products(name)`, `products(sku)`, `products(barcode)`, `sales(created_at)`, `sales(customer_id)`, `sales(payment_status)`, `stock_movements(product_id, created_at)`, `payments(customer_id)`, `payment_allocations(sale_id)`.
- Foreign keys with `ON DELETE RESTRICT` for anything historical.
- Seed data (idempotent): roles, permissions, role_permissions, default units, default category, Walk-in customer.

---

## 9. Project Structure

```
/src
  /app
    /(auth)/login, /accept-invite/[token], /reset-password
    /onboarding
    /(app)/dashboard
    /(app)/products, /products/[id]
    /(app)/stock           (receive, adjust, movements)
    /(app)/sales, /sales/new, /sales/[id]
    /(app)/customers, /customers/[id]
    /(app)/debts
    /(app)/reports
    /(app)/settings/company, /settings/users, /settings/catalog, /settings/audit
    /(app)/profile
    /api/...               (only where Server Actions don't fit, e.g. uploads, exports)
  /components/ui           (shadcn)
  /components/...          (feature components)
  /db/schema.ts, /db/index.ts, /db/seed.ts, /db/migrations
  /services                (products, stock, sales, payments, users, reports)  <- all business rules
  /lib/auth.ts, permissions.ts, money.ts, validators/ (zod), format.ts
  /middleware.ts           (auth + onboarding redirect)
```

Rules:
- UI components never talk to the database directly; they call services via Server Actions.
- Every Server Action: (1) authenticate, (2) check permission, (3) validate input with Zod, (4) call the service, (5) write audit log where required.

---

## 10. Non-Functional Requirements

- **Security:** server-side permission checks everywhere; CSRF-safe Server Actions; parameterized queries only (ORM); secure cookies; rate-limit login; validate upload type and size; never expose `password_hash` or `cost_price` to roles without permission (strip in the service layer, not just the UI).
- **Data integrity:** all multi-table writes in transactions; row locking on stock during sales; immutable ledgers (movements, payments).
- **Performance:** server-side pagination and search on all lists; indexes above; avoid N+1 queries.
- **Formatting:** currency formatted with `Intl.NumberFormat` using the company currency; dates in the user's locale; all timestamps stored in UTC.
- **Quality:** TypeScript strict mode; no `any`; Zod validation shared client/server; README with setup steps.

---

## 11. Build Order (phases)

1. **Foundation:** Next.js + TypeScript + Tailwind + shadcn, Postgres via docker-compose, Drizzle schema, migrations, seed.
2. **Auth and onboarding:** onboarding wizard, login, sessions, middleware redirects, roles/permissions seeding, `can()` helper.
3. **User management:** list, add/invite, edit role, disable, reset password, profile, guardrails, audit log.
4. **Catalog and products:** categories, units, product CRUD, opening stock, product detail with movements.
5. **Stock:** receive stock, adjustments, movement history.
6. **Customers.**
7. **Sales:** New Sale screen, transactional sale service, receipt print view, sales list/detail, void.
8. **Debts and payments:** debts page, customer statement, record payment with allocation, reversal.
9. **Dashboard and reports.**
10. **Polish:** command palette, dark mode, empty/loading states, responsive checks, CSV exports, README, Docker production build.

Complete and verify each phase before starting the next.

---

## 12. Acceptance Criteria (must all pass)

**Onboarding and users**
- [ ] Fresh database redirects everything to `/onboarding`; after finishing, `/onboarding` is no longer accessible.
- [ ] Company name and logo appear in the sidebar and on receipts.
- [ ] The first user is an Owner. The last Owner cannot be removed, disabled, or demoted.
- [ ] A Cashier cannot open settings, cannot see cost price or profit, and cannot void a sale, even by calling the server action directly.
- [ ] A disabled user is logged out immediately and cannot log in.

**Products and stock**
- [ ] Creating a product with initial stock 10 creates an `opening` movement and `stock_qty = 10`.
- [ ] Stock can only change through movements; `stock_qty` always equals the sum of that product's movements.
- [ ] Stock adjustments require a reason.

**Sales and debt**
- [ ] Selling 3 of a product with 10 in stock leaves 7 and creates a `sale` movement of −3.
- [ ] Selling more than available is rejected (when negative stock is off) and nothing is saved.
- [ ] Two simultaneous sales of the last unit: exactly one succeeds.
- [ ] Paid-in-full sale: `balance_due = 0`, status `paid`, one payment row.
- [ ] Partial sale (total 100, paid 40): `balance_due = 60`, status `partial`, customer balance +60.
- [ ] Full credit sale: `amount_paid = 0`, status `unpaid`, no payment row, customer balance +total.
- [ ] Credit or partial sale to Walk-in is rejected.
- [ ] Changing a product's price afterward does not change old sales or old profit figures.
- [ ] Recording a 60 payment on that debt makes the sale `paid` and customer balance 0; recording more than owed is rejected.
- [ ] Customer-level payment is allocated oldest-first across multiple unpaid sales, and each sale's balance is correct.
- [ ] Voiding a sale restores stock, removes its debt from the customer balance, and keeps the record visible as voided.
- [ ] Customer balance on the debts page equals the sum of `balance_due` of that customer's non-voided sales.

**General**
- [ ] Dashboard figures match the underlying data for the selected date range.
- [ ] Works on desktop, tablet, and phone; dark mode works.
- [ ] `docker compose up` starts the app and database from scratch with migrations and seed applied.

---

## 13. Out of Scope for v1 (do not build)

Multi-branch / multi-warehouse, suppliers and purchase orders (receiving stock is a simple form only), product variants, multi-currency, online payments, e-commerce storefront, advanced tax rules, returns against specific invoices beyond void, offline mode, mobile native app. Keep the data model clean so these can be added later.
