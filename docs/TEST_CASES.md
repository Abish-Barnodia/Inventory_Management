# FINBOOKS - Comprehensive Test Cases & Edge Cases

This document outlines page-wise test cases and edge cases for the FINBOOKS application, based on the current implementation and documentation.

---

## 1. Authentication (Login, Register, Verify)
**Pages:** /login, /register, /verify

### Basic Test Cases
- [ ] Successful user registration with valid data.
- [ ] Successful login with correct credentials.
- [ ] Redirection to Dashboard/POS after successful login.
- [ ] Password masking in input fields.
- [ ] Logout functionality and session termination.

### Edge Cases
- [ ] **Email validation**: Attempting to register with an invalid email format (e.g., 'user@domain', 'user.com').
- [ ] **Duplicate User**: Registering with an email that already exists in the system.
- [ ] **Weak Password**: Registration with a password that doesn't meet security criteria (if defined).
- [ ] **Incorrect Login**: Multi-attempt lockouts or cooling periods after 'X' failed attempts.
- [ ] **Verification Expired**: Clicking on an email verification link that has expired.
- [ ] **Session Persistence**: Closing the browser and reopening to check if the session is maintained (Remember Me).
- [ ] **Direct Access**: Attempting to access '/admin' or '/terminal' routes without being logged in.
- [ ] **Token Corruption**: Manually editing the JWT in local storage to see how the app handles tampered tokens.

---

## 2. POS Terminal (Billing)
**Pages:** /terminal, /terminal/checkout

### Basic Test Cases
- [ ] Browsing items by category.
- [ ] Searching for an item by name or SKU.
- [ ] Adding an item to the cart and seeing the subtotal update.
- [ ] Selecting a payment method (Cash, UPI, Card).
- [ ] Generating and downloading/printing a receipt.

### Edge Cases
- [ ] **Empty Cart**: Attempting to checkout with 0 items.
- [ ] **Zero Price Item**: Handling items that have a price of 0 (e.g., complimentary items).
- [ ] **Non-Integer Quantities**: Attempting to add 1.5 units (System should only allow positive integers as per 'parsePositiveInt').
- [ ] **Large Quantities**: Adding a quantity of 9999+ to check for UI overflow and calculation limits.
- [ ] **Discount Limits**: Applying a discount percentage greater than 100% or a flat discount greater than the subtotal.
- [ ] **Partial Payments**: (If supported) Handling split payments between Cash and UPI.
- [ ] **Concurrency**: Two terminals selling the last remaining unit of an item simultaneously.
- [ ] **Disconnected State**: Adding items to the cart while offline; check for local sync/resilience.
- [ ] **Tax Calculations**: Handling multiple GST rates (5%, 12%, 18%) in a single bill correctly.
- [ ] **Rounding Errors**: Verification of 'roundMoney' logic for totals ending in '.005' or similar.
- [ ] **Deleted Items in Cart**: An item being deleted from the inventory while it's already in a user's active cart.

---

## 3. Table Management (Dine-in)
**Pages:** /admin/tables, /terminal/tables

### Basic Test Cases
- [ ] Assigning a customer to an empty table.
- [ ] Changing table status from 'Available' to 'Occupied'.
- [ ] Adding items to a specific table's order.
- [ ] Generating a KOT (Kitchen Order Ticket) for a table.

### Edge Cases
- [ ] **Double Assignment**: Trying to assign a table that is already marked as 'Occupied'.
- [ ] **Table Number Collision**: Creating two tables with the same number (Should return 409 Conflict).
- [ ] **Deleting Occupied Table**: Attempting to delete a table while its status is 'occupied' (Should be restricted).
- [ ] **Table Switch**: Moving an active order from Table A to Table B.
- [ ] **Table Merge**: Recombining orders from two separate tables into one bill.
- [ ] **Unpaid Checkout**: Attempting to mark a table as 'Available' before the bill has been marked 'Paid'.
- [ ] **Order Phase Overlap**: Adding items to 'Phase 1' (Appetizers) while 'Phase 2' (Main Course) is already active.
- [ ] **Multiple KOTs**: Sending multiple KOTs for the same table and ensuring they append correctly without duplicating previous items.

---

## 4. Item / Menu Management
**Pages:** /admin/items, /admin/categories

### Basic Test Cases
- [ ] Creating a new item with name, price, category, and tax rate.
- [ ] Editing an existing item's price.
- [ ] Deleting an item (soft delete vs hard delete).

### Edge Cases
- [ ] **GST Slab Change**: Updating a GST slab percentage and checking if it affects *previous* bills (It shouldn't) vs *new* bills (It should).
- [ ] **Recursive Categories**: (If supported) Creating a sub-category that is its own parent.
- [ ] **Image Uploads**: Uploading a 20MB 4K image for a small menu icon; checking for compression/rejection.
- [ ] **Missing Tax**: Creating an item without a tax rate; ensure system defaults to 0% or warns the user.
- [ ] **Special Characters**: Item names with emojis or special characters (e.g., 'Momo's & More!').
- [ ] **Active Sales**: Attempting to delete an item that is currently in an active cart/table order.
- [ ] **Inactive Categories**: Adding an item to a category that is marked as 'is_active = false'.

---

## 5. Inventory Management
**Pages:** /admin/inventory

### Basic Test Cases
- [ ] Recording a purchase entry from a supplier.
- [ ] Automatic stock decrement after a POS sale.
- [ ] Viewing low-stock alerts.

### Edge Cases
- [ ] **Negative Stock**: Selling an item when stock is 0 (Check if the system allows back-orders or blocks the sale).
- [ ] **Bulk Stock Correction**: Manually adjusting stock levels for 100+ items at once.
- [ ] **Unit Conversion**: Buying in 'Kgs' and selling in 'Grams' or 'Plates'; check for precision errors.
- [ ] **Expiry Tracking**: Items that go past their expiry date remaining in stock.

---

## 6. Admin Dashboard & Reports
**Pages:** /admin, /admin/reports

### Basic Test Cases
- [ ] Viewing 'Today's Total Sales' vs 'Yesterday's'.
- [ ] Exporting monthly sales report to CSV/PDF.

### Edge Cases
- [ ] **Timezone Issues**: Sales made at 11:59 PM appearing on the wrong day's report due to server-local-time differences.
- [ ] **Zero Data**: Viewing reports for a period with 0 sales (ensure no 'division by zero' errors in averages).
- [ ] **Large Data Sets**: Loading 'All Time' reports with 1,000,000+ records; check for pagination and timeout.
- [ ] **Role-Based Visibility**: A 'STAFF' member trying to access the 'Total Profit' metric (Should be blocked by 'admin-auth.ts').

---

## 7. Kitchen Display System (KOT)
**Pages:** /kitchen

### Basic Test Cases
- [ ] New orders appearing in real-time.
- [ ] Marking an order as 'Completed' or 'Served'.

### Edge Cases
- [ ] **Section-Specific KOTs**: Ensuring a 'Drink' only appears in the Bar section and 'Food' only in the Kitchen section (based on category-section mapping).
- [ ] **Priority Handling**: Handling 'High Priority' or 'Urgent' flags on specific KOTs.
- [ ] **Order Cancellation**: What happens when a POS user removes an item *after* the KOT has been sent? (Kitchen should receive a 'Cancel' notification).
- [ ] **Device Sync**: Ensuring multiple kitchen screens stay in sync when an order is marked 'In Progress'.
- [ ] **Pending Count Accuracy**: Checking if the 'pending_count' in '/kots/sections/list' updates immediately as soon as a KOT is marked completed.

---

## 8. General System / Global Edge Cases
- [ ] **Network Latency**: Simulating a slow 3G connection during the 'Pay' action.
- [ ] **CSRF/XSS**: Injecting '<script>alert(1)</script>' into item names or customer names.
- [ ] **Broken Assets**: What the UI looks like when images fail to load or the API is down.
- [ ] **Mobile Touchpoints**: Ensuring all buttons in the POS are large enough for thumb-clicks on a tablet.
- [ ] **Browser Compatibility**: Testing on Safari (iPad), Chrome (Android/Windows), and Firefox.
