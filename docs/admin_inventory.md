# Blizz Books — Hotel Admin Module
**Complete Build Reference**
Version: v1.2-dev | Platform: Web + Mobile App | Date: 19 May 2026

---

## Who Is the Hotel Admin?

The Hotel Admin is the owner or designated administrator of a single hotel property. They have **complete visibility and control** over their hotel instance. This is the most powerful role within a hotel — they see everything (inventory, expenses, revenue, P&L) and configure everything (departments, users, roles, masters).

They access the platform via the main app (`app.blizzbooks.io`) on web and mobile. Their JWT contains `hotel_id`, scoping all data to their hotel.

---

## Table of Contents

1. [Access & First Login](#1-access--first-login)
2. [Hotel Admin Dashboard](#2-hotel-admin-dashboard)
3. [Hotel Profile & Settings](#3-hotel-profile--settings)
4. [Inventory Masters](#4-inventory-masters)
5. [Department Management](#5-department-management)
6. [User & Role Management](#6-user--role-management)
7. [Feature Flag Configuration](#7-feature-flag-configuration)
8. [Inventory Overview](#8-inventory-overview)
9. [Expense Management](#9-expense-management)
10. [Revenue & POS Import](#10-revenue--pos-import)
11. [P&L Analytics Dashboard](#11-pl-analytics-dashboard)
12. [Reports & Exports](#12-reports--exports)
13. [Notifications](#13-notifications)
14. [API Reference — Hotel Admin](#14-api-reference--hotel-admin)
15. [UI States & Edge Cases](#15-ui-states--edge-cases)
16. [Navigation & Layout](#16-navigation--layout)
17. [Mobile-Specific Behaviour](#17-mobile-specific-behaviour)

---

## 1. Access & First Login

### 1.1 Login

- **URL:** `app.blizzbooks.io/login` (same login page as all hotel roles)
- Credentials: email + password (received via welcome email from Super Admin)
- JWT payload: `{ sub: user_id, role: "hotel_admin", hotel_id: "uuid", feature_flags: [...] }`
- Hotel Admin always has ALL flags enabled — no restrictions

### 1.2 First Login Flow

```
1. Hotel Admin logs in with temp password
2. System checks: password_is_temporary = true
3. All API routes return 403 MUST_CHANGE_PASSWORD
4. Frontend detects this error code and redirects to /change-password screen
5. Change password form: current password (temp), new password, confirm new password
6. On success: password_is_temporary = false; redirect to onboarding checklist
```

### 1.3 Onboarding Checklist (First Login After Password Change)

Show a checklist modal that tracks setup progress. Persist progress in localStorage + server flag.

```
Getting Started with Blizz Books ✓

[ ] Set up hotel profile (name, timezone, currency, logo)
[ ] Create product categories (e.g. Dairy, Vegetables, Meat)
[ ] Review default units (kg, g, L — add custom units if needed)
[ ] Create departments (Main Kitchen, Tea Stall, etc.)
[ ] Add staff accounts

[Skip for now]  [Start Setup →]
```

Each checklist item is clickable and navigates to the relevant section. Checklist is dismissible. Reappears on next login until all items are completed (or dismissed permanently after 3 skips).

### 1.4 My Account

**Route:** `/account`

- Change own password
- Update own name and phone
- View own last login
- Manage notification preferences (email on/off per event type)

```
PATCH /hotels/:hotel_id/users/me
Body: { name?, phone? }

POST /auth/change-password
Body: { current_password, new_password }
```

---

## 2. Hotel Admin Dashboard

**Route:** `/dashboard`
**This is the home screen after login.**

### 2.1 Summary Cards (Top Row)

| Card | Value | Tap/Click Action |
|---|---|---|
| Today's Revenue | Gross revenue for today from POS | → P&L daily view |
| This Month's P&L | Net profit/loss MTD | → P&L monthly view |
| Inventory Items | Count of distinct items with stock > 0 | → Inventory list |
| Pending Requests | Count of PENDING stock requests | → Stock requests list |
| Low Stock Alerts | Count of items below threshold | → Inventory filtered by low stock |

### 2.2 P&L Trend Chart

Line chart: last 30 days, one point per day.
- Line 1 (blue): Daily gross revenue
- Line 2 (red): Daily total expenses
- Shaded area: profit zone (revenue > expenses) or loss zone

If no revenue data: show chart area with "Import POS data to see revenue trend" overlay.

### 2.3 Top Expense Categories (This Month)

Horizontal bar chart: top 5 expense categories by amount.
- Click any bar → Expenses list filtered by that category

### 2.4 Recent Stock Requests

Table: last 5 stock requests across all departments.

| Item | Department | Qty | Status | Time |
|---|---|---|---|---|
| Rice | Main Kitchen | 10 kg | Pending | 2 hrs ago |

"View all requests →" link at bottom.

### 2.5 Quick Actions Bar

```
[+ Add Stock Entry]  [+ Add Expense]  [Import POS Report]  [Export Report]
```

### 2.6 API

```
GET /hotels/:hotel_id/dashboard
Response: {
  today_revenue: number | null,
  month_pnl: { gross_revenue, total_expenses, net_pnl },
  inventory_items_count: number,
  pending_requests_count: number,
  low_stock_count: number,
  revenue_trend_30d: [{ date, revenue, expenses }],
  top_expense_categories: [{ category_name, amount }],
  recent_requests: [{ id, item_name, dept_name, quantity, unit, status, created_at }]
}
```

Cache this response in Redis per hotel: TTL 5 minutes. Invalidate on new stock entry, expense, or POS import.

---

## 3. Hotel Profile & Settings

**Route:** `/settings/profile`

### 3.1 Profile Form

| Field | Type | Required | Notes |
|---|---|---|---|
| Hotel Name | Text | Yes | 2–100 chars |
| Address | Textarea | No | Shown on exports/reports |
| Phone | Text | No | — |
| Timezone | Dropdown | Yes | All IANA timezones; default: Asia/Kolkata |
| Currency | Dropdown | Yes | Default: INR; display only (no conversion logic in v1.0) |
| Logo | Image upload | No | Max 2MB, JPEG/PNG/WebP; shown on reports and app header |

Logo upload flow:
```
1. Admin selects file
2. Client-side preview shown
3. On save: POST /hotels/:id/profile/logo (multipart)
4. Server uploads to S3: hotels/{hotel_id}/logo/logo.{ext}
5. Updates hotels.logo_url
6. Response: { logo_url }
```

```
PATCH /hotels/:hotel_id/profile
Body: { name?, address?, phone?, timezone?, currency?, logo_url? }
```

---

## 4. Inventory Masters

**Route:** `/settings/inventory-masters`
**Hotel Admin exclusive — locked for all other roles.**

This is the controlled vocabulary for the entire platform. Must be set up before any stock entry or expense can be created.

### 4.1 Categories Tab

#### Category List

| Column | Details |
|---|---|
| Name | e.g. Dairy |
| Code | e.g. DAIRY (auto-generated) |
| Description | Optional |
| Status | Active / Archived (badge) |
| Items Using | Count of stock entries referencing this category |
| Actions | Edit / Archive |

Filters: All / Active / Archived

#### Create Category

```
POST /hotels/:hotel_id/categories
Body: { name, description? }

Server:
  1. Generate code: name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 8)
     If collision: append 01, 02...
  2. Check unique name (case-insensitive) within hotel
  3. Insert; return created record
```

Form fields: Name (required), Description (optional). Code is shown as read-only preview after typing name.

#### Edit Category

Can edit: name, description. Code regenerates automatically on name change.

```
PATCH /hotels/:hotel_id/categories/:id
Body: { name?, description? }
```

#### Archive Category

```
POST /hotels/:hotel_id/categories/:id/archive
```

Rules:
- If category has stock entries in the current calendar month → show warning: "This category has X stock entries this month. Archive anyway?" (can proceed)
- If stock entries exist (any month) → archived category stays linked to historical data; just excluded from new entry dropdowns
- Cannot archive if no active categories remain (need at least one for new stock entries)

UI: Archive button → confirmation modal showing item count. Archived items show greyed out with "(Archived)" label; "Restore" button available.

---

### 4.2 Units Tab

#### Units List

| Column | Details |
|---|---|
| Name | e.g. kg, dozen |
| Symbol | e.g. kg, doz |
| Type | Simple / Compound badge |
| Conversion | If compound: "1 dozen = 12 pcs" |
| System Unit | Lock icon if is_system=true |
| Status | Active / Archived |
| Actions | Edit / Archive (disabled for system units) |

#### Create Unit

**Simple Unit:**

```
Name: bottle
Symbol: btl
Type: Simple
```

**Compound Unit:**

```
Name: dozen
Symbol: doz
Type: Compound
Base Unit: [dropdown of active simple units] → pcs
1 dozen = [12] pcs  ← conversion factor input
Preview: "1 dozen = 12 pcs"
```

```
POST /hotels/:hotel_id/units
Body: { name, symbol, type: 'simple'|'compound', base_unit_id?, conversion_factor? }

Validation:
  - name and symbol unique within hotel (case-insensitive)
  - compound: base_unit_id must be a simple unit (no chaining)
  - compound: conversion_factor must be positive number > 0
```

#### Archive Unit

```
POST /hotels/:hotel_id/units/:id/archive

Validation:
  - Cannot archive if referenced in any stock_entry, stock_request, or stock_issuance
  - Response on conflict: { error: "UNIT_IN_USE", references: { stock_entries: 23, requests: 5, issuances: 12 } }
  - Cannot archive system units (is_system=true) — action button hidden/disabled
```

---

## 5. Department Management

**Route:** `/settings/departments`

### 5.1 Department List

| Column | Details |
|---|---|
| Name | e.g. Main Kitchen |
| Description | — |
| Staff Count | Active users assigned to this dept |
| Open Requests | Count of PENDING stock requests from this dept |
| Status | Active / Inactive |
| Actions | Edit / Deactivate |

#### Create Department

```
POST /hotels/:hotel_id/departments
Body: { name, description? }

Validation:
  - name unique within hotel (case-insensitive)
  - max 100 departments per hotel (plan limit check)
```

#### Edit Department

```
PATCH /hotels/:hotel_id/departments/:id
Body: { name?, description? }
```

#### Deactivate Department

```
PATCH /hotels/:hotel_id/departments/:id
Body: { is_active: false }

Validation:
  - Cannot deactivate if there are active users assigned → 409 DEPARTMENT_HAS_ACTIVE_USERS
    Response: { error: "DEPARTMENT_HAS_ACTIVE_USERS", count: 3 }
    UI: "Reassign or deactivate 3 users before deactivating this department."
  - Cannot deactivate if there are PENDING stock requests → 409 DEPARTMENT_HAS_OPEN_REQUESTS
    Response: { error: "DEPARTMENT_HAS_OPEN_REQUESTS", count: 2 }
    UI: "Resolve 2 open stock requests before deactivating."
```

---

## 6. User & Role Management

**Route:** `/settings/users`

### 6.1 User List

| Column | Details |
|---|---|
| Name | — |
| Email | — |
| Role | Store Manager / Dept Manager / Staff (badge) |
| Department | For dept_manager and staff; "—" for store_manager |
| Status | Active / Inactive |
| Last Login | Relative time ("2 hrs ago", "Never") |
| Actions | Edit / Deactivate / Reset Password |

Filters: Role, Department, Status
Search: name or email

#### Create User

```
POST /hotels/:hotel_id/users
Body: { name, email, phone?, role, department_id? }

Validation:
  - email globally unique
  - role = 'dept_manager' or 'staff': department_id required
  - role = 'store_manager': department_id must be null
  - Check plan user limit: if hotel at max users → 403 USER_LIMIT_REACHED

Server:
  1. Create user with temp password (auto-generated 10 chars)
  2. password_is_temporary = true
  3. Send welcome email with login URL and temp password
  4. Audit log
```

**Form fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| Full Name | Text | Yes | — |
| Email | Email | Yes | Used as login |
| Phone | Text | No | For display only |
| Role | Dropdown | Yes | Store Manager / Dept Manager / Staff |
| Department | Dropdown | Conditional | Required for Dept Manager and Staff; hidden for Store Manager |

After submit: show "User created. Welcome email sent to [email]."

#### Edit User

```
PATCH /hotels/:hotel_id/users/:id
Body: { name?, phone?, role?, department_id?, is_active? }

Validation:
  - Cannot demote hotel_admin via this endpoint
  - If changing role from store_manager: must provide department_id
  - If changing to store_manager: department_id must be cleared
```

#### Deactivate / Reactivate User

Toggle `is_active`. Deactivated users cannot log in (server checks is_active on every auth). Their historical data is preserved.

Cannot deactivate the only active hotel_admin → `409 LAST_ADMIN`.

#### Reset Staff Password

```
POST /hotels/:hotel_id/users/:id/reset-password

Server:
  1. Generate temp password
  2. Set password_is_temporary = true
  3. Revoke all refresh tokens for that user
  4. Send email to user
  5. Return: { message: "Password reset email sent to [email]" }
```

---

## 7. Feature Flag Configuration

**Route:** `/settings/roles`

### 7.1 Role Flags Screen

Three tabs: Store Manager | Dept Manager | Staff

Each tab shows a table of configurable flags for that role.

| Feature | Toggle | Notes |
|---|---|---|
| Bulk Upload — Stock Entry | ON / OFF | Allows/blocks bulk CSV upload for purchases |
| Bulk Upload — Stock Issuance | ON / OFF | — |
| Approve Stock Requests | ON / OFF | (Dept Manager only) |
| Add Variable Expenses | ON / OFF | — |
| View Expenses | ON / OFF | — |
| Upload POS Report | ON / OFF | — |
| Raise Stock Request | ON / OFF | (Store Manager only) |

Non-configurable flags shown greyed out with a lock icon and label "Always ON" or "OFF (locked)".

```
PATCH /hotels/:hotel_id/roles/:role/flags
Body: { flag_name: "bulk_upload_stock_entry", is_enabled: true }
Role param: 'store_manager' | 'dept_manager' | 'staff'

Validation:
  - Cannot toggle locked flags → 403 FLAG_NOT_CONFIGURABLE
  - role must be one of the 3 valid values
```

After toggle: toast "Permissions updated. Changes apply on next login." — users must log out and back in for JWT to pick up new flags.

---

## 8. Inventory Overview

**Route:** `/inventory`
Hotel Admin sees the **full hotel-wide** inventory (all departments, all items).

### 8.1 Inventory List

Filters:
- Search: item name (ILIKE)
- Category: dropdown
- Unit: dropdown
- Stock status: All / In Stock / Low Stock / Out of Stock
- Sort: Name (A-Z) / Quantity (high-low) / Last Updated

| Column | Details |
|---|---|
| Item Name | Clickable → item drill-down |
| Category | Badge |
| Current Stock | Quantity + unit |
| Low Stock | Amber warning icon if below threshold |
| Last Updated | Date of last stock entry or issuance |
| Actions | View History / Set Alert Threshold |

#### Set Low Stock Alert Threshold

Clicking "Set Alert Threshold" opens a modal:
```
Item: Rice (kg)
Current Stock: 12.5 kg
Alert me when stock drops below: [____] kg
[Clear threshold]  [Save]
```

```
PATCH /hotels/:hotel_id/inventory/levels/:item_id/threshold
Body: { low_stock_threshold: 5.0 }  // or null to clear
```

### 8.2 Item Drill-Down

**Route:** `/inventory/items/:item_name_slug`

Sections:

**Summary Header:**
```
Rice
Category: Dry Goods | Unit: kg | Current Stock: 12.5 kg
Low stock threshold: 5 kg  [Edit threshold]
```

**Purchase History Tab:**
Table of all stock entries for this item:

| Date | Qty | Price/Unit | Total | Vendor | Bill No. | Payment |
|---|---|---|---|---|---|---|
| 18 May | 25 kg | ₹45.00 | ₹1,125 | Ram Traders | INV-001 | UPI |

**Price History Chart:**
Line chart: purchase price per unit over time. Useful for spotting vendor price changes.

**Issuance History Tab:**
All issuances for this item:

| Date | Qty Issued | Department | Issued By | Request No. |
|---|---|---|---|---|
| 19 May | 5 kg | Main Kitchen | Raju | SR-20260519-0001 |

```
GET /hotels/:hotel_id/stock/items/:item_name_slug/history
Query: tab='purchases'|'issuances', date_from, date_to, page, limit
```

### 8.3 Hotel Admin Stock Entry Access

Hotel Admin can also add stock entries (single and bulk) — all the same flows as Store Manager. See Store Manager PRD for those flows (Hotel Admin always has these permissions unlocked).

---

## 9. Expense Management

**Route:** `/expenses`
Hotel Admin sees **all** expenses across all types.

### 9.1 Expense List (Combined View)

Default view: all expense types combined, sorted by date descending.

**Top Filter Bar:**

| Filter | Options |
|---|---|
| Type | All / Purchase / Fixed / Variable |
| Category | Dropdown |
| Payment Method | Dropdown |
| Date Range | Date pickers (from / to) |
| Vendor | Text search |
| Search | Description ILIKE |

**Summary Row (above table):**
```
Total shown: ₹1,23,450  |  Purchase: ₹78,200  |  Fixed: ₹35,000  |  Variable: ₹10,250
```
Updates live as filters change.

**Table Columns:**

| Date | Type | Description | Category | Amount | Payment | Vendor | Actions |
|---|---|---|---|---|---|---|---|
| 19 May | Purchase | Tomatoes (5kg) | Vegetables | ₹250 | UPI | Ram Traders | View |
| 18 May | Fixed | May Rent | — | ₹35,000 | Cheque | — | View |
| 17 May | Variable | Plumber repair | Maintenance | ₹1,500 | Cash | — | View |

Purchase expenses are auto-created (read-only here). Fixed and Variable can be edited by Hotel Admin.

---

### 9.2 Fixed Expenses

**Route:** `/expenses/fixed`

#### Fixed Expense List

Grouped by month. Each month is a collapsible section:

```
May 2026  ──────────────────────────────────────  Total: ₹95,000
  Rent                    ₹35,000   [Edit] [Delete]
  Staff Salaries          ₹55,000   [View Details] [Edit] [Delete]
  Electricity Bill         ₹5,000   [Edit] [Delete]

April 2026 ─────────────────────────────────────  Total: ₹90,000
  [Clone May to next month →]
```

#### Add Fixed Expense

```
POST /hotels/:hotel_id/expenses/fixed
Body: {
  fixed_type: 'rent'|'salary'|'utility'|'emi'|'insurance'|'other',
  description,
  amount,
  expense_date,
  month_year,       // YYYY-MM — the month this belongs to
  payment_method,
  reference_no?,
  vendor_name?,
  notes?,
  salary_details?   // JSONB — only for fixed_type='salary'
}
```

**Salary Entry Special Form:**

When type = 'salary', show a sub-table entry form:

```
Staff Salary — May 2026

[+ Add Staff Row]
Name               | Designation  | Gross    | Deductions | Net      | Bank Ref
Raju Kumar         | Chef         | ₹25,000  | ₹2,000     | ₹23,000  | UTR123456
Meera Sharma       | Server       | ₹18,000  | ₹1,000     | ₹17,000  | UTR789012

Total Net Payable: ₹40,000
```

`amount` field auto-fills from sum of net salaries.

#### Clone to Next Month

```
POST /hotels/:hotel_id/expenses/fixed/:id/clone-to-next-month

Server:
  1. Creates new expense record
  2. month_year incremented by 1 month
  3. cloned_from_id = original id
  4. Returns new record (not yet saved — user reviews and edits if needed)

UI: Opens edit form pre-filled with cloned data. Admin can adjust amounts before saving.
```

---

### 9.3 Variable / Petty Expenses

**Route:** `/expenses/variable`

#### Add Variable Expense

```
POST /hotels/:hotel_id/expenses/variable
Body: {
  description,
  amount,
  category_id?,
  expense_date,
  payment_method,
  reference_no?,
  bill_available,
  notes?
}
```

Form fields:

| Field | Type | Required |
|---|---|---|
| Description | Text | Yes |
| Amount | Decimal | Yes |
| Category | Dropdown | No |
| Date | Date picker | Yes |
| Payment Method | Dropdown | Yes |
| Reference No. | Text | No |
| Bill Available? | Toggle | Yes (default: ON) |
| Receipt Photo | File upload | No |
| Notes | Textarea | No |

Receipt upload: same as stock entry — `POST /hotels/:hotel_id/expenses/:id/receipt`

---

## 10. Revenue & POS Import

**Route:** `/revenue`
Hotel Admin exclusive — no other role can access this.

### 10.1 Revenue Overview

**Summary Cards:**

| Card | Value |
|---|---|
| This Month's Revenue | Sum of revenue_entries for current month |
| Last Month's Revenue | For comparison |
| YTD Revenue | Jan 1 to today |
| Last Import | Date of most recent pos_import |

**Revenue Table:**

Date-wise table, most recent first:

| Date | Gross Revenue | Source | Import Batch | Actions |
|---|---|---|---|---|
| 19 May 2026 | ₹84,500 | Paid Pooja | Import #12 | — |
| 18 May 2026 | ₹76,200 | Paid Pooja | Import #12 | — |

Filters: date range, import batch.

### 10.2 Import POS Report

**Route:** `/revenue/import`

**Step 1 — Upload File:**

```
Drop zone:
  "Upload your Paid Pooja export file"
  Accepted formats: .csv, .xlsx
  Max size: 10MB
  [Download sample format]

Column mapping config (collapsible, for advanced users):
  Date column name: [entry_date    ▾]
  Date format:      [DD/MM/YYYY    ▾]
  Revenue column:   [gross_revenue ▾]
  Skip header rows: [1             ]
```

**Step 2 — Preview:**

After upload (async parse), show:
```
File: daily_sales_may2026.csv
Parsed 22 rows

Preview:
Date         | Gross Revenue
18 May 2026  | ₹84,500
17 May 2026  | ₹76,200
...

⚠️  5 rows already exist in the ledger. They will be overwritten.
[Cancel]  [Confirm Import]
```

**Step 3 — Confirm:**

```
POST /hotels/:hotel_id/revenue/import (multipart)

Async processing:
  1. Upload to S3
  2. Create pos_imports record
  3. Queue parse job
  4. Poll GET /hotels/:hotel_id/revenue/imports/:import_id/status
  5. On complete: show success banner with row count
```

**Re-upload handling:**
- If date entries already exist → overwrite with new values
- Before overwrite: save old values to audit_log as `before_state`
- Show count of overwritten rows in success message

### 10.3 Import History

Table of all past imports:

| Date | File | Rows Parsed | Period | Status | Actions |
|---|---|---|---|---|---|
| 19 May | daily_may.csv | 22 | 1–18 May | Success | View |
| 5 May  | april_final.xlsx | 30 | Apr | Success | View |

---

## 11. P&L Analytics Dashboard

**Route:** `/analytics`
Hotel Admin exclusive.

### 11.1 View Selector

Top of page:
```
[Daily]  [Weekly]  [Monthly]  [Custom Range]  [Year to Date]
```

### 11.2 Daily View

Date picker (default: today).

```
P&L — 19 May 2026
───────────────────────────────────────────────
Gross Revenue          ₹84,500
─ Purchase Expenses    ₹32,400
─ Fixed Expenses       ₹3,167    ← prorated (₹95,000 / 30 days)
─ Variable Expenses     ₹1,200
───────────────────────────────
Net Profit             ₹47,733   ← green (positive)
Margin                 56.5%
```

Below summary: expense breakdown by category (horizontal bar chart).

### 11.3 Weekly View

Date picker (select any date → shows that week Mon–Sun).

```
P&L — Week of 13–19 May 2026
Bar chart: 7 bars (Mon–Sun), each split into Revenue vs Expenses
Summary row: best day, worst day, week totals
```

### 11.4 Monthly View

Month picker (default: current month).

```
P&L — May 2026
Week-wise rollup table:
  Week 1 (1–7 May):   Revenue ₹5,20,000 | Expenses ₹3,10,000 | Net ₹2,10,000
  Week 2 (8–14 May):  ...
  Week 3 (15–21 May): ...
  Week 4 (22–31 May): ...
  ─────────────────────────────────────────────────────────
  Month Total: Revenue ₹21,50,000 | Expenses ₹13,80,000 | Net ₹7,70,000

Fixed vs Variable split (donut chart):
  Fixed: ₹95,000 (6.9%)  |  Variable: ₹42,000 (3%)  |  Purchase: ₹12,43,000 (90.1%)
```

### 11.5 Custom Range View

Date range pickers (from → to). Max range: 1 year.

Full P&L for the period. Breakdown by month if range > 31 days, by day if ≤ 31 days.

### 11.6 Year to Date View

Always Jan 1 to today.

```
Monthly trend line chart: 12 points (Jan–Dec; future months shown as zero)
Highest revenue month badge
Current year vs previous year comparison (if previous year data exists)
```

### 11.7 Drill-Down from Dashboard

Clicking any expense category row or chart segment → filters the expense list to that category + date range.

### 11.8 P&L API

```
GET /hotels/:hotel_id/analytics/pnl
Query: {
  view: 'daily'|'weekly'|'monthly'|'custom'|'ytd',
  date?: 'YYYY-MM-DD',          // for daily/weekly
  month?: 'YYYY-MM',            // for monthly
  date_from?: 'YYYY-MM-DD',     // for custom
  date_to?: 'YYYY-MM-DD',
}

Response: {
  gross_revenue: number,
  purchase_expenses: number,
  fixed_expenses: number,          // prorated if partial month
  fixed_expenses_prorated: boolean,
  variable_expenses: number,
  net_pnl: number,
  margin_pct: number,
  breakdown: {
    by_period: [{ period_label, revenue, expenses, net_pnl }],
    expense_by_category: [{ category_name, amount, pct_of_total }],
    expense_by_payment_method: [{ method, amount }],
    fixed_vs_variable: { fixed, variable, purchase }
  }
}
```

Cache: Redis key `pnl:{hotel_id}:{view}:{date_key}`, TTL 5 min. Invalidate on any write to expenses, stock_entries, or revenue_entries for this hotel.

---

## 12. Reports & Exports

**Route:** `/reports`

### 12.1 Available Exports

| Report | Format | Content |
|---|---|---|
| P&L Report | PDF / Excel | Full P&L for selected period |
| Expense Report | Excel | All expenses with filters |
| Inventory Report | Excel | Current stock levels + purchase history |
| Stock Request Log | Excel | All requests with full status history |
| Audit Log | Excel | All audit events for the hotel |

### 12.2 Generate Export

```
GET /hotels/:hotel_id/reports/export
Query: {
  type: 'pnl'|'expenses'|'inventory'|'requests'|'audit',
  format: 'pdf'|'excel',
  date_from,
  date_to,
  // additional filters per report type
}

Response: 202 Accepted
{ job_id, status: 'processing' }

Poll: GET /hotels/:hotel_id/reports/exports/:job_id
Response on complete: { status: 'completed', download_url: '<signed_url>', expires_at }
```

Signed URL expires in 1 hour. File retained on S3 for 7 days.

### 12.3 Export History

Table of recent exports (last 30 days):

| Generated | Report Type | Period | Format | Status | Download |
|---|---|---|---|---|---|
| 19 May 10:30 | P&L Report | May 2026 | PDF | Ready | [↓ Download] |
| 18 May 09:00 | Expense Report | Apr 2026 | Excel | Expired | — |

---

## 13. Notifications

**Route:** `/notifications` (also accessible via bell icon in header)

### 13.1 Notification Bell

Header shows unread count badge (red dot with number). Clicking opens notification dropdown (last 10).

"View all →" link → full notifications page.

### 13.2 Events Hotel Admin Receives

| Event | Channel |
|---|---|
| POS import completed | In-app |
| Bulk upload completed (any) | In-app + Email |
| Bulk upload partial/failed | In-app + Email + error report link |
| Low stock alert | Push + Email |
| Subscription expiry warning (30/15/3 days) | Email |
| Inventory Master archived | In-app |

### 13.3 Notification Preferences

**Route:** `/settings/notifications`

Toggle per event type:
- Email on/off
- Push on/off (if FCM token registered)

```
PATCH /hotels/:hotel_id/users/me/notification-preferences
Body: { preferences: { low_stock_email: true, low_stock_push: false, ... } }
```

---

## 14. API Reference — Hotel Admin

Hotel Admin JWT unlocks ALL endpoints within their hotel scope. Documented here for completeness. All routes prefixed `/api/v1`.

### Profile & Setup

```
GET    /hotels/:hotel_id/profile
PATCH  /hotels/:hotel_id/profile
POST   /hotels/:hotel_id/profile/logo        (multipart)
GET    /hotels/:hotel_id/dashboard

GET    /hotels/:hotel_id/categories
POST   /hotels/:hotel_id/categories
PATCH  /hotels/:hotel_id/categories/:id
POST   /hotels/:hotel_id/categories/:id/archive

GET    /hotels/:hotel_id/units
POST   /hotels/:hotel_id/units
PATCH  /hotels/:hotel_id/units/:id
POST   /hotels/:hotel_id/units/:id/archive

GET    /hotels/:hotel_id/departments
POST   /hotels/:hotel_id/departments
PATCH  /hotels/:hotel_id/departments/:id

GET    /hotels/:hotel_id/users
POST   /hotels/:hotel_id/users
PATCH  /hotels/:hotel_id/users/:id
POST   /hotels/:hotel_id/users/:id/reset-password

GET    /hotels/:hotel_id/roles/:role/flags
PATCH  /hotels/:hotel_id/roles/:role/flags
```

### Inventory

```
GET    /hotels/:hotel_id/stock/entries
POST   /hotels/:hotel_id/stock/entries
GET    /hotels/:hotel_id/stock/items/:slug/history
POST   /hotels/:hotel_id/stock/entries/:id/receipt    (multipart)
POST   /hotels/:hotel_id/stock/bulk-entry/upload       (multipart)
GET    /hotels/:hotel_id/stock/bulk-entry/template.csv

GET    /hotels/:hotel_id/stock/issuances
POST   /hotels/:hotel_id/stock/issuances
POST   /hotels/:hotel_id/stock/bulk-issuance/upload    (multipart)
GET    /hotels/:hotel_id/stock/bulk-issuance/template.csv

GET    /hotels/:hotel_id/stock/requests
POST   /hotels/:hotel_id/stock/requests
PATCH  /hotels/:hotel_id/stock/requests/:id/approve
PATCH  /hotels/:hotel_id/stock/requests/:id/reject
PATCH  /hotels/:hotel_id/stock/requests/:id/issue
PATCH  /hotels/:hotel_id/stock/requests/:id/receive

GET    /hotels/:hotel_id/inventory/levels
PATCH  /hotels/:hotel_id/inventory/levels/:item_id/threshold
```

### Expenses & Revenue

```
GET    /hotels/:hotel_id/expenses
POST   /hotels/:hotel_id/expenses/fixed
PATCH  /hotels/:hotel_id/expenses/:id
DELETE /hotels/:hotel_id/expenses/:id        (soft delete)
POST   /hotels/:hotel_id/expenses/fixed/:id/clone-to-next-month
POST   /hotels/:hotel_id/expenses/variable
POST   /hotels/:hotel_id/expenses/:id/receipt    (multipart)

GET    /hotels/:hotel_id/revenue
POST   /hotels/:hotel_id/revenue/import         (multipart)
GET    /hotels/:hotel_id/revenue/imports/:id/status
```

### Analytics & Reports

```
GET    /hotels/:hotel_id/analytics/pnl
GET    /hotels/:hotel_id/analytics/stock-cost
GET    /hotels/:hotel_id/analytics/dept-consumption
GET    /hotels/:hotel_id/analytics/payment-methods

GET    /hotels/:hotel_id/reports/export
GET    /hotels/:hotel_id/reports/exports/:job_id
GET    /hotels/:hotel_id/reports/exports             (history list)

GET    /hotels/:hotel_id/notifications
PATCH  /hotels/:hotel_id/notifications/:id/read
PATCH  /hotels/:hotel_id/notifications/read-all
GET    /hotels/:hotel_id/bulk-uploads/:batch_id/status
GET    /hotels/:hotel_id/audit-logs                   (hotel-scoped view)
```

---

## 15. UI States & Edge Cases

### 15.1 Dashboard

| State | Handling |
|---|---|
| No POS data yet | Revenue cards show "—"; P&L chart shows zero revenue line; "Import POS Report" CTA banner |
| No expenses yet | Expense cards show ₹0; chart shows flat line |
| Negative P&L | Net P&L card shown in red with "Loss" label |
| No pending requests | Pending requests card shows 0 with green check |
| Low stock items | Low stock card shown in amber; number is clickable |

### 15.2 Inventory Masters

| Edge Case | Handling |
|---|---|
| Creating category with duplicate name | "A category named 'Dairy' already exists." |
| Archiving category referenced in current month | Warning modal with count; can proceed |
| Archiving last active category | "You must have at least one active category. Create another before archiving this one." |
| Archiving system unit | Archive button hidden; tooltip: "System units cannot be archived." |
| Creating compound unit with archived base unit | Base unit dropdown excludes archived units |

### 15.3 User Management

| Edge Case | Handling |
|---|---|
| Creating user with existing email | "This email address is already registered in Blizz Books." |
| Deactivating last hotel admin | "You cannot deactivate the only active admin account." |
| Plan user limit reached | "You've reached your plan's limit of X users. Upgrade to add more." |
| Welcome email fails | Show temp password on screen once in a dismissible info box with copy button |
| Changing role from dept_manager (has open requests) | Warning: "This user has X open stock requests. Changing their role may affect request handling." (allow proceed) |

### 15.4 P&L Dashboard

| Edge Case | Handling |
|---|---|
| No revenue data | Dashboard shows with zeros + banner "Import POS report to see revenue" |
| Partial month — fixed expense proration | Prorated amount shown with ℹ️ tooltip: "Fixed expenses of ₹95,000 prorated to ₹3,167 for 1 day shown." |
| Custom date range > 1 year | "Maximum date range is 1 year. Please select a shorter period." |
| Revenue import in progress | Dashboard shows last known values with "Updating..." spinner on revenue card |
| Zero revenue + zero expenses | Valid state; shows ₹0 everywhere; no errors |

### 15.5 Fixed Expenses

| Edge Case | Handling |
|---|---|
| Adding fixed expense for past month | Allowed; month_year field accepts any past month |
| Cloning to month that already has entries | "May 2026 already has fixed expenses. Adding a clone will create additional entries — not replace existing ones." |
| Deleting a fixed expense | Soft delete; removed from P&L calculation going forward; appears in audit log |
| Salary total_amount mismatch | If salary_details net sum ≠ amount field: show warning "Total net pay (₹40,000) does not match Amount field (₹45,000). Please review." |

### 15.6 POS Import

| Edge Case | Handling |
|---|---|
| File format not recognised | "Could not parse this file. Please download the sample format and check your column names." |
| File has dates in wrong format | Show which rows failed with "Expected DD/MM/YYYY, got '2026-05-19'" |
| Re-uploading same period | "5 dates already exist. Importing will overwrite their revenue values." — show old vs new preview |
| Revenue = 0 for a day | Valid (e.g. closed day); import normally |
| Future date in file | Warn: "X rows have future dates and will be skipped." |

---

## 16. Navigation & Layout

### 16.1 Sidebar (Web)

```
┌──────────────────────────┐
│  [Hotel Logo]            │
│  Grand View Hotel        │
├──────────────────────────┤
│ 📊 Dashboard             │
│ 📦 Inventory          ▾  │
│    ├ Stock Entries        │
│    ├ Stock Issuances      │
│    └ Stock Requests       │
│ 💰 Expenses           ▾  │
│    ├ All Expenses         │
│    ├ Fixed Expenses       │
│    └ Variable Expenses    │
│ 📈 Revenue               │
│ 📉 Analytics (P&L)       │
│ 📄 Reports               │
├──────────────────────────┤
│ ⚙️  Settings          ▾  │
│    ├ Hotel Profile        │
│    ├ Inventory Masters    │
│    ├ Departments          │
│    ├ Users & Roles        │
│    ├ Role Permissions     │
│    └ Notifications        │
├──────────────────────────┤
│ 🔔 Notifications  [3]    │
│ 👤 My Account            │
│ 🚪 Logout                │
└──────────────────────────┘
```

### 16.2 Top Bar (Web)

```
[☰ Menu]  Grand View Hotel  /  Dashboard        [🔔 3]  [GA ▾ Hotel Admin]
```

### 16.3 Breadcrumbs

```
Settings > Inventory Masters > Categories
Analytics > P&L Dashboard > Monthly View
```

### 16.4 Page Header Pattern

```
[Page Title]                                    [Primary Action Button]
[Subtitle]
─────────────────────────────────────────────────────────────────────
[Filters / Search bar]
[Content Table or Cards]
```

### 16.5 Mobile Bottom Navigation

```
[📊 Dashboard]  [📦 Inventory]  [📋 Requests]  [💰 Expenses]  [⚙️ More]
```

"More" opens a slide-up sheet with: Revenue, Analytics, Reports, Settings.

---

## 17. Mobile-Specific Behaviour

The Hotel Admin uses the React Native app (Expo) for on-the-go access. All features available on mobile except:

**Not available on mobile (web only):**
- Full P&L Analytics Dashboard (mobile shows summary only; full dashboard on web)
- Report generation / export (view history, download links work; generating new exports on web)
- Bulk upload (CSV management is desktop-friendly; mobile shows status of uploads initiated on web)
- Inventory Masters management (category/unit CRUD is an admin-setup task; web preferred)

**Mobile-optimised flows:**
- Dashboard summary cards and trend chart
- Stock entry (single) — common task for Store Manager on mobile; Admin can also add
- Stock request list — view and approve/reject on mobile
- Expense quick-add (variable expenses on the go)
- Notification tray
- User list (view only; create/edit on web)

### 17.1 Offline Consideration (Phase 5)

In Phase 1–4 (online only): If network is unavailable, show "You're offline — data may be outdated" banner. Disable all write actions. Read actions use last cached data (Redux Persist or React Query cache).

---

*End of Hotel Admin Module PRD*
*Cross-reference: Developer PRD Sections 6–13 for full API contracts and data models.*
*Related: Super Admin PRD for hotel creation, subscription management, and password reset flows.*
