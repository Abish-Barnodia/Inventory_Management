# Blizz Books — Finance Module Specification
### Expense · Revenue · Analytics · Reports
**Document:** `finance.md` | **Based on:** PRD v1.2 | **Status:** Engineering-Ready Draft

---

## Table of Contents

1. [Module Overview & Scope](#1-module-overview--scope)
2. [Roles & Access Control](#2-roles--access-control)
3. [P&L Formula & Data Sources](#3-pl-formula--data-sources)
4. [Module 1 — Purchase Expenses (Auto-Captured)](#4-module-1--purchase-expenses-auto-captured)
5. [Module 2 — Fixed Expenses](#5-module-2--fixed-expenses)
6. [Module 3 — Variable / Petty Expenses](#6-module-3--variable--petty-expenses)
7. [Module 4 — POS Sales Integration](#7-module-4--pos-sales-integration)
8. [Module 5 — Revenue & P&L Analytics Dashboard](#8-module-5--revenue--pl-analytics-dashboard)
9. [Module 6 — Reports & Export](#9-module-6--reports--export)
10. [Notifications — Finance Events](#10-notifications--finance-events)
11. [Audit Trail Specification](#11-audit-trail-specification)
12. [Test Cases — Functional](#12-test-cases--functional)
13. [Edge Cases & Boundary Conditions](#13-edge-cases--boundary-conditions)
14. [Non-Functional Requirements](#14-non-functional-requirements)
15. [Open Questions](#15-open-questions)

---

## 1. Module Overview & Scope

The Finance Module is the downstream consumer of all operational data in Blizz Books. It collects, aggregates, and presents every financial event on the platform — from stock purchases to petty cash to POS sales — into a single, coherent profit and loss view.

### 1.1 In Scope (this document)

| Area | Description |
|---|---|
| Purchase Expenses | Auto-created from every stock entry (single + bulk) |
| Fixed Expenses | Monthly recurring costs — rent, salaries, utilities, etc. |
| Variable / Petty Expenses | Ad-hoc cash or digital payments |
| POS Sales Integration | CSV/Excel import from Paid Pooja POS |
| Revenue Ledger | Date-wise gross revenue entries |
| P&L Analytics Dashboard | Daily / Weekly / Monthly / Custom / YTD views |
| Reports & Export | PDF and Excel exports of any P&L range |

### 1.2 Out of Scope (V1.0)

- GST / Tax computation and filing
- Tally / Zoho Books / accounting software integration
- Recipe cost / COGS per dish calculation
- Payroll processing
- Direct POS API integration (Phase 6)
- Multi-branch consolidation
- Bulk upload for Fixed Expenses (manual entry only in V1.0)

### 1.3 Key Principle — No Hardcoded Values

All thresholds, limits, labels, categories, payment methods, currency symbols, date formats, and period definitions must be driven by configuration or database records. No value that a hotel admin or the product team may need to change should be embedded in source code.

---

## 2. Roles & Access Control

### 2.1 Finance Module Permission Matrix

| Feature | Hotel Admin | Store Manager | Dept Manager | Staff |
|---|---|---|---|---|
| View P&L Dashboard | Always ON | OFF (locked) | OFF (locked) | OFF (locked) |
| View Analytics Dashboard | Always ON | OFF (locked) | OFF (locked) | OFF (locked) |
| Add Fixed Expenses | Always ON | Configurable | OFF | OFF |
| Add Variable Expenses | Always ON | Configurable | Configurable | OFF |
| View All Expenses | Always ON | Configurable | OFF | OFF |
| Upload POS Report | Always ON | Configurable | OFF | OFF |
| Export Reports (PDF/Excel) | Always ON | OFF (locked) | OFF (locked) | OFF (locked) |

### 2.2 Access Enforcement Rules

- Permission checks are enforced server-side via role-based middleware on every API route. Frontend visibility of menu items mirrors these permissions but is not the authoritative gate.
- Revenue and P&L data are accessible exclusively to the Hotel Admin role. No feature flag can grant these to any other role. This is a system-enforced lock, not a configurable toggle.
- The Store Manager's ability to add fixed/variable expenses is a configurable flag the Hotel Admin may enable; it is OFF by default.
- A Dept Manager with the variable expense flag enabled can only add expenses for their own department.

---

## 3. P&L Formula & Data Sources

### 3.1 Core Formula

```
Gross Revenue
  (source: POS import — Paid Pooja CSV)

− Purchase Expenses
  (source: auto-created from every stock entry in the period)

− Fixed Expenses
  (source: fixed expense module; prorated if period is a partial month)

− Variable / Petty Expenses
  (source: variable expense module entries)

= Net Profit / Loss
```

### 3.2 Proration Rule for Fixed Expenses

When a query period covers a partial calendar month, the system prorates each fixed expense as follows:

```
prorated_amount = (fixed_expense_monthly_amount / days_in_month) × days_in_period
```

- `days_in_month` is the actual number of days in that calendar month (28, 29, 30, or 31 — not hardcoded to 30).
- `days_in_period` is the count of days within that month that fall inside the selected query range.
- For a full-month query, proration factor = 1 and no division is performed.
- For a multi-month custom range that spans parts of multiple months, each month's fixed expenses are prorated independently.

### 3.3 Period Handling — Timezone

All date comparisons use the hotel's configured timezone, not UTC. A purchase made at 23:55 local time must appear in the P&L for that local date, not the UTC next day.

### 3.4 Currency

Currency symbol and decimal separator are read from the hotel's profile configuration (`currency`, `locale`). INR is the default. No currency symbol or format is hardcoded in calculation or display logic.

---

## 4. Module 1 — Purchase Expenses (Auto-Captured)

### 4.1 Overview

Every stock entry that is saved — whether via single entry or bulk upload — automatically creates a corresponding purchase expense record. There is no manual step to log purchase expenses. Double-entry is prevented by design.

### 4.2 Auto-Creation Trigger

| Trigger Event | Result |
|---|---|
| Single stock entry saved | 1 purchase expense record created |
| Bulk upload confirmed (N valid rows) | N purchase expense records created within the same database transaction as the stock entries |
| Stock entry edited (price or quantity changes) | Corresponding purchase expense record updated with same transaction |
| Stock entry soft-deleted | Corresponding purchase expense record soft-deleted (same timestamp) |

### 4.3 Purchase Expense Record Fields

| Field | Source | Notes |
|---|---|---|
| `hotel_id` | Auth context | Multi-tenant scoping |
| `expense_type` | System-set | Always `PURCHASE` |
| `item_name` | Stock entry | Copied at creation time |
| `category_id` | Stock entry | FK to hotel's category master |
| `quantity` | Stock entry | Numeric |
| `unit_id` | Stock entry | FK to hotel's unit master |
| `unit_price` | Stock entry | Per-unit purchase price |
| `total_amount` | Stock entry | Qty × price, or manually overridden value |
| `vendor` | Stock entry | Free text |
| `purchase_date` | Stock entry | Date in hotel timezone |
| `payment_method` | Stock entry | From allowed payment methods list |
| `payment_reference` | Stock entry | UTR / cheque number / transaction ID |
| `bill_available` | Stock entry | Boolean |
| `invoice_number` | Stock entry | Text |
| `batch_upload_id` | Stock entry | FK to batch record if uploaded via bulk; NULL for single entries |
| `stock_entry_id` | Stock entry | FK — 1-to-1 relationship |
| `created_by` | Auth context | User ID |
| `created_at` | System | Timestamp |
| `updated_at` | System | Timestamp |
| `deleted_at` | System | Soft delete timestamp |

### 4.4 Filtering & Display

The expense list view supports the following filters. All filter values must be driven from dynamic data — no hardcoded option lists in UI components.

| Filter | Type | Source |
|---|---|---|
| Category | Multi-select | Hotel's active + archived categories |
| Vendor | Search/select | Distinct vendors from existing entries |
| Payment Method | Multi-select | Hotel's configured payment methods |
| Date Range | Date picker | Any range; defaults to current month |
| Bill Available | Toggle | Yes / No / All |
| Batch Reference | Search | Auto-populated for bulk-upload entries |

### 4.5 Batch Reference Tagging

- Every purchase expense created via bulk upload carries the `batch_upload_id` of its originating batch.
- The expense list displays a "Bulk" badge on such records.
- Clicking the badge opens the batch detail view (upload timestamp, uploader, row counts).

---

## 5. Module 2 — Fixed Expenses

### 5.1 Overview

Fixed expenses represent monthly recurring costs. They are entered once per month per expense type and can be cloned forward to the next month.

### 5.2 Expense Types

Fixed expense types are not hardcoded. The system ships with a default set, and Hotel Admins may add custom types. The default set includes: Rent, Staff Salaries, Electricity, Water, Gas / Fuel, Equipment EMI, Insurance, Internet / Telephone, and Other.

All types are stored in a `fixed_expense_types` table scoped to the hotel. Defaults are seeded on hotel creation.

### 5.3 Field Specification

**Common fields (all types):**

| Field | Type | Required | Notes |
|---|---|---|---|
| `hotel_id` | UUID | Yes | Scoped automatically |
| `expense_type_id` | FK | Yes | From hotel's type list |
| `month` | Date | Yes | Stored as first day of month (YYYY-MM-01) |
| `amount` | Decimal | Yes | Total monthly amount |
| `payment_method` | Enum | Yes | From configured list |
| `payment_reference` | Text | No | UTR, cheque, bank ref |
| `paid_on` | Date | No | Actual payment date |
| `notes` | Text | No | Free text |
| `attachment_url` | Text | No | Signed URL to uploaded receipt |
| `created_by` | UUID | Yes | User ID |
| `created_at` | Timestamp | Yes | Auto |
| `updated_at` | Timestamp | Yes | Auto |
| `deleted_at` | Timestamp | No | Soft delete |

**Salary-specific additional fields (when type = Salary):**

| Field | Type | Notes |
|---|---|---|
| `staff_name` | Text | Per-employee record |
| `designation` | Text | |
| `gross_salary` | Decimal | |
| `deductions` | Decimal | |
| `net_salary` | Decimal | Computed: gross − deductions |
| `bank_transfer_reference` | Text | |

A single month's salary expense is a parent record (month + total) with child rows (per staff member). The parent `amount` equals the sum of all child `net_salary` values. Mismatches trigger a validation warning (not a hard block — see edge cases).

**Rent-specific additional fields:**

| Field | Type | Notes |
|---|---|---|
| `landlord_name` | Text | |
| `due_date` | Date | |

### 5.4 Monthly Clone

- "Clone to Next Month" copies all fixed expense records from the selected month to the next calendar month.
- Amounts, types, and references are copied. `paid_on` and `payment_reference` are cleared (set to NULL) in the cloned records — they represent new payments not yet made.
- If records already exist for the target month, the system shows a confirmation prompt: "You already have X fixed expenses for [Month Year]. Clone will add new records alongside them. Proceed?"
- Clone operation is atomic: all records are created in a single transaction.

### 5.5 Validation Rules

| Rule | Behaviour |
|---|---|
| `amount` must be > 0 | Hard block on save |
| `month` cannot be in the future by more than 1 calendar month | Warning shown; user may override |
| Duplicate type for same month | Warning shown (not a block — multiple rent entries are valid, e.g. separate premises) |
| Salary total mismatch | Warning: "Sum of employee net salaries (X) does not match total amount (Y)" |
| `gross_salary` must be ≥ `deductions` | Hard block; net salary cannot be negative |

---

## 6. Module 3 — Variable / Petty Expenses

### 6.1 Overview

Variable expenses capture ad-hoc, irregular, often cash-based outflows that do not fit the structured stock-purchase or fixed-expense categories. These are the petty cash bucket.

### 6.2 Field Specification

| Field | Type | Required | Notes |
|---|---|---|---|
| `hotel_id` | UUID | Yes | |
| `description` | Text | Yes | What was purchased/paid for |
| `amount` | Decimal | Yes | Must be > 0 |
| `category_id` | FK | Yes | From hotel's expense categories |
| `expense_date` | Date | Yes | Defaults to today |
| `payment_method` | Enum | Yes | From configured list |
| `payment_reference` | Text | No | |
| `bill_available` | Boolean | Yes | Defaults to true |
| `invoice_number` | Text | No | Required if bill_available = true |
| `attachment_url` | Text | No | Receipt photo |
| `department_id` | FK | No | Optionally tag to a department |
| `notes` | Text | No | |
| `created_by` | UUID | Yes | |
| `created_at` | Timestamp | Yes | |

### 6.3 Filtering

Same filter dimensions as purchase expenses: category, department, payment method, date range, bill available status.

### 6.4 Permissions Nuance

- A Dept Manager with variable expense flag ON may only add expenses for their own department. If `department_id` is not provided, it defaults to their department.
- They may only view their own submitted entries — not the full hotel petty expense list.
- Hotel Admin and Store Manager (if flag enabled) see all entries across all departments.

---

## 7. Module 4 — POS Sales Integration

### 7.1 Overview

Phase 1 uses file-based import. The Hotel Admin exports a report from the Paid Pooja POS system and uploads it to Blizz Books to populate the revenue ledger.

### 7.2 Supported File Formats

- CSV (comma-separated, UTF-8 encoded)
- Excel (.xlsx)

The exact column specification of the Paid Pooja export is an open question (see Section 15). The parser must be configurable — column names and positions must be driven by a mapping configuration, not hardcoded.

### 7.3 Upload Flow

**Step 1 — Select File**
User navigates to Revenue → Import POS Report and selects a file. Accepted extensions: `.csv`, `.xlsx`. Max file size driven by configuration (default: 10 MB).

**Step 2 — Preview**
System parses the file and shows a preview table:
- Date column
- Gross sales figure per date
- Row count
- Total revenue in the file
- Date range detected (min date → max date)

**Step 3 — Conflict Detection**
Before confirmation, the system checks for existing revenue records in the same date range:
- If no overlap: proceed directly.
- If overlap: show warning — "You already have revenue data for [N] dates in this range. Uploading will overwrite those entries. A change log will be created."

**Step 4 — Confirm**
On confirmation, revenue records are upserted (insert or overwrite) per date. A change log entry is written for every date where an overwrite occurred (old value, new value, uploader, timestamp).

**Step 5 — Notification**
In-app notification confirms: "POS report uploaded successfully. [N] dates imported. Total revenue: [amount]."

### 7.4 Revenue Record Structure

| Field | Type | Notes |
|---|---|---|
| `hotel_id` | UUID | |
| `sale_date` | Date | One record per date |
| `gross_revenue` | Decimal | From POS import |
| `source` | Enum | `POS_IMPORT` (future: `API_SYNC`) |
| `import_batch_id` | UUID | FK to upload batch record |
| `created_at` | Timestamp | |
| `updated_at` | Timestamp | On overwrite |

### 7.5 Overwrite & Change Log

Every overwrite of a revenue record creates a `revenue_change_log` entry:

| Field | Type |
|---|---|
| `sale_date` | Date |
| `old_gross_revenue` | Decimal |
| `new_gross_revenue` | Decimal |
| `changed_by` | UUID |
| `changed_at` | Timestamp |
| `old_import_batch_id` | UUID |
| `new_import_batch_id` | UUID |

### 7.6 Parsing Rules

- Dates in the source file may appear in multiple formats (DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, etc.). The parser must normalise all detected formats. If a date cannot be parsed, that row is flagged as an error in the preview with the raw value shown.
- Gross revenue values may contain currency symbols (₹, Rs., INR) and comma separators. These must be stripped before parsing.
- Empty rows and header rows are skipped automatically.
- If the file contains multiple sheets (XLSX), the system uses the first sheet unless a sheet name mapping is configured.

---

## 8. Module 5 — Revenue & P&L Analytics Dashboard

### 8.1 Access

Exclusive to Hotel Admin. All API routes for this module return 403 for any other role regardless of frontend state.

### 8.2 Dashboard Views

| View | Period Covered | Default on Load |
|---|---|---|
| Daily | Single selected date | Yesterday |
| Weekly | 7-day rolling window ending on selected date | Current week (Mon–Sun based on hotel locale) |
| Monthly | Full calendar month selected | Current month |
| Custom Range | Admin-defined start and end dates | Last 30 days |
| Year to Date | Jan 1 of current year to today | Always current year |

The "current week" definition (Monday-start vs Sunday-start) is derived from the hotel's locale configuration, not hardcoded.

### 8.3 P&L Dashboard Metrics (All Views)

Every view exposes the following computed metrics:

| Metric | Formula | Notes |
|---|---|---|
| Gross Revenue | Sum of `gross_revenue` in period | From revenue ledger |
| Purchase Expenses | Sum of `total_amount` from purchase expenses in period | |
| Fixed Expenses | Sum of prorated fixed expenses in period | See Section 3.2 |
| Variable / Petty Expenses | Sum of `amount` from variable expenses in period | |
| Total Expenses | Purchase + Fixed + Variable | |
| Net Profit / Loss | Gross Revenue − Total Expenses | Negative = Loss |
| Profit Margin % | (Net Profit / Gross Revenue) × 100 | NULL if Gross Revenue = 0 |
| Cost Ratio % | (Total Expenses / Gross Revenue) × 100 | NULL if Gross Revenue = 0 |

### 8.4 Daily View

- Single date P&L summary card showing all metrics above.
- Expense breakdown by type (Purchase / Fixed / Variable) as a horizontal stacked bar or donut chart.
- List of individual expense entries for that date, grouped by type, with drill-down to detail.
- Revenue source shown (POS import reference).
- If no revenue data exists for the selected date: show zero revenue with an info message — "No POS data imported for this date." Do not suppress expense data.

### 8.5 Weekly View

- 7-day breakdown.
- Bar chart: day-wise gross revenue vs total expenses (two bars per day).
- Summary row at bottom: week totals for revenue, expenses, and net P&L.
- Highlight best day (highest net profit) and worst day (highest net loss or lowest profit) with distinct visual markers.
- Week navigation: Previous Week / Next Week buttons. Future weeks are disabled.

### 8.6 Monthly View

- Full calendar month.
- Week-wise rollup table (Week 1, Week 2, Week 3, Week 4, and partial Week 5 if applicable).
- Expense split: fixed (total for month) vs variable (total for month) vs purchase (total for month).
- Month-over-month comparison card: current month vs previous month for each metric (delta and percentage change).
- If viewing a partial current month: clearly label totals as "Month to date (DD Mon YYYY)".

### 8.7 Custom Range View

- Admin selects any start date and end date via date picker.
- Maximum range: driven by configuration (default: 366 days). An attempt to exceed this shows an inline error — "Range too large. Maximum supported range is [N] days."
- Full P&L breakdown for the range.
- If the range spans multiple calendar months, fixed expenses are prorated per month as per Section 3.2.
- Exportable as PDF or Excel (see Section 9).

### 8.8 Year-to-Date View

- Fixed period: January 1 of the current year to today.
- Monthly trend line chart: 12 data points, Jan–Dec. Future months are shown as empty (no bars/lines).
- Highlights: highest revenue month, lowest net loss month.
- Running P&L trend line showing cumulative profit/loss month by month.

### 8.9 Expense Drill-Down

From any dashboard view, clicking on an expense category or total opens a drill-down panel:
- Filtered list of all expense records contributing to that number.
- Grouped by sub-type (e.g., Purchase → by category; Fixed → by expense type; Variable → by category).
- Sortable by date, amount, vendor.
- Individual record links to full detail view.

### 8.10 Stock Cost Analytics (Phase 4 Sub-Feature)

Within the P&L dashboard, a "Stock Costs" tab provides:
- Top N categories by total spend in the period (N is configurable, default 10).
- Price variance per item: average purchase price this period vs previous period.
- Department consumption breakdown: which departments consumed how much stock value.
- Payment method audit: split of cash vs UPI vs bank transfer for purchases.

---

## 9. Module 6 — Reports & Export

### 9.1 Overview

The Hotel Admin can export any P&L view as a structured file. Export formats are PDF and Excel (XLSX). Both formats must contain identical data — no information should be present in one and absent from the other.

### 9.2 Export Entry Points

| Entry Point | Default Filename Pattern | Notes |
|---|---|---|
| Daily P&L Export | `blizzbooks_pl_YYYY-MM-DD.{ext}` | Single date |
| Weekly P&L Export | `blizzbooks_pl_week_YYYY-MM-DD.{ext}` | Week ending date |
| Monthly P&L Export | `blizzbooks_pl_YYYY-MM.{ext}` | Month |
| Custom Range Export | `blizzbooks_pl_YYYY-MM-DD_to_YYYY-MM-DD.{ext}` | Range |
| YTD Export | `blizzbooks_pl_ytd_YYYY.{ext}` | Current year |

Filename patterns use the hotel's configured timezone for date computation. `{ext}` is replaced by `pdf` or `xlsx`.

### 9.3 Report Content Specification

Every export must include the following sections in order:

**Cover / Header Section**
- Hotel name, address, logo (if configured)
- Report type and date range
- Currency
- Generated by (user name) and generated at (timestamp in hotel timezone)
- "Confidential — Internal Use Only" label

**P&L Summary Table**

| Line Item | Amount | % of Revenue |
|---|---|---|
| Gross Revenue | | — |
| Purchase Expenses | | |
| Fixed Expenses | | |
| Variable / Petty Expenses | | |
| Total Expenses | | |
| Net Profit / Loss | | |

**Expense Breakdown Tables**
- Purchase Expenses: date, item, category, vendor, quantity, unit, amount, payment method
- Fixed Expenses: type, month, amount, payment method, paid on
- Variable / Petty Expenses: date, description, category, amount, payment method

**Revenue Detail**
- Date-wise list of gross revenue entries with source reference

**Footer**
- Page numbers (Page N of M)
- Report generation timestamp
- Blizz Books version (from configuration)

### 9.4 Excel-Specific Requirements

- Each section is a separate worksheet tab.
- Tab names: "Summary", "Purchase Expenses", "Fixed Expenses", "Variable Expenses", "Revenue"
- Row 1 of each sheet is a header row (bold, background colour driven by hotel's theme configuration or a default neutral colour — not hardcoded).
- Number formats: currency columns formatted as locale-appropriate number with 2 decimal places. Date columns formatted as DD/MM/YYYY.
- No merged cells in data sheets (only in the Summary header section).
- AutoFilter enabled on all data sheets.

### 9.5 PDF-Specific Requirements

- A4 portrait orientation.
- Page break before each major section.
- Tables formatted with alternating row shading using the hotel's theme colours or a neutral default.
- Charts from the dashboard are embedded as images in the PDF.

### 9.6 Export Processing

- Exports are generated asynchronously (queued job) to avoid HTTP timeouts for large datasets.
- User receives an in-app notification with a download link when the file is ready.
- Download links are signed URLs valid for a configurable duration (default: 24 hours).
- Generated files are retained in cloud storage for a configurable retention period (default: 30 days).

---

## 10. Notifications — Finance Events

| Event | Recipient | Channel | Trigger |
|---|---|---|---|
| POS report uploaded successfully | Hotel Admin | In-app | Upload confirmed |
| POS report parse error | Hotel Admin | In-app | File cannot be parsed |
| POS revenue overwrite | Hotel Admin | In-app | Existing dates overwritten |
| Fixed expense cloned to next month | Hotel Admin | In-app | Clone confirmed |
| Report export ready | Hotel Admin | In-app | Async export job complete |
| Report export failed | Hotel Admin | In-app + email | Job failure |
| Subscription expiry warning | Hotel Admin | Email | 30, 15, and 3 days before expiry |

Notification trigger timing and channel (in-app only vs in-app + email) must be configurable per event type. No notification triggers are hardcoded.

---

## 11. Audit Trail Specification

### 11.1 Events Logged (Finance Scope)

| Event | Fields Logged |
|---|---|
| Purchase expense auto-created | `expense_id`, `stock_entry_id`, `batch_upload_id` (if applicable), `user_id`, `timestamp`, full record snapshot |
| Purchase expense updated | Before-state, after-state, `user_id`, `timestamp`, changed fields |
| Purchase expense soft-deleted | `expense_id`, `user_id`, `timestamp` |
| Fixed expense created | Full record snapshot, `user_id`, `timestamp` |
| Fixed expense updated | Before + after, changed fields |
| Fixed expense cloned | Source month, target month, N records cloned, `user_id`, `timestamp` |
| Variable expense created | Full record snapshot |
| Variable expense updated | Before + after |
| POS report uploaded | `import_batch_id`, filename, row count, date range, `user_id`, `timestamp` |
| Revenue record overwritten | `sale_date`, old value, new value, old batch ref, new batch ref |
| Report exported | Report type, date range, format, `user_id`, `timestamp`, download URL |

### 11.2 Audit Log Retention

Audit log records are never hard-deleted. Retention period is driven by configuration (default: 7 years for financial records).

---

## 12. Test Cases — Functional

### TC-F-001: Purchase Expense Auto-Creation (Single Entry)

**Given** a Store Manager saves a single stock entry for "Tomatoes, 10 kg @ ₹50/kg"
**When** the entry is saved
**Then:**
- One `purchase_expense` record is created with `total_amount = 500.00`
- `expense_type = PURCHASE`
- `batch_upload_id = NULL`
- `stock_entry_id` matches the new entry
- No separate user action is required

---

### TC-F-002: Purchase Expense Auto-Creation (Bulk Upload, N Valid Rows)

**Given** a bulk upload CSV with 25 valid stock entry rows
**When** the upload is confirmed
**Then:**
- All 25 stock entries and all 25 corresponding purchase expense records are created within a single database transaction
- All 25 expense records carry the same `batch_upload_id`
- If any insert in the transaction fails, the entire transaction is rolled back (0 entries, 0 expenses)

---

### TC-F-003: Purchase Expense Update on Stock Entry Edit

**Given** an existing stock entry with `unit_price = 50.00` and `quantity = 10`
**When** the unit price is updated to `60.00`
**Then:**
- The linked `purchase_expense.total_amount` updates from `500.00` to `600.00`
- An audit log entry records the before and after state for both the stock entry and the expense record

---

### TC-F-004: Purchase Expense Soft-Delete on Stock Entry Delete

**Given** an existing stock entry with a linked purchase expense record
**When** the stock entry is soft-deleted
**Then:**
- The linked `purchase_expense.deleted_at` is set to the same timestamp
- The record no longer appears in expense lists or P&L calculations
- The record is retrievable in audit view

---

### TC-F-005: Fixed Expense — Salary Total Validation

**Given** a salary fixed expense with 3 staff entries: net salaries of 10000, 12000, and 15000
**When** the Hotel Admin sets the parent `amount = 40000` (which is 3000 more than the sum)
**Then:**
- A warning is shown: "Sum of employee net salaries (₹37,000) does not match total amount entered (₹40,000)."
- The Admin may still save (soft block, not hard block)
- The parent `amount` is stored as entered (40000); the discrepancy is noted in the audit log

---

### TC-F-006: Fixed Expense — Clone to Next Month (No Conflicts)

**Given** fixed expense records for May 2026 with 5 entries (rent, electricity, water, internet, salary)
**When** the Admin clicks "Clone to Next Month"
**Then:**
- 5 new records are created for June 2026
- `amount` values are copied
- `paid_on` and `payment_reference` are NULL on all cloned records
- All 5 are created in a single atomic transaction

---

### TC-F-007: Fixed Expense — Clone to Next Month (Conflicts)

**Given** fixed expenses for May 2026 and also existing records for June 2026 (2 entries)
**When** the Admin clicks "Clone to Next Month"
**Then:**
- System shows a confirmation: "You already have 2 fixed expenses for June 2026. Clone will add new records alongside them. Proceed?"
- If confirmed: 5 new records added; existing 2 remain untouched
- If cancelled: no records created

---

### TC-F-008: POS Import — New Dates, No Conflict

**Given** a POS CSV file with revenue data for 7 dates, none of which exist in the ledger
**When** the Admin uploads and confirms
**Then:**
- 7 revenue records are created
- Preview shows correct date range, row count, and total revenue
- In-app notification is sent

---

### TC-F-009: POS Import — Overwrite Existing Dates

**Given** existing revenue records for 3 dates in the current month
**And** a new POS CSV covering the same 3 dates plus 4 new dates
**When** the Admin uploads and confirms
**Then:**
- 3 existing records are overwritten; 3 change log entries are created
- 4 new records are inserted
- Total: 7 current revenue records, 3 change log entries

---

### TC-F-010: P&L Calculation — Daily View

**Given** on a selected date:
- Gross Revenue = ₹15,000
- Purchase Expenses = ₹4,500
- Fixed Expenses (prorated for that day) = ₹833.33 (monthly ₹25,000 / 30 days)
- Variable Expenses = ₹200

**When** the Admin views the daily P&L
**Then:**
- Total Expenses = ₹5,533.33
- Net Profit = ₹9,466.67
- Profit Margin % = 63.11%
- All figures match these exact calculations

---

### TC-F-011: P&L Calculation — Partial Month (Custom Range)

**Given** a custom range of May 15–May 31, 2026 (17 days)
**And** monthly fixed expenses totalling ₹60,000
**When** the Admin views the P&L for this range
**Then:**
- Fixed expense contribution = (60,000 / 31) × 17 = ₹32,903.23
- May has 31 days (not hardcoded as 30)
- All other expenses in the period are summed normally

---

### TC-F-012: P&L — Zero Revenue Days

**Given** a week in which revenue data exists for 5 days but not 2 days (no POS import for those days)
**When** the Admin views the weekly P&L
**Then:**
- The 2 missing days show revenue = 0 on the chart (not hidden)
- An info indicator marks those dates as "No POS data"
- Expense data for those days is still displayed

---

### TC-F-013: Report Export — Custom Range PDF

**Given** a custom range selected as April 1–April 30, 2026
**When** the Admin requests a PDF export
**Then:**
- The export job is queued asynchronously
- A "Preparing your report…" UI state is shown
- On completion, an in-app notification with a download link is sent
- The downloaded PDF contains all 5 required sections (Cover, P&L Summary, Expense Breakdowns, Revenue Detail, Footer)
- Page numbers are present on all pages
- File is accessible via the signed URL for the configured validity period

---

### TC-F-014: Variable Expense — Dept Manager Scope Enforcement

**Given** a Dept Manager for the "Main Kitchen" department has the variable expense flag enabled
**When** they add a variable expense without specifying a department
**Then:**
- `department_id` defaults to "Main Kitchen"
- The expense is visible to Hotel Admin and Store Manager (if flag enabled)
- The Dept Manager can only view their own department's variable expenses, not hotel-wide

---

### TC-F-015: Profit Margin — Zero Revenue Guard

**Given** a date with no revenue data (gross revenue = 0)
**And** purchase expenses of ₹2,000 on that date
**When** the P&L is computed
**Then:**
- Net Profit = −₹2,000 (loss)
- Profit Margin % = NULL (displayed as "—" or "N/A", not as 0% or as a division-by-zero error)
- Cost Ratio % = NULL for the same reason

---

## 13. Edge Cases & Boundary Conditions

### 13.1 Expense Module

| Scenario | Expected Behaviour |
|---|---|
| Stock entry created in timezone UTC+5:30 at 23:58 local time | Expense `purchase_date` is the local date, not the UTC next day |
| Stock entry `total_amount` manually overridden | Expense record stores the overridden value; audit log records both the auto-calculated and overridden values |
| Bulk upload with 0 valid rows after validation | No expense records created; no batch record created; user shown error summary |
| Bulk upload partial success: 480 valid, 20 error rows | 480 expense records and 480 stock entries created; 20 rows skipped; audit batch record shows 480 success, 20 failure |
| Two users simultaneously confirm bulk uploads that together exceed available stock | Optimistic locking prevents double-issuance; second confirmation receives a conflict error |
| Fixed expense `amount = 0` | Hard block on save: "Amount must be greater than zero." |
| Fixed expense for a future month (> 1 month ahead) | Warning: "You are entering an expense for [Month Year], which is in the future." User may proceed. |
| Variable expense `bill_available = true` but `invoice_number` is blank | Warning shown; not a hard block (some bills may not have numbers) |
| Category archived mid-month while expenses reference it | Archived categories remain visible in existing expense records and historical filters; they are hidden from new-entry dropdowns only |
| Payment method removed from hotel configuration | Existing expenses retain the old method label; it is hidden from new-entry dropdowns |

### 13.2 POS Import

| Scenario | Expected Behaviour |
|---|---|
| File contains a date column with mixed date formats (some DD/MM/YYYY, some YYYY-MM-DD) | Parser normalises all parseable formats; unparseable rows shown as errors in preview |
| File is uploaded a second time for the same date range | Conflict warning shown; overwrite on confirmation; change log created for each overwritten date |
| File with all zero or blank revenue values | Preview shows total = 0; user may confirm; no import is blocked solely because revenue is zero |
| File larger than configured maximum | Rejected before parsing with a clear error: "File exceeds maximum size of [N] MB." |
| XLSX file with multiple sheets | First sheet is parsed; a note in the preview reads "Using sheet: [sheet name]." |
| CSV with BOM (byte-order mark) | Parser strips BOM before processing |
| Revenue file for a month that has no expense data | Imported normally; P&L will show positive net figure since expenses = 0 |
| Partial month upload (only 15 of 31 days) | Only the uploaded dates are updated; remaining dates in the month retain their existing values |
| Admin uploads the same file twice in quick succession | Second upload is idempotent: same data upserted; change log entries created only where values differ |

### 13.3 P&L Dashboard

| Scenario | Expected Behaviour |
|---|---|
| Selected date range has no data at all (no revenue, no expenses) | Dashboard shows all zeros; no error; informational message: "No data found for this period." |
| Month with 29 days (February, leap year) | Fixed expense proration uses 29 as denominator — `days_in_month` is computed from the calendar, not a constant |
| YTD view on January 1 (first day of year) | Shows single-day data; monthly trend shows 1 bar for January |
| Custom range spanning exactly 1 day | Behaves identically to Daily view |
| Negative net profit (loss scenario) | Net P&L displayed in red with negative sign; Profit Margin shown as negative % |
| Gross Revenue > 0 but Total Expenses = 0 | Profit Margin % = 100%; Cost Ratio % = 0% — both valid, no division guard needed |
| Hotel has no fixed expenses configured for a period | Fixed expense line = 0 in P&L; no error |
| Dashboard query for 12 months | Must complete in < 2 seconds per NFR; cached results used where valid |
| Concurrent admin sessions viewing the same dashboard | Each session computes independently; no shared mutable state in the dashboard layer |

### 13.4 Reports & Export

| Scenario | Expected Behaviour |
|---|---|
| Export requested for a range with no data | File is generated with header and zero-value summary; not rejected |
| Export job fails (e.g. storage unavailable) | In-app + email notification: "Your report could not be generated. Please try again." Retry option shown. |
| Download link accessed after expiry | Returns 403 with user-facing message: "This link has expired. Please regenerate the report from the dashboard." |
| Admin generates 5 export jobs in rapid succession | All 5 are queued; each completes independently; no deduplication unless explicitly requested |
| Very large dataset (e.g., full year with daily detail) | Processed asynchronously; user not blocked; progress indicator shown; completion notification sent |
| PDF contains a hotel logo that is unavailable (broken URL) | Logo cell is left blank; rest of the report generates normally; no crash |
| Excel export opened in older Excel version (pre-2007) | XLSX format is inherently incompatible with .xls; if a .xls export is needed, it is a separate feature request (out of scope V1.0) |

### 13.5 Role & Permission Edge Cases

| Scenario | Expected Behaviour |
|---|---|
| Store Manager with variable expense flag ON adds an expense without selecting a department | Allowed; `department_id` is NULL — hotel-level petty expense |
| Hotel Admin role P&L API hit by a Store Manager JWT | API returns 403 regardless of feature flags |
| Feature flag for variable expense toggled OFF while a Dept Manager is mid-entry | On save, server re-checks permission and returns 403; client shows: "Your access to this feature has changed. Please refresh." |
| Hotel Admin views a deleted (soft-deleted) expense in audit trail | Record visible in audit log view with `deleted_at` timestamp; not included in P&L calculations |

---

## 14. Non-Functional Requirements

### 14.1 Performance

| Metric | Target | Notes |
|---|---|---|
| P&L dashboard query (up to 12 months) | < 2 seconds | Requires query caching (Redis) |
| Expense list load (up to 10,000 records) | < 1 second | Paginated; cursor-based for large sets |
| POS import file parsing (up to 10 MB) | < 5 seconds for preview | Async; no HTTP timeout risk |
| Report export generation (full year) | < 60 seconds | Async queue; user notified on completion |
| API 95th percentile response | < 500 ms | For all finance API routes |

### 14.2 Data Integrity

- All multi-table writes (stock entry + expense creation, bulk upload + expense batch) use database transactions. Partial writes are not permitted.
- All financial records use soft deletes only. Hard deletion of any expense, revenue, or P&L record is not permitted at any role level.
- Currency arithmetic is performed using `DECIMAL(15,4)` precision in the database. Rounding to 2 decimal places occurs only at the display and export layer.
- Optimistic locking is applied to concurrent stock quantity updates.

### 14.3 Security

- All finance API routes require valid JWT and explicit role check.
- Revenue and P&L routes return 403 for non-Admin roles — not 404.
- Exported files stored with signed URLs (not public).
- Audit log records are immutable — no update or delete operation is permitted on audit records.

### 14.4 Accuracy Checklist (No Hardcoded Values)

The following must never appear as hardcoded values in source code:

| Item | Must Be Driven By |
|---|---|
| Currency symbol (₹) | Hotel profile `currency` + `locale` |
| Days in a month (30) | Calendar computation from `date_trunc` or equivalent |
| Week start day (Monday) | Hotel `locale` configuration |
| Maximum export range (366 days) | Application configuration / feature flag |
| File size limit | Application configuration |
| Download link expiry (24 hours) | Application configuration |
| Report file retention (30 days) | Application configuration |
| Audit log retention (7 years) | Application configuration |
| Low-stock alert threshold | Per-item configuration (open question — see Section 15) |
| Default expense types (Rent, Salary, …) | Database seed; admin can add/edit |
| Subscription expiry warning days (30/15/3) | Application configuration |

---

## 15. Open Questions

| # | Question | Owner | Notes |
|---|---|---|---|
| OQ-F-001 | What is the exact column specification of the Paid Pooja POS CSV/Excel export? | Client / Paid Pooja vendor | Required before Phase 4 POS parser build. Parser mapping must be configurable. |
| OQ-F-002 | Should low-stock alerts have a fixed threshold or a per-item configurable threshold? | Product Owner | Per-item recommended for accuracy. |
| OQ-F-003 | Should the Store Manager be able to add fixed and variable expenses by default, or is that admin-only unless explicitly toggled? | Product Owner | Feature flag exists; policy on default state is unclear. |
| OQ-F-004 | Should exported reports include gross salary and deduction detail per employee, or only the net salary total? | Product Owner | Payroll sensitivity — may require a separate permission. |
| OQ-F-005 | What report formats does the Hotel Admin need — PDF, Excel, or both? | Client | Both assumed; confirm. |
| OQ-F-006 | Should variable expenses support attaching multiple photos (e.g. multiple receipts for one entry)? | Product Owner | Single attachment assumed in V1.0. |
| OQ-F-007 | Is there a need for expense approval workflow (variable expenses above a certain amount require Admin approval)? | Product Owner | Not in current spec; may arise from hotel operations feedback. |
| OQ-F-008 | For the custom range export, should very large reports (> N records) trigger an automatic email delivery instead of in-app only? | Product Owner | Large export threshold to be defined. |

---

*End of finance.md — Blizz Books PRD v1.2 Finance Module Specification*

*Document generated: 24 May 2026 | Based on: BlizzBooks_PRD_v1_2 | Scope: Expense · Revenue · Analytics · Reports*
