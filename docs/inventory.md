# Blizz Books — Inventory Section: Developer Workflow Guide
> Based on PRD v1.2 | For use during frontend & backend implementation

---

## Table of Contents
1. [Overview](#overview)
2. [Role & Permission Matrix](#role--permission-matrix)
3. [Module 1 — Inventory Masters](#module-1--inventory-masters)
4. [Module 2 — Stock Entry (Single)](#module-2--stock-entry-single)
5. [Module 3 — Stock Entry (Bulk Upload)](#module-3--stock-entry-bulk-upload)
6. [Module 4 — Stock Request Workflow](#module-4--stock-request-workflow)
7. [Module 5 — Stock Issuance (Single)](#module-5--stock-issuance-single)
8. [Module 6 — Stock Issuance (Bulk Upload)](#module-6--stock-issuance-bulk-upload)
9. [Module 7 — Receipt Confirmation](#module-7--receipt-confirmation)
10. [Module 8 — Bill Capture: OCR, Camera & Manual Entry](#module-8--bill-capture-ocr-camera--manual-entry)
11. [Status Lifecycle Reference](#status-lifecycle-reference)
12. [Notifications Reference](#notifications-reference)
13. [Validation Rules Cheatsheet](#validation-rules-cheatsheet)
14. [API Endpoints Checklist](#api-endpoints-checklist)
15. [UI States Checklist](#ui-states-checklist)
16. [Edge Cases & Business Rules](#edge-cases--business-rules)
17. [Open Questions (Unresolved)](#open-questions-unresolved)

---

## Overview

The Inventory section is the operational core of Blizz Books. It covers:
- Setting up product categories and units (Inventory Masters)
- Recording stock purchases — one at a time or in bulk via CSV
- Handling department stock requests through a 5-step approval workflow
- Issuing stock to departments — single item or bulk CSV
- Confirming receipt and flagging discrepancies

Every stock entry automatically creates a corresponding purchase expense record. No manual expense entry needed for purchases.

**Tech stack relevant to this section:**
- Frontend: React + Next.js (web), React Native/Expo (mobile)
- Backend: Node.js + NestJS
- DB: PostgreSQL (all queries scoped to `hotel_id`)
- File storage: AWS S3 / Cloudflare R2
- Bulk processing: ExcelJS + Bull Queue (async, prevents HTTP timeouts)
- Push notifications: Firebase Cloud Messaging

---

## Role & Permission Matrix

Every API route must enforce these server-side — not just in the UI.

| Feature | Hotel Admin | Store Manager | Dept Manager | Staff/User |
|---|---|---|---|---|
| View Inventory | ✅ Always | ✅ Always | ✅ Dept only | ⚙️ Configurable |
| Add Stock Entry (Single) | ✅ | ✅ | ❌ | ❌ |
| Bulk Upload — Stock Entry | ✅ | ⚙️ Configurable | ❌ | ❌ |
| Bulk Upload — Stock Issuance | ✅ | ⚙️ Configurable | ❌ | ❌ |
| Approve Stock Requests | ✅ | ✅ | ⚙️ Configurable | ❌ |
| Issue Stock to Department | ✅ | ✅ | ⚙️ Configurable | ❌ |
| Raise Stock Request | ✅ | ⚙️ Configurable | ✅ Always | ✅ Always |
| Mark Stock as Received | ✅ | ❌ | ✅ Always | ✅ Always |
| View Revenue & P&L | ✅ | 🔒 Locked OFF | 🔒 Locked OFF | 🔒 Locked OFF |
| Manage Inventory Masters | ✅ | 🔒 Locked OFF | 🔒 Locked OFF | 🔒 Locked OFF |

**Implementation note:** Role claims are in the JWT. Middleware checks `hotel_id` + role on every request. Feature flags are stored per-role in DB and checked server-side.

---

## Module 1 — Inventory Masters

> Route: `Settings → Inventory Masters`
> Access: Hotel Admin only (all other roles locked out)

Inventory Masters are the controlled vocabulary for the entire platform. They must be set up before any stock entries or requests can be created.

### 1.1 Product Categories

**What it does:** Classifies all inventory items and expense entries for reporting.

**Fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| Category Name | Text | ✅ | e.g. Dairy, Vegetables, Meat & Fish |
| Category Code | Auto-generated | — | Short uppercase: `DAIRY`, `VEG` |
| Description | Text | ❌ | Optional, for staff clarity |
| Status | Active / Archived | — | Default: Active |

**Business rules:**
- Archived categories are hidden from all dropdown selectors in new entries but are retained in historical records
- Category codes are auto-generated from the name — do not let users edit them manually
- Scoped to `hotel_id` — no shared categories across tenants

**UI to build:**
- List view with Active / Archived filter tab
- Create / Edit modal
- Archive action (no delete — soft archive only)
- Category code shown as a read-only badge in the list

---

### 1.2 Units of Measure

**What it does:** Defines how stock quantities are recorded. Referenced by all stock entry, request, and issuance forms.

**Types:**
- **Simple units:** kg, g, L, mL, pcs, pack — shipped as defaults, admin can add more
- **Compound units:** e.g. "Carton of 24 bottles" — admin defines the conversion factor (e.g. 1 Carton = 24 pcs)

**Business rules:**
- Unit name and symbol must be unique within the hotel
- A unit **cannot be deleted** if referenced in any stock entry, request, or expense — archive only
- Compound conversion factors must be positive non-zero numbers
- System ships with default simple units; hotel admin can extend or archive
- Archiving a unit mid-operation is logged and triggers an in-app alert to the Hotel Admin

**UI to build:**
- List of units with type badge (Simple / Compound)
- Create / Edit modal — for compound units, show conversion factor input
- Archive action with warning if the unit is in active use
- Default units clearly marked (e.g. with a "Default" badge, non-deletable)

---

## Module 2 — Stock Entry (Single)

> Route: `Inventory → Add Stock Entry → Single Entry`
> Access: Hotel Admin, Store Manager

### Flow

```
Store Manager opens Add Stock Entry
  → Selects "Single Entry" tab
  → Fills form
  → Submits
  → System saves entry + auto-creates expense record
  → Success toast shown
```

### Form Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| Item Name | Free text | ✅ | Not from a master list — free input |
| Category | Dropdown | ✅ | From active hotel categories only |
| Quantity | Decimal number | ✅ | Must be > 0 |
| Unit | Dropdown | ✅ | From hotel unit masters |
| Purchase Price (per unit) | Decimal | ✅ | Used to auto-compute total |
| Total Amount | Decimal | ✅ | Auto-calculated (qty × price); manually overridable |
| Bill / Invoice No. | Text | ✅ if billed | Required when "Bill Available" is ON |
| Vendor / Supplier | Text | ❌ | Free text or from recent vendor history |
| Purchase Date | Date picker | ✅ | Defaults to today |
| Payment Method | Select | ✅ | Cash / UPI / Online Transfer / Cheque / Card / Credit |
| Reference / UTR | Text | ❌ | Payment-method-specific (e.g. UTR for UPI, cheque no.) |
| Bill Available? | Toggle | — | Default ON; if OFF, marks as unbilled petty purchase |
| Notes / Remarks | Textarea | ❌ | Optional |
| Bill Attachment | File upload | ❌ | Photo of receipt — stored on S3/R2 |

### Validation rules
- Quantity must be a positive number
- Purchase price must be a positive number
- Total Amount: if user overrides the auto-calc, store both computed and overridden values
- If Bill Available = ON, Bill/Invoice No. becomes required
- Category must be an active category for this hotel
- Unit must exist in hotel masters

### What happens on save
1. Stock entry record created in DB (scoped to `hotel_id`)
2. Purchase expense record **automatically created** — no separate step (see §4.4.1 of PRD)
3. Inventory quantity for the item is incremented
4. Audit log entry created: user ID, timestamp, before/after state
5. Success toast shown to user

### UI states to handle
- `idle` — blank form
- `loading` — on submit
- `success` — show toast, clear form or redirect to inventory list
- `error` — show inline field errors, do not clear the form

---

## Module 3 — Stock Entry (Bulk Upload)

> Route: `Inventory → Add Stock Entry → Bulk Upload`
> Access: Hotel Admin (always), Store Manager (configurable feature flag)

### Flow

```
1. User lands on Bulk Upload screen
2. Downloads CSV template
3. Fills CSV offline (one row per purchase item, max 500 rows)
4. Uploads filled CSV
5. System validates every row server-side
6. Validation result screen shown (green valid rows / red error rows)
7. User reviews errors:
     Option A — fix inline on-screen
     Option B — download error report CSV, fix, re-upload
8. User confirms upload
9. System saves all valid rows (partial success mode by default)
10. In-app + email summary notification sent
11. Inventory updated, expense records auto-created for each row
```

### CSV Column Specification

| Column Name | Type | Required | Validation |
|---|---|---|---|
| `item_name` | Text | ✅ | Non-empty |
| `category` | Text | ✅ | Must match an active hotel category (case-insensitive match recommended) |
| `quantity` | Decimal | ✅ | > 0 |
| `unit` | Text | ✅ | Must match a unit name in hotel masters |
| `purchase_price` | Decimal | ✅ | > 0 |
| `total_amount` | Decimal | ❌ | If blank, auto-calculated as qty × price |
| `bill_invoice_no` | Text | ❌ | — |
| `vendor_name` | Text | ❌ | — |
| `purchase_date` | Date | ✅ | Format: `YYYY-MM-DD` |
| `payment_method` | Text | ✅ | Must be one of: `Cash`, `UPI`, `Online Transfer`, `Cheque`, `Card`, `Credit` |
| `reference_no` | Text | ❌ | — |
| `bill_available` | Boolean | ❌ | `TRUE` or `FALSE`; defaults to `TRUE` if blank |
| `notes` | Text | ❌ | — |

### Backend processing architecture
- CSV file is uploaded to S3/R2 **first**, then queued via Bull Queue for async processing
- This prevents HTTP timeouts for large files
- User receives an in-app notification when processing completes — they do not need to wait on the screen
- Processing target: < 30 seconds for a 500-row file

### Partial success mode (default)
- Valid rows are saved; rows with errors are skipped and reported
- An "All or Nothing" strict mode can be toggled per upload (open question — see §16)
- Bulk upload uses **DB transactions per batch** — partial batch failures roll back only the failed rows, not the entire upload

### Template versioning
- If the CSV template schema changes (new required column), old template files are rejected with the message: `"Please re-download the latest template"`
- Embed a template version identifier in the CSV header row

### Audit trail
Each bulk upload creates one **Batch Upload record** in the audit log:
- Uploader user ID
- Timestamp
- Total rows submitted
- Success count
- Failure count
- Link to original file on S3/R2

Individual stock entry records still carry their own audit entries.

**File retention:** Bulk upload CSV files must be retained in cloud storage for 90 days for audit and re-processing.

### Validation result screen — UI requirements
- Show summary: total rows / valid rows / error rows
- Valid rows: green row with a checkmark
- Error rows: red row with specific per-cell error message
  - Example: `"Row 12: unit 'kgs' not found — did you mean 'kg'?"`
- Inline edit option for small fixes
- "Download Error Report" button — generates a CSV of error rows with an added `error_message` column
- "Confirm & Save" button (disabled until user has reviewed)
- "Cancel" button — discards the upload

### UI states to handle
- `idle` — download template prompt
- `uploading` — progress bar
- `validating` — spinner with "Validating rows…"
- `results` — validation result table (green/red rows)
- `confirming` — saving valid rows
- `complete` — summary toast + notification

---

## Module 4 — Stock Request Workflow

> Routes: `Stock Requests → New Request` (Staff/Dept Mgr) | `Stock Requests → Pending` (Store Mgr)
> Access: Raising = Staff, Dept Mgr; Approving/Issuing = Store Mgr, Hotel Admin

This is a **5-step workflow**. Each step has a defined actor, action, and system behaviour.

### Step-by-step

#### Step 1 — Raise Request
**Actor:** Dept User or Dept Manager

**Action:** Submit a new stock request

**Form fields:**

| Field | Required | Notes |
|---|---|---|
| Item Name | ✅ | Search by name or category |
| Unit | ✅ | From hotel unit masters |
| Quantity Required | ✅ | Positive number |
| Urgency | ✅ | Normal / Urgent |
| Notes | ❌ | Optional context for the Store Manager |

**System behaviour:**
- Request created with status → `PENDING`
- Push notification sent to Store Manager immediately
- Requesting user can track status in real-time from their request history screen

---

#### Step 2 — Store Manager Reviews
**Actor:** Store Manager

**Action:** Open the pending request and check stock availability

**System behaviour:**
- Pending requests list shows current available stock level for each requested item inline — Store Manager does not need to navigate away
- Stock level indicator: green (sufficient), amber (low), red (insufficient)

---

#### Step 3 — Approve or Reject
**Actor:** Store Manager

**Action:** Approve (full or partial qty) or Reject with mandatory reason

**Approve path:**
- Store Manager can approve the full requested quantity or a partial quantity
- If partial: system records both the approved quantity AND the original requested quantity
- Status → `APPROVED`
- Push notification sent to the requesting user

**Reject path:**
- Rejection reason is **mandatory** — form cannot submit without it
- Status → `REJECTED`
- Push notification sent to the requesting user with the reason
- Note: re-submit policy is an open question — see §16

---

#### Step 4 — Issue Stock
**Actor:** Store Manager

**Action:** Mark stock as issued once it has been physically handed over

Two paths available:
- **Single issuance** — handled in Module 5 below
- **Bulk issuance** — handled in Module 6 below

**System behaviour (both paths):**
- Status → `ISSUED`
- Inventory quantity decremented
- Issuance record created
- If linked to a request, that request is marked `ISSUED` automatically
- Push notification sent to Dept User / Dept Manager

---

#### Step 5 — Confirm Receipt
**Actor:** Dept User or Dept Manager

**Action:** Mark the issued stock as physically received

**System behaviour:**
- Status → `RECEIVED`
- Audit trail complete: `PENDING → APPROVED → ISSUED → RECEIVED`
- If discrepancy flagged (see Module 7), an additional resolution step is added

---

### Request status state machine

```
PENDING
  ├── → APPROVED  (Store Manager approves)
  │       └── → ISSUED    (Stock physically handed over)
  │               └── → RECEIVED  (Dept confirms receipt)
  └── → REJECTED  (Store Manager rejects with reason)
```

---

## Module 5 — Stock Issuance (Single)

> Route: `Stock Requests → [Approved Request] → Mark as Issued`
> Also: `Inventory → Issue Stock → Single`
> Access: Store Manager, Hotel Admin

### Flow

```
Store Manager opens an approved request
  → Reviews item, quantity, department
  → Clicks "Mark as Issued"
  → Confirms the physical handover
  → System decrements inventory
  → Status → ISSUED
  → Notification sent to Dept User / Manager
```

### What happens on issuance
1. Inventory quantity decremented by issued quantity
2. Issuance record created (linked to request if applicable)
3. Request status updated to `ISSUED`
4. Audit log entry: user, timestamp, item, qty, department
5. Push notification + in-app alert to Dept User / Manager

---

## Module 6 — Stock Issuance (Bulk Upload)

> Route: `Inventory → Issue Stock → Bulk Issuance Upload`
> Also: `Stock Requests → Bulk Fulfil`
> Access: Hotel Admin (always), Store Manager (configurable feature flag)

### Flow

```
1. Store Manager navigates to Bulk Issuance Upload
2. Downloads Issuance CSV template
3. Fills CSV (one row per item-per-department combination)
4. Uploads CSV
5. System validates: stock availability, valid department names, valid units, date format
6. Validation screen shows:
     Green rows — sufficient stock, ready to issue
     Red rows   — stock shortfall (shows current available qty inline)
7. Store Manager reviews:
     Option A — remove/adjust error rows on-screen, then confirm
     Option B — cancel and re-do
8. On confirmation:
     Inventory decremented per valid row
     Issuance records created
     Linked requests (via request_id) marked ISSUED
9. Dept Managers notified per department
10. Store Manager receives summary: X issued / Y skipped
```

### Issuance CSV Column Specification

| Column Name | Type | Required | Validation |
|---|---|---|---|
| `request_id` | Text | ❌ | If linked to an existing approved request; blank = direct issuance |
| `item_name` | Text | ✅ | Must match an existing inventory item |
| `category` | Text | ✅ | Must match an active hotel category |
| `quantity_issued` | Decimal | ✅ | > 0, must not exceed available stock |
| `unit` | Text | ✅ | Must match a unit name in hotel masters |
| `department` | Text | ✅ | Must match an existing department name for this hotel |
| `issue_date` | Date | ✅ | Format: `YYYY-MM-DD` |
| `notes` | Text | ❌ | Optional |

### Stock reservation during validation
- When a bulk issuance file is uploaded and validated, the system **temporarily reserves** the stock quantities to prevent over-issuance from concurrent uploads
- Reservation expires after **10 minutes** if the user does not confirm
- Show a visible countdown timer on the confirmation screen

### What happens on confirmation
1. Inventory decremented for each valid row (uses DB transactions — failed rows rolled back individually)
2. Issuance records created per row
3. Linked requests (if `request_id` provided) marked `ISSUED`
4. Dept Managers receive per-department push notifications
5. Store Manager receives in-app + email summary
6. Batch Issuance audit record created (uploader, timestamp, rows, per-department summary, file link)
7. Individual issuance records carry their own audit entries

### Dept Manager visibility
- Department Managers see batch-issued stock in their department stock log
- Source is shown as "Bulk Issuance Upload" with the batch reference number

### Audit trail (bulk issuance)
Each bulk issuance creates one **Batch Issuance record**:
- Uploader user ID
- Timestamp
- Total rows
- Per-department summary
- Link to source CSV file on S3/R2

---

## Module 7 — Receipt Confirmation & Discrepancy Handling

> Route: `Stock Requests → [Issued Request] → Mark as Received`
> Access: Dept User, Dept Manager

### Happy path (no discrepancy)

```
Dept User opens issued request
  → Clicks "Mark as Received"
  → Status → RECEIVED
  → Audit trail complete
  → In-app confirmation shown
```

### Discrepancy path

```
Dept User opens issued request
  → Physically received quantity ≠ issued quantity
  → Checks "Flag Discrepancy"
  → Enters actual received quantity + notes
  → Submits
  → Status → RECEIVED (with discrepancy flag)
  → Notification sent to Store Manager for resolution
  → Store Manager reviews and logs resolution
```

**Fields for discrepancy:**

| Field | Required | Notes |
|---|---|---|
| Actual Qty Received | ✅ | What was physically received |
| Discrepancy Notes | ✅ | Reason / observation |

**System behaviour:**
- Discrepancy is logged against the issuance record
- Store Manager receives in-app notification
- Discrepancy and its resolution are both stored in the audit trail
- Inventory is NOT automatically adjusted — Store Manager handles the correction manually

---

## Module 8 — Bill Capture: OCR, Camera & Manual Entry (Caretaker / Dept User)

> **Scope:** This module covers ONLY the Dept User / Caretaker raising a stock request by capturing a bill or delivery slip.
> **Actor:** Dept User, Dept Manager (Caretaker role)
> **Destination form:** Stock Requests → New Request
> **Platforms:** Mobile (primary — camera), Web (fallback — file upload)

---

### 8.1 Why This Exists

Caretakers on the floor receive deliveries, check delivery slips or vendor invoices, and need to raise a stock request immediately. Without bill capture, they have to manually type every item name, quantity, and unit — which is slow, error-prone, and a barrier for staff with limited typing ability.

**Goal:** Caretaker photographs the delivery slip → form fills itself → they review and submit. Done in under 60 seconds.

---

### 8.2 The Three Input Modes

All three modes open the **same New Request form**. The difference is only in how the form gets filled.

| Mode | How | When to use |
|---|---|---|
| 📷 **Camera Capture** | Photograph the bill/slip directly in the app | On mobile — most common for floor caretakers |
| 📁 **File Upload** | Upload an existing photo or PDF | Web browser, or photo already in gallery |
| ✏️ **Manual Entry** | Type all fields by hand | No bill available, or OCR fails |

The user always reviews every field before submitting — OCR is a suggestion, never a final value.

---

### 8.3 Entry Point in the UI

```
Stock Requests → New Request
  │
  └── Top of the form shows three options:
        ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
        │  📷 Scan Bill   │  │  📁 Upload Bill  │  │  ✏️ Enter Manually │
        └─────────────────┘  └─────────────────┘  └─────────────────┘
```

- Default highlighted option: **Scan Bill** (primary action, especially on mobile)
- "Enter Manually" is always visible — never hidden or deprioritised
- These three options sit ABOVE the form fields, not inside them

---

### 8.4 Flow — Camera Capture (Mobile, Primary Path)

This is the flow most caretakers will use every day.

```
Caretaker receives a delivery
  │
  ├── Opens Blizz Books mobile app
  ├── Taps: Stock Requests → New Request
  ├── Taps: 📷 Scan Bill
  │
  ├── App requests camera permission (first time only)
  │     → If denied: show explanation + link to device settings
  │
  ├── Camera opens full-screen
  │     → Rectangular frame overlay: "Align the bill within the frame"
  │     → Flash: auto
  │     → Orientation: portrait and landscape both supported
  │
  ├── Caretaker taps shutter button
  │
  ├── Preview screen shown:
  │     ┌──────────────────────────────────┐
  │     │         [Bill preview]           │
  │     │   [ Retake ]    [ Use Photo ]    │
  │     └──────────────────────────────────┘
  │
  ├── Taps "Use Photo"
  │     → Image compressed client-side (target < 1.5 MB)
  │     → Uploaded to S3/R2
  │     → OCR triggered server-side
  │
  ├── Loading state on form: "Reading your bill… ⏳"
  │
  ├── OCR result returns (typically 2–6 seconds)
  │     → Form fields auto-filled
  │     → Confidence highlights shown (see §8.7)
  │     → Bill photo auto-attached — no separate upload needed
  │     → Banner shown: "Bill scanned ✓ — please review the fields below"
  │
  ├── Caretaker reviews every field
  │     → Edits anything wrong
  │     → Fills Urgency (Normal / Urgent) manually
  │     → Adds any extra notes
  │
  └── Taps Submit → request raised → Store Manager notified
```

---

### 8.5 Flow — File Upload (Web / Gallery, Secondary Path)

```
Caretaker opens New Request on web browser (or has photo already in phone gallery)
  │
  ├── Clicks: 📁 Upload Bill
  │
  ├── File picker opens
  │     Accepted formats: JPG, PNG, WEBP, PDF
  │     Max size: 10 MB
  │
  ├── Caretaker selects file
  │     → Thumbnail preview shown immediately
  │     → Upload progress bar displayed
  │
  ├── File uploaded to S3/R2
  ├── OCR triggered server-side
  │
  ├── Same result flow as camera (§8.4 from OCR result onwards)
  │
  └── Caretaker reviews, edits, submits
```

**Web-specific UX:**
- Support drag-and-drop onto the upload zone
- Show file name + size after selection
- For PDFs: show a PDF icon thumbnail (not a blank box)
- If on a web browser with a camera (tablet, laptop): show a "Use Camera" option via `MediaDevices API`; if no camera detected, hide this option entirely — do not show it as disabled

---

### 8.6 Flow — Manual Entry (Fallback)

```
Caretaker opens New Request
  │
  ├── Taps: ✏️ Enter Manually
  │     OR skips scan step entirely
  │
  ├── Form opens blank
  │     → All fields empty, normal placeholders
  │     → No confidence highlights (nothing was scanned)
  │
  ├── Caretaker types all fields manually
  │
  ├── Can still attach a bill photo manually using the attachment field at the bottom
  │
  └── Submits normally
```

Use this when:
- No physical bill exists (verbal order, informal purchase)
- OCR fails or returns garbage results
- Caretaker is more comfortable typing than scanning

---

### 8.7 OCR Field Mapping — What Gets Extracted

The OCR reads the delivery slip / vendor invoice and maps extracted text to the New Request form fields.

| Request Form Field | What OCR looks for on the bill | Expected confidence | Auto-filled? |
|---|---|---|---|
| `item_name` | Line item descriptions / product names | Medium | ✅ Yes |
| `quantity` | Qty / Units / No. column in line items | High (printed bills) | ✅ Yes |
| `unit` | Unit of measure next to quantity (kg, L, pcs, nos) | Medium | ✅ Yes (if printed) |
| `notes` | Vendor name, challan number, delivery remarks | Medium | ✅ Dropped into notes field |
| `urgency` | Cannot be extracted — judgment call | — | ❌ Always manual |

**Fields NOT extracted (always manual):**
- `urgency` — caretaker decides Normal / Urgent based on situation
- `additional_notes` — context for the Store Manager, e.g. "delivery arrived damaged"

**Multi-item delivery slips:**
When the slip has more than one line item, OCR returns multiple items. Handle as follows:
- Show each extracted item as a separate row in a mini-table on the form for the caretaker to review
- Caretaker can delete rows they don't need, or edit quantities
- Do NOT silently pick only the first item — show all of them
- Each confirmed row becomes a separate stock request line (or one request with multiple items, depending on your data model — decide this early)

---

### 8.8 Confidence Indicator System

OCR is not always right. Show the caretaker clearly which fields the system is confident about.

The OCR API returns a confidence score (0.0 → 1.0) per field. Translate this into visible UI cues:

| Score | Background colour | Tooltip shown |
|---|---|---|
| ≥ 0.85 | White (normal) | None — system is confident |
| 0.60 – 0.84 | 🟡 Amber highlight | "Please check this value" |
| < 0.60 | 🔴 Red highlight | "We're not sure about this — please correct it" |
| Not found | Empty field | Placeholder: "Not found — enter manually" |

**UX rules:**
- Show a banner at the top: `"Bill scanned ✓ — review the highlighted fields before submitting"`
- Every field is editable regardless of confidence score — the caretaker always has final say
- When the caretaker edits a highlighted field, **remove the highlight** immediately — they've taken responsibility for that value
- Show a small `OCR` chip/badge next to auto-filled fields so caretakers know which values came from the scan vs. which they typed
- Do not show confidence scores as numbers — only use colour coding

---

### 8.9 OCR Engine Recommendation

| Service | Recommendation | Reason |
|---|---|---|
| **Google Document AI** | ✅ First choice | Handles Indian GST invoices, printed + handwritten text, supports Hindi characters |
| **Mindee** (Receipt/Invoice API) | ✅ Good alternative | Purpose-built for receipts, easy REST API, free tier available, fast setup |
| **AWS Textract** | ⚠️ Acceptable | Better for structured forms/tables; less accurate on handwritten slips |
| **Tesseract (self-hosted)** | ❌ Avoid for production | Free but poor accuracy on low-quality mobile photos and handwritten text |

Start with **Mindee** for speed-to-market (dedicated receipt/invoice model, minimal setup) and migrate to **Google Document AI** if you need Hindi text support or higher accuracy later.

---

### 8.10 Backend Processing Flow

```
1. Caretaker taps "Use Photo" / selects file
2. Client compresses image if needed (mobile: expo-image-manipulator, target < 1.5 MB)
3. Client POST /requests/scan  {image file}
4. Backend:
     a. Uploads image to S3/R2 → gets bill_url
     b. Sends image to OCR service (Mindee / Google Document AI)
     c. OCR returns structured JSON: { fields, confidence_scores }
     d. Backend maps OCR output → request form fields (see §8.7)
     e. Returns to client: { mapped_fields, confidence_scores, bill_url }
5. Client pre-fills form fields with mapped_fields
6. Client applies confidence highlights based on confidence_scores
7. Caretaker reviews and edits
8. Caretaker submits → POST /requests  { form data + bill_url + entry_method: "camera" }
9. Request saved, bill_url attached, Store Manager notified
```

**For slow connections / large PDFs — async flow:**
```
3a. Client POST /requests/scan → receives { job_id } immediately
3b. Client polls GET /bills/:jobId/ocr-result every 2 seconds
3c. Show "Reading your bill…" loading state during poll
3d. When status = "complete", fill the form
3e. If status = "failed" after 15 seconds, fall back to manual entry + show error
```

---

### 8.11 What to Store in the Database

Add these fields to the `stock_requests` table:

| Column | Type | Description |
|---|---|---|
| `bill_image_url` | `text` | S3/R2 URL of the captured bill/photo |
| `entry_method` | `enum` | `camera` / `file_upload` / `manual` |
| `ocr_raw_response` | `jsonb` | Full raw JSON from OCR API — for audit and debugging |
| `ocr_confidence_scores` | `jsonb` | Per-field confidence scores `{ item_name: 0.91, quantity: 0.74, ... }` |
| `ocr_processed_at` | `timestamp` | When OCR completed |

**Why keep `ocr_raw_response`?**
If a caretaker submits a wrong quantity and it causes a stock dispute, you can prove exactly what the OCR read from the bill. Also invaluable for improving extraction quality over time.

---

### 8.12 Error Handling — Every Failure Scenario

**Golden rule: OCR failure must never block the caretaker from raising a request. Always offer manual entry as the exit.**

| Scenario | User-facing message | System behaviour |
|---|---|---|
| Camera permission denied | "Camera access is needed to scan bills. Tap here to allow it in settings." | Link to device settings. Show Upload and Manual options. |
| Image too blurry / unreadable | "We couldn't read this clearly. Try again in better lighting, or enter details manually." | Image still uploaded and stored. Fall back to manual form. |
| File too large (> 10 MB) | "This file is too large (max 10 MB). Please use a smaller image or PDF." | Reject before upload. |
| Unsupported format | "Please use a JPG, PNG, or PDF file." | Reject before upload. |
| OCR timeout (> 10 seconds) | "Scanning is taking longer than expected. Enter details now — we'll update the form when it's ready." | Queue async retry. Notify caretaker when result arrives (in-app). |
| OCR service down | "Bill scanning is unavailable right now. Please enter the details manually." | Log error server-side. Open blank manual form. |
| Partial extraction (some fields missing) | Banner: "We filled what we could — please check the empty fields." | Fill what was found. Leave missing fields blank with placeholder text. |
| All fields extracted but caretaker edits everything | Normal behaviour — no error | OCR badge removed per edited field. |

---

### 8.13 Mobile Implementation Details (React Native / Expo)

```javascript
// Packages needed
expo-camera          // in-app camera
expo-image-picker    // gallery fallback
expo-image-manipulator  // client-side compression before upload

// Camera permission
import { Camera } from 'expo-camera';
const [permission, requestPermission] = Camera.useCameraPermissions();
// Request on first "Scan Bill" tap — not on app launch

// Capture settings
{
  type: CameraType.back,
  flashMode: FlashMode.auto,
  // Do NOT lock aspect ratio — bills come in all shapes
}

// After capture: compress before upload
import * as ImageManipulator from 'expo-image-manipulator';
const compressed = await ImageManipulator.manipulateAsync(
  photo.uri,
  [{ resize: { width: 1600 } }],  // max width 1600px
  { compress: 0.8, format: SaveFormat.JPEG }
);
// Target output: < 1.5 MB — good quality, fast upload

// Gallery option (below camera button)
import * as ImagePicker from 'expo-image-picker';
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  quality: 0.8,
});
```

---

### 8.14 UI States — New Request Form (Bill Capture)

| State | What the caretaker sees |
|---|---|
| `idle` | Three mode buttons: Scan / Upload / Manual. Form below is empty. |
| `camera_open` | Full-screen camera with frame overlay and shutter button. |
| `preview` | Full-screen photo preview with "Retake" and "Use Photo" buttons. |
| `uploading` | Progress bar: "Uploading bill…" Form fields are grayed out / not yet shown. |
| `scanning` | Animated scan effect on bill thumbnail: "Reading your bill… ⏳" |
| `ocr_success` | Form fills with smooth animation. Confidence highlights appear. Banner: "Bill scanned ✓ — review highlighted fields." |
| `ocr_partial` | Form partially filled. Empty fields show placeholder "Not found — enter manually." Yellow banner: "We filled what we could — check the empty fields." |
| `ocr_failed` | Form opens blank. Red toast: "Couldn't read the bill — please enter details manually." |
| `editing` | Normal form interaction. Highlights clear as caretaker edits fields. |
| `submitting` | Submit button shows spinner. Fields disabled. |
| `submitted` | Success screen: "Request raised ✓" + request ID + "Store Manager has been notified." |
| `camera_permission_denied` | Inline message with link to settings. Upload and Manual options shown. |

---

### 8.15 API Endpoints — Bill Capture (Caretaker Flow)

```
POST  /requests/scan
      Body: multipart/form-data { image: File }
      Returns: {
        job_id: string,
        bill_url: string,
        status: "processing" | "complete" | "failed",
        mapped_fields: {
          item_name: string | null,
          quantity: number | null,
          unit: string | null,
          notes: string | null
        },
        confidence_scores: {
          item_name: number,
          quantity: number,
          unit: number,
          notes: number
        }
      }

GET   /bills/:jobId/ocr-result
      Returns: same shape as above (for async polling)

POST  /requests
      Body: {
        item_name, quantity, unit, urgency, notes,
        bill_image_url,
        entry_method: "camera" | "file_upload" | "manual",
        ocr_confidence_scores: { ... }   // pass through from scan result
      }
```

---

### 8.16 Quick Reference — What the Caretaker Always Does vs. Never Does

| Task | Caretaker does this? |
|---|---|
| Photograph the delivery slip | ✅ Yes — primary action |
| Review auto-filled fields | ✅ Yes — always required |
| Set Urgency (Normal / Urgent) | ✅ Yes — always manual |
| Type item name, qty, unit | ✅ Only if OCR missed them |
| Upload a CSV | ❌ Never — that's Store Manager territory |
| Approve or issue stock | ❌ Never — that's Store Manager |
| See P&L or expense data | ❌ Never — locked to Hotel Admin |

---

## Status Lifecycle Reference

### Stock Request statuses

| Status | Meaning | Who sets it |
|---|---|---|
| `PENDING` | Raised, awaiting review | System (on submit) |
| `APPROVED` | Approved (full or partial) | Store Manager |
| `REJECTED` | Rejected with reason | Store Manager |
| `ISSUED` | Stock physically issued | Store Manager (single or bulk) |
| `RECEIVED` | Receipt confirmed by Dept | Dept User / Dept Manager |

### Inventory item states (derived)

| State | Meaning |
|---|---|
| In Stock | Quantity > low-stock threshold |
| Low Stock | Quantity ≤ threshold (configurable per item — open question) |
| Out of Stock | Quantity = 0 |

---

## Notifications Reference

Build these notification triggers into the backend. All push notifications go via Firebase Cloud Messaging.

| Event | Recipient | Channel |
|---|---|---|
| New stock request raised | Store Manager | Push + In-app badge |
| Request approved | Requesting Dept User | Push + In-app |
| Request rejected (with reason) | Requesting Dept User | Push + In-app |
| Stock issued (single or bulk) | Dept User / Dept Manager | Push + In-app |
| Stock marked as received | Store Manager | In-app |
| Discrepancy flagged on receipt | Store Manager | Push + In-app |
| Bulk upload completed (stock entry) | Store Manager | In-app + Email summary |
| Bulk upload completed (issuance) | Store Manager | In-app + Email summary |
| Bulk upload partial failure / errors | Store Manager | In-app + downloadable error report |
| Low stock alert | Store Manager + Hotel Admin | Push + Email |
| Inventory Master change (unit/category archived) | Hotel Admin | In-app |

---

## Validation Rules Cheatsheet

Use this as a reference when writing frontend form validators and backend middleware.

### Numbers
- All quantity and price fields: must be positive, non-zero decimals
- Compound unit conversion factors: positive non-zero number

### Text
- Item names: free text, no master list restriction
- Category: must match an **active** category in `hotel_id` scope
- Unit: must match a unit name in `hotel_id` unit masters
- Department (issuance): must match an existing department in `hotel_id` scope
- Payment method: must be one of `Cash | UPI | Online Transfer | Cheque | Card | Credit`

### Dates
- All date fields: `YYYY-MM-DD` format
- Purchase date and issue date: cannot be in the future (validate server-side)

### CSV
- Max 500 rows per file
- If template version has changed, reject file and prompt re-download
- `bill_available` column: accepts `TRUE`, `FALSE`, or blank (defaults to `TRUE`)
- `payment_method` column: case-insensitive match recommended

### Uniqueness
- Unit names and symbols must be unique within a hotel
- Category codes are auto-generated and unique within a hotel

### Soft deletes only
- No hard deletion of any financial record (stock entries, expenses, issuances)
- Units and categories: archive only, never delete
- Archived items hidden from new entry forms but visible in historical records

---

## API Endpoints Checklist

Use this to plan your backend routes. All routes scoped to authenticated `hotel_id`.

### Inventory Masters
- `GET /masters/categories` — list active categories
- `POST /masters/categories` — create category
- `PUT /masters/categories/:id` — update category
- `PATCH /masters/categories/:id/archive` — archive category
- `GET /masters/units` — list units
- `POST /masters/units` — create unit
- `PUT /masters/units/:id` — update unit
- `PATCH /masters/units/:id/archive` — archive unit

### Stock Entry
- `GET /inventory` — list inventory items (with filters: category, date, vendor)
- `GET /inventory/:itemId` — item drill-down (purchase history, stock balance, price variance)
- `POST /inventory/entry` — single stock entry
- `POST /inventory/entry/bulk/upload` — upload CSV (returns upload job ID)
- `GET /inventory/entry/bulk/:jobId/status` — poll bulk job status
- `GET /inventory/entry/bulk/:jobId/errors` — download error report CSV
- `POST /inventory/entry/bulk/:jobId/confirm` — confirm and save valid rows

### Stock Requests
- `GET /requests` — list requests (filterable by status, dept, urgency)
- `POST /requests` — raise a new request
- `GET /requests/:id` — request detail
- `PATCH /requests/:id/approve` — approve (full or partial qty)
- `PATCH /requests/:id/reject` — reject with reason
- `PATCH /requests/:id/issue` — mark as issued (single)
- `PATCH /requests/:id/receive` — mark as received (with optional discrepancy)

### Stock Issuance (Bulk)
- `POST /issuance/bulk/upload` — upload issuance CSV (returns job ID)
- `GET /issuance/bulk/:jobId/status` — poll job status
- `POST /issuance/bulk/:jobId/confirm` — confirm issuance
- `GET /issuance/bulk/:jobId/errors` — error report

### Bill Capture & OCR
- `POST /bills/upload` — upload bill image/PDF → returns `{ bill_url, job_id }`
- `GET /bills/:jobId/ocr-result` — poll OCR status → returns extracted fields + confidence scores per field
- `POST /inventory/entry/scan` — combined: upload + OCR + return pre-filled stock entry fields in one call
- `POST /requests/scan` — combined: upload + OCR + return pre-filled stock request fields in one call
- `POST /bills/:jobId/attach` — attach a processed bill to an existing entry or request

---

## UI States Checklist

For every screen in the inventory section, handle all of these:

| State | What to show |
|---|---|
| `loading` | Skeleton loader or spinner — never a blank screen |
| `empty` | Empty state illustration + CTA (e.g. "No stock entries yet — Add your first entry") |
| `error` (fetch) | Error message + retry button |
| `error` (form) | Inline field-level errors, form NOT cleared |
| `success` | Toast notification, redirect or form reset as appropriate |
| `no permission` | Disabled button or hidden section — not a 404 |
| `processing` (bulk) | Progress indicator + "You can navigate away — we'll notify you when done" message |
| `partial success` (bulk) | Summary: X saved, Y failed. Link to error report. |
| `scanning` (OCR) | Animated scan line over bill preview + "Reading your bill…" — 2–8 sec typical |
| `ocr_success` | Form fills with highlight animation on auto-filled fields + banner: "Bill scanned — review highlighted fields" |
| `ocr_partial` | Partially filled form, blank fields show placeholder "Not found — enter manually" |
| `ocr_failed` | Toast: "Couldn't read the bill" + form opens blank for manual entry |
| `camera_permission_denied` | Explain why camera is needed + link to device settings to grant permission |

---

## Edge Cases & Business Rules

These are the things that will bite you if you don't handle them upfront.

### Inventory quantity
- Quantity is incremented on every saved stock entry
- Quantity is decremented on every issuance
- Both operations must use **DB transactions** — no partial writes
- Concurrent bulk issuances: use **optimistic locking** on the stock quantity field to prevent over-issuance

### Partial approval
- Store Manager approves 6 kg when 10 kg was requested
- Store the approved quantity separately from the requested quantity
- Show both values in the request detail view
- Issue step works against the approved quantity, not the requested quantity

### Total Amount override
- Auto-calculated as `qty × purchase_price`
- User can manually override the total
- Store both the computed total and the manual override in DB — never lose the original calculation

### Archived category / unit in historical records
- If a category or unit is archived after records exist, those records retain their original category/unit reference
- Historical records display the archived category/unit name with an "Archived" badge

### Bill Available toggle
- When OFF: marks the entry as an unbilled petty purchase
- When ON: Bill/Invoice No. becomes a required field
- Handle this conditional required field in both frontend validation and backend

### Bulk upload — duplicate rows
- The system does not automatically detect duplicate rows in a bulk upload
- Responsibility is on the uploader
- Consider adding a duplicate warning (not a hard block) in the validation results screen

### Stock reservation expiry (bulk issuance)
- Stock is reserved for 10 minutes after validation
- If user does not confirm within 10 minutes, reservation is released
- Show a visible countdown timer
- If timer expires, prompt user to re-validate before confirming

### Expense auto-creation
- Every saved stock entry (single or bulk) automatically creates an expense record
- This must happen in the same DB transaction as the stock entry save
- If the expense creation fails, the stock entry must also roll back

### Audit log
- Every create / update / delete action: log user ID, timestamp, before-state, after-state
- Bulk operations: log at BOTH the batch level AND individual record level
- Soft deletes only — never hard delete financial records

---

## Open Questions (Unresolved)

These are decisions that are **not yet finalised in the PRD**. Do not implement assumptions — confirm with the Product Owner or client first.

| # | Question | Impact on inventory build |
|---|---|---|
| 1 | Should rejected requests be re-submittable (edit + resubmit) or require a fresh request? | Affects request detail UI and workflow state machine |
| 2 | Should low-stock alerts have a fixed threshold or a per-item configurable threshold? | Affects inventory item schema (add `low_stock_threshold` field?) and alert logic |
| 3 | Bulk upload — partial success (default) or All-or-Nothing per upload? | Affects bulk confirm endpoint logic and UI messaging |
| 4 | Should bulk issuance auto-link to existing pending requests, or always create new issuance records? | Affects `request_id` matching logic in issuance CSV processing |
| 5 | Maximum row limit for bulk uploads — currently 500. Needs confirmation based on server capacity and UX testing | Affects file validation, queue sizing, and UI copy |
| 6 | Should Hotel Admin be able to delegate Inventory Master management to Store Manager? | Currently locked to Admin — confirm before building role settings |
| 7 | Is a vendor master list needed, or is free-text vendor name acceptable? | Free-text currently assumed — if a master is needed, add a vendor management module |

---

*Blizz Books PRD v1.2 | Inventory Workflow Developer Guide | Confidential — Internal Use Only*
