# Blizz Books — Super Admin Module
**Complete Build Reference**
Version: v1.2-dev | Platform: Web Only | Date: 19 May 2026

---

## Who Is the Super Admin?

The Super Admin is the software company (you, the developer, or your ops team). There is **one** Super Admin account for the entire platform. They operate exclusively via a web panel — no mobile app. They have no `hotel_id` in their JWT; they operate across all hotels.

The Super Admin panel is **never visible to hotels** — it's a separate URL/subdomain (e.g. `admin.blizzbooks.io`).

---

## Table of Contents

1. [Access & Authentication](#1-access--authentication)
2. [Dashboard — Platform Overview](#2-dashboard--platform-overview)
3. [Hotel Management](#3-hotel-management)
4. [Subscription Management](#4-subscription-management)
5. [Hotel Admin Password Reset](#5-hotel-admin-password-reset)
6. [Global Configuration](#6-global-configuration)
7. [Platform Metrics](#7-platform-metrics)
8. [Audit & Activity Log](#8-audit--activity-log)
9. [API Reference — Super Admin](#9-api-reference--super-admin)
10. [UI States & Edge Cases](#10-ui-states--edge-cases)
11. [Navigation & Layout](#11-navigation--layout)
12. [Security Rules](#12-security-rules)

---

## 1. Access & Authentication

### 1.1 Login

- **URL:** `admin.blizzbooks.io/login` (separate subdomain from main app)
- Super Admin account is seeded directly in the database during deployment — no self-registration
- Uses the same JWT + Refresh Token system as the main app
- JWT payload: `{ sub: user_id, role: "super_admin", hotel_id: null }`
- Session: Access token 15 min, Refresh token 7 days
- After 5 failed login attempts: lock account for 15 minutes, send alert email to a pre-configured ops email

### 1.2 First Login

- Temporary password set during deployment via environment variable `SUPER_ADMIN_TEMP_PASSWORD`
- On first login, forced to change password before accessing anything
- Password requirements: min 12 chars, at least 1 uppercase, 1 number, 1 special character

### 1.3 Session Behaviour

- Idle timeout: 2 hours (shorter than hotel users due to sensitive platform access)
- On timeout: clear tokens, redirect to login with "Session expired" message
- No "remember me" option — always requires re-login after timeout

### 1.4 What Super Admin Can NOT Do

- Cannot access or view any hotel's financial data (revenue, P&L, expenses)
- Cannot view inventory items or stock levels of any hotel
- Cannot impersonate hotel users (no "login as hotel" feature in v1.0)
- Cannot create or modify inventory masters for any hotel

---

## 2. Dashboard — Platform Overview

**Route:** `/dashboard`
**Purpose:** At-a-glance health of the entire platform.

### 2.1 Metric Cards (Top Row)

| Card | Value | Sub-label |
|---|---|---|
| Total Hotels | Count of all hotels (any status) | "X active, Y suspended" |
| Active Hotels | Hotels with status = 'active' | — |
| New This Month | Hotels created in current calendar month | vs last month (+ / - %) |
| Expiring Soon | Hotels expiring within 30 days | Link → filtered hotel list |

### 2.2 Subscription Breakdown (Donut Chart)

Segments: Free Trial / Basic / Premium / Enterprise
Center label: total active hotels
Below chart: legend with count per plan

### 2.3 Recent Activity Feed

Last 20 audit log entries platform-wide:
```
[timestamp] Hotel "Sunrise Inn" created by super_admin
[timestamp] Hotel "Royal Palace" suspended (subscription expired)
[timestamp] Hotel Admin password reset for "Grand View Hotel"
[timestamp] Subscription updated: "Marina Bay" → Premium
```

### 2.4 Alerts Banner

Shows if any of these exist:
- Hotels that expired today (red)
- Hotels expiring in ≤ 3 days (amber)
- Hotels with status = 'suspended' for > 30 days (info — may need deactivation)

### 2.5 API

```
GET /admin/dashboard/metrics
Response: {
  total_hotels: number,
  active_hotels: number,
  suspended_hotels: number,
  deactivated_hotels: number,
  new_this_month: number,
  new_last_month: number,
  expiring_within_30_days: number,
  by_plan: { free_trial: n, basic: n, premium: n, enterprise: n }
}
```

---

## 3. Hotel Management

**Route:** `/hotels`
**This is the most-used section of the Super Admin panel.**

### 3.1 Hotel List Page

#### Filters & Search Bar

| Filter | Type | Options |
|---|---|---|
| Search | Text input | Searches hotel name, owner name, phone (ILIKE) |
| Status | Dropdown | All / Active / Suspended / Deactivated |
| Plan | Dropdown | All / Free Trial / Basic / Premium / Enterprise |
| Expiring | Dropdown | All / Within 7 days / Within 30 days / Expired |
| Sort By | Dropdown | Created Date (default desc) / Name / Expiry Date |

#### Table Columns

| Column | Details |
|---|---|
| Hotel Name | Clickable → hotel detail page |
| Owner Name | — |
| Phone | — |
| Plan | Badge (colour-coded: grey=trial, blue=basic, green=premium, gold=enterprise) |
| Status | Badge: Active (green) / Suspended (orange) / Deactivated (red) |
| Subscription Expiry | Date; amber if < 30 days; red if expired |
| Users | Count of active users in that hotel |
| Created | Date |
| Actions | ••• menu → View / Edit / Suspend / Reactivate / Deactivate / Reset Admin Password |

#### Pagination

20 hotels per page. Show total count. "Previous / Next" + page number.

#### Empty State

"No hotels found. Create your first hotel to get started." + "Create Hotel" button.

---

### 3.2 Create Hotel

**Route:** `/hotels/new`
**Trigger:** "Create Hotel" button on list page

#### Form Fields

| Field | Type | Required | Validation |
|---|---|---|---|
| Hotel Name | Text | Yes | 2–100 chars |
| Address | Textarea | No | max 500 chars |
| Phone | Text | No | basic format check |
| Owner Name | Text | Yes | 2–100 chars |
| Owner Email | Email | Yes | Valid email; globally unique across all users |
| Subscription Plan | Dropdown | Yes | free_trial / basic / premium / enterprise |
| Subscription Expires At | Date picker | Yes | Must be future date |

#### What Happens on Submit

```
POST /admin/hotels
Server does ALL of this atomically:
  1. Create hotels record
  2. Create hotel_admin user:
       - email = owner email from form
       - role = 'hotel_admin'
       - password = auto-generated (12 chars: mix of upper, lower, digit, symbol)
       - password_is_temporary = true
  3. Seed 6 default units for hotel: kg, g, L, mL, pcs, pack (is_system=true)
  4. Seed feature_flags for all 3 roles with defaults (see Developer PRD Section 4.2)
  5. Send welcome email to owner email:
       Subject: "Your Blizz Books account is ready"
       Body: hotel name, login URL, temp password, "please change on first login"
  6. Create audit_log entry: action=CREATE, resource_type=hotel

Response: { hotel: {...}, admin_user: { id, email } }
  (password NOT returned in response — only in email)
```

#### Error Cases

| Error | Message Shown |
|---|---|
| Email already exists | "This email is already registered. Use a different email for the hotel admin." |
| Expiry date in past | "Subscription expiry must be a future date." |
| Server error | "Failed to create hotel. Please try again." (with retry button) |

---

### 3.3 Hotel Detail Page

**Route:** `/hotels/:id`

#### Header Section

```
[Hotel Logo or initials avatar]  Sunrise Inn
                                  Status: Active  |  Plan: Premium
                                  Created: 19 May 2026  |  Expires: 19 May 2027
                                  [Edit Hotel]  [More Actions ▾]
```

#### Tabs

**Tab 1 — Overview**

- Hotel profile fields (read-only display): name, address, phone, timezone, currency
- Admin user card: name, email, last login, [Reset Password] button
- User summary: X active users (breakdown by role as mini bar)
- Quick stats: departments count, subscription days remaining

**Tab 2 — Subscription**

- Current plan badge
- Expiry date (with days remaining)
- Subscription history table (if you track changes):
  ```
  Date         | Changed By    | From      | To        | New Expiry
  19 May 2026  | super_admin   | —         | Premium   | 19 May 2027
  ```
- [Update Subscription] button → opens modal

**Tab 3 — Users**

Read-only list of all users in this hotel:

| Name | Email | Role | Department | Status | Last Login |
|---|---|---|---|---|---|
| Raju Kumar | raju@hotel.com | Store Manager | — | Active | 2 hrs ago |

No editing from here — hotel admin manages their own users.

**Tab 4 — Activity Log**

Audit log entries scoped to this hotel (read-only):
```
[timestamp] [actor name] [action] [resource]
19 May 10:30 | Raju Kumar | CREATE | stock_entry (Tomatoes, 5kg)
19 May 09:15 | Hotel Admin | UPDATE | department (Main Kitchen renamed)
```
Filters: date range, actor, action type. Paginated (20/page).

---

### 3.4 Edit Hotel

**Route:** `/hotels/:id/edit`

Editable fields:
- Hotel name, address, phone, owner name
- Timezone, currency
- Logo (upload → S3)

Fields NOT editable here: subscription plan, expiry, status (those have dedicated actions).

```
PATCH /admin/hotels/:id
Body: { name?, address?, phone?, owner_name?, timezone?, currency?, logo_url? }
```

---

### 3.5 Hotel Status Actions

All via confirmation modal with typed confirmation for destructive actions.

#### Suspend Hotel

```
PATCH /admin/hotels/:id
Body: { status: 'suspended' }

Effect:
  - All hotel users get 403 SUBSCRIPTION_EXPIRED on next API call
  - Hotel admin gets email: "Your account has been suspended. Contact support."
  - Existing sessions: access tokens expire naturally (15 min); refresh tokens return 403
```

Modal text: "Suspend [Hotel Name]? All users will lose access immediately. Type the hotel name to confirm."

#### Reactivate Hotel

```
PATCH /admin/hotels/:id
Body: { status: 'active' }

Effect:
  - Hotel access restored immediately
  - Hotel admin gets email: "Your account has been reactivated."
```

Modal text: "Reactivate [Hotel Name]? Users will regain access immediately."

#### Deactivate Hotel (Permanent)

```
PATCH /admin/hotels/:id
Body: { status: 'deactivated' }

Effect:
  - Same as suspend but permanent
  - Data is retained (soft delete philosophy)
  - Cannot be easily reversed (requires manual DB update)
```

Modal text: "Permanently deactivate [Hotel Name]? This cannot be undone. Type DELETE to confirm."

---

## 4. Subscription Management

**Route:** `/hotels/:id/subscription` or modal from hotel detail

### 4.1 Update Subscription Modal

Fields:

| Field | Type | Required |
|---|---|---|
| Plan | Dropdown | Yes — free_trial / basic / premium / enterprise |
| Expires At | Date picker | Yes — must be future date |
| Notes | Textarea | No — internal note (not shown to hotel) |

```
PATCH /admin/hotels/:id/subscription
Body: { subscription_plan, subscription_expires_at, notes? }

Server:
  1. Update hotels record
  2. If status was 'suspended' due to expiry + new expiry is future: set status='active'
  3. Send email to hotel admin: "Your subscription has been updated to [Plan]. Valid until [date]."
  4. Audit log entry
```

### 4.2 Subscription Plan Limits (Reference)

These are enforced at the feature flag and API level. Super Admin must know these when assigning plans.

| Feature | Free Trial | Basic | Premium | Enterprise |
|---|---|---|---|---|
| Users | 3 | 10 | 50 | Unlimited |
| Departments | 3 | 10 | Unlimited | Unlimited |
| Bulk Upload | No | Yes | Yes | Yes |
| P&L Dashboard | Yes | Yes | Yes | Yes |
| Data Export | No | Basic | Full | Full |
| Storage (receipts) | 500MB | 2GB | 20GB | Unlimited |
| Trial Duration | 14 days | — | — | — |

> **Implementation note:** Plan limits are enforced in the API middleware. On each relevant request, check `hotel.subscription_plan` and compare against a limits config object.

### 4.3 Expiry Warning Cron Job

Runs nightly at 2:00 AM IST.

```typescript
// Pseudocode
const hotels = await db.hotels.findMany({
  where: { status: 'active', subscription_expires_at: { lte: addDays(now, 30) } }
});

for (const hotel of hotels) {
  const daysLeft = differenceInDays(hotel.subscription_expires_at, now);
  if ([30, 15, 3].includes(daysLeft)) {
    // Check if warning email for this day-count was already sent (idempotency)
    if (!alreadySent(hotel.id, daysLeft)) {
      sendEmail(hotel.admin_email, 'subscription_expiry_warning', { days_left: daysLeft });
      logWarningEvent(hotel.id, daysLeft);
    }
  }
  if (daysLeft <= 0) {
    await db.hotels.update({ where: { id: hotel.id }, data: { status: 'suspended' } });
    sendEmail(hotel.admin_email, 'subscription_expired');
  }
}
```

---

## 5. Hotel Admin Password Reset

**Route:** Button on hotel detail page / Tab 1

### 5.1 Flow

```
POST /admin/hotels/:hotel_id/reset-admin-password

Server:
  1. Generate new temp password (12 chars)
  2. Hash with bcrypt (cost 12)
  3. Update users.password_hash WHERE hotel_id = :hotel_id AND role = 'hotel_admin'
  4. Set password_is_temporary = true
  5. Send email to hotel admin:
       Subject: "Your Blizz Books password has been reset"
       Body: new temp password + "login and change immediately"
  6. Revoke all existing refresh tokens for that user
  7. Audit log: action=PASSWORD_RESET, actor=super_admin
  
Response: { message: "Password reset email sent to [email]" }
```

### 5.2 UI

Confirmation modal: "Reset password for [Admin Name] at [Hotel Name]? A temporary password will be emailed to [email]."

Buttons: "Cancel" | "Reset Password"

After success: green toast "Password reset email sent to [email]"

---

## 6. Global Configuration

**Route:** `/settings`

These are platform-wide defaults that apply to all hotels unless overridden.

### 6.1 Supported Payment Methods

List of payment methods available in stock entry and expense forms across all hotels.

```
GET  /admin/config/payment-methods
POST /admin/config/payment-methods   { name: "NEFT" }
DELETE /admin/config/payment-methods/:id
```

Default set (seeded at deployment): Cash, UPI, Online Transfer, Cheque, Card, Credit

**UI:** Simple list with add/remove. Cannot remove a method that is referenced in existing records (show count of references).

### 6.2 Default System Units

Units that are seeded into every new hotel on creation.

```
GET  /admin/config/default-units
POST /admin/config/default-units   { name, symbol, type }
DELETE /admin/config/default-units/:id  — removes from future seeding only; does not affect existing hotels
```

**UI:** Table showing current defaults. "Add Unit" button. Delete with confirmation.

> **Note:** Changing this list only affects hotels created AFTER the change. Existing hotels keep their already-seeded units.

### 6.3 Platform Email Settings

```
PATCH /admin/config/email
Body: {
  from_name: "Blizz Books",
  from_email: "noreply@blizzbooks.io",
  reply_to: "support@blizzbooks.io"
}
```

---

## 7. Platform Metrics

**Route:** `/metrics`
**Purpose:** Platform health and usage monitoring.

### 7.1 Metrics Available

```
GET /admin/metrics
Response: {
  total_hotels: number,
  active_hotels: number,
  total_users: number,         -- across all hotels
  total_stock_entries_30d: number,
  total_bulk_uploads_30d: number,
  total_api_calls_24h: number, -- from request logs
  storage_used_gb: number,     -- S3/R2 usage
  top_active_hotels: [         -- by transaction count last 30 days
    { hotel_name, transaction_count }
  ]
}
```

### 7.2 Display

- Metric cards for top numbers
- Bar chart: new hotels per month (last 12 months)
- Table: top 10 most active hotels by transaction count
- Storage usage progress bar (if there's a platform cap)

---

## 8. Audit & Activity Log

**Route:** `/audit-logs`

### 8.1 Platform-Wide Log

Shows all audit events across all hotels.

#### Filters

| Filter | Type |
|---|---|
| Hotel | Dropdown (all hotels) |
| Actor | Text search (user name or email) |
| Action | Dropdown: CREATE / UPDATE / DELETE / LOGIN / BULK_CREATE / BULK_ISSUE / EXPORT / PASSWORD_RESET |
| Resource Type | Dropdown: hotel / user / stock_entry / stock_request / expense / batch_upload / etc. |
| Date From / To | Date pickers |

#### Table Columns

```
Timestamp  |  Hotel  |  Actor  |  Action  |  Resource  |  Details
```

Clicking a row expands to show `before_state` and `after_state` JSON (formatted, with diff highlighting).

#### Export

```
GET /admin/audit-logs/export?format=csv&date_from=&date_to=&hotel_id=
```

Returns CSV of filtered logs. Super Admin use only.

---

## 9. API Reference — Super Admin

All routes prefixed with `/api/v1/admin`. Require `role: super_admin` in JWT.

### Hotels

```
GET    /admin/hotels                               — list with filters
POST   /admin/hotels                               — create hotel + seed
GET    /admin/hotels/:id                           — hotel detail
PATCH  /admin/hotels/:id                           — update profile / status / subscription
POST   /admin/hotels/:id/reset-admin-password      — reset hotel admin password
```

### Metrics & Config

```
GET    /admin/dashboard/metrics                    — platform overview numbers
GET    /admin/metrics                              — full usage metrics
GET    /admin/audit-logs                           — platform-wide audit log
GET    /admin/audit-logs/export                    — CSV export

GET    /admin/config/payment-methods               — list
POST   /admin/config/payment-methods               — add
DELETE /admin/config/payment-methods/:id           — remove

GET    /admin/config/default-units                 — list seeded defaults
POST   /admin/config/default-units                 — add to seeding list
DELETE /admin/config/default-units/:id             — remove from seeding list

PATCH  /admin/config/email                         — update email sender config
```

### Standard Response Format

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": { "code": "HOTEL_NOT_FOUND", "message": "Hotel with this ID does not exist." } }
```

---

## 10. UI States & Edge Cases

### 10.1 Hotel List

| State | Behaviour |
|---|---|
| Loading | Skeleton rows (5 placeholder rows) |
| Empty (no hotels yet) | Illustration + "Create your first hotel" CTA |
| Search returns nothing | "No hotels match your search. Try different filters." |
| Hotel expiring today | Row highlighted amber; expiry cell shows "Expires today" in red |
| Hotel already expired | Row highlighted light red; status badge = "Suspended" |

### 10.2 Create Hotel

| Edge Case | Handling |
|---|---|
| Owner email already exists as any user | Server returns 409; show "Email already in use" |
| Expiry date = today | Reject; "Expiry must be at least 1 day in the future" |
| Network failure during creation | Show error; creation is atomic so no partial state — safe to retry |
| Welcome email fails to send | Hotel is still created; show warning "Hotel created but email failed — copy credentials: [temp_pass]" and display temp password on screen once only |

### 10.3 Status Changes

| Edge Case | Handling |
|---|---|
| Suspend hotel that's already suspended | API returns 409; button disabled if status already matches |
| Reactivate hotel with expired subscription | Server auto-updates expiry to today + 7 days (grace period); show warning "Subscription is expired — a 7-day grace period has been applied. Update the subscription." |
| Deactivate hotel with active open stock requests | Allow — data is preserved; show warning count in modal |

### 10.4 Password Reset

| Edge Case | Handling |
|---|---|
| Hotel has no admin user (shouldn't happen but...) | "No admin user found for this hotel. Contact engineering." |
| Email delivery fails | Show temp password on screen once with copy button; log that email failed |

### 10.5 Metrics Page

| State | Handling |
|---|---|
| No hotels yet | All zeros; no charts rendered; "Create your first hotel to see data" |
| S3 storage API unavailable | Show metrics without storage figure; "Storage data temporarily unavailable" |

---

## 11. Navigation & Layout

### 11.1 Sidebar Navigation

```
┌─────────────────────┐
│  🏔 Blizz Books     │
│     Super Admin     │
├─────────────────────┤
│ 📊 Dashboard        │
│ 🏨 Hotels           │
│ 📈 Metrics          │
│ 📋 Audit Logs       │
│ ⚙️  Settings        │
├─────────────────────┤
│ 👤 My Account       │
│ 🚪 Logout           │
└─────────────────────┘
```

### 11.2 Top Bar

```
[Blizz Books Super Admin]          [🔔 0]  [SA]  [Super Admin ▾]
```

Notification bell shows count of platform alerts (expiring hotels, failed cron jobs).

### 11.3 Breadcrumbs

```
Hotels > Sunrise Inn > Edit
Hotels > Sunrise Inn > Subscription
```

### 11.4 Page Header Pattern

Every page:
```
[Page Title]                                    [Primary Action Button]
[Subtitle / description one line]
───────────────────────────────────────────────────────────────────────
[Content]
```

---

## 12. Security Rules

These must be enforced in the NestJS middleware, not just the UI.

- Every route in `/admin/*` checks `req.user.role === 'super_admin'` — returns 403 otherwise
- Super Admin JWT has no `hotel_id` — any hotel-scoped middleware must skip for this role
- Password reset emails are always sent to the registered owner email — not to any email supplied in the request body (prevents social engineering)
- Deactivation of a hotel requires the typed confirmation string to match server-side — the server validates the confirm string in the request body, not just the frontend
- All Super Admin actions are written to audit_log with `hotel_id = null` and `actor_id = super_admin user id`
- Rate limit Super Admin auth: 5 attempts per 15 minutes per IP

---

*End of Super Admin Module PRD*
*Cross-reference: Developer PRD Section 5 (Super Admin Module) and Section 2 (Database Schema)*
