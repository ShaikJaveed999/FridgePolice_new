# FridgePolice — Architecture, Implementation & Scenario Documentation

## 1. What FridgePolice Does
FridgePolice is a roommate food-tracking application designed to eliminate shared fridge disputes, prevent over-allocation of remaining food portions, enforce reservation lifecycles, safely reconcile physical inventory discrepancies, and keep identical items distinct.

Roommates can:
- View physical food items and their current unreserved available quantities.
- Add food items to shared inventory with clear owner attribution and unique physical identifiers.
- Request portions from other roommates.
- Approve or reject portion requests (with atomic reservation).
- Track whether approved portions were actually claimed/consumed or expired.
- Expire unconsumed reservations automatically or on-demand, restoring available quantities.
- Mark spoiled or discarded food, releasing reservations and preventing future claims.
- Reconcile inventory when the physical contents of the fridge differ from the recorded state, using deterministic FIFO shortage handling.
- Distinguish identical item names belonging to different owners.

---

## 2. Architecture & State Model

### Technology Stack
- **Framework & Runtime**: React 19, TypeScript, Vite.
- **Styling**: Vanilla CSS design tokens with modern dark glassmorphism, responsive cards, and accessible states.
- **Persistence**: Browser `localStorage` with defensive parsing, validation, and automated fallback to seed data.
- **Testing**: Vitest with an injectable clock and unit/integration suites testing domain logic directly outside React.

### Modular Organization
```
src/
├── types/
│   └── index.ts               # Core domain interfaces and discriminated unions
├── domain/
│   ├── inventoryLogic.ts      # Authoritative quantity calculations & item validation
│   ├── requestLogic.ts        # Double allocation prevention, approval, claim, expiry
│   ├── reconciliationLogic.ts # Physical inventory correction & deterministic shortage resolution
│   └── seedData.ts            # Default seed data and deterministic scenario initializers
├── state/
│   ├── reducer.ts             # Pure state reducer handling all transitions synchronously
│   ├── storage.ts             # Defensive localStorage loading and persistence
│   └── FridgeContext.tsx      # React context, custom hooks, time ticker & toast dispatcher
├── utils/
│   ├── id.ts                  # Collision-resistant unique ID generators
│   └── time.ts                # Time formatting, relative timestamps, countdowns
├── components/
│   ├── common/                # Navbar, Modal, Toast notifications
│   ├── demo/                  # Interactive Demo Scenarios toolbar & step-by-step guides
│   ├── dashboard/             # KPI metric overview cards
│   ├── inventory/             # Inventory table, Add Item modal, Reconcile modal, Request modal
│   ├── requests/              # Portion requests list with live timers & instant expiry simulation
│   └── history/               # Activity timeline and reconciliation audit log
└── tests/                     # 5 Vitest test suites (22 tests passing)
```

### Core Data Models
1. **`FoodItem`**:
   - `id`: Unique physical UUID (e.g., `item_pizza_alice_01`).
   - `name`: string (e.g., `"Pepperoni Pizza"`).
   - `owner`: string (e.g., `"Alice"`).
   - `totalQuantity`: Positive integer representing physical units or percentage (e.g., `25` for 25%).
   - `unit`: string (e.g., `'%'`, `'slices'`, `'ml'`, `'cans'`, `'portions'`).
   - `status`: `'active' | 'spoiled' | 'discarded'`.
   - `createdAt`, `updatedAt`: Timestamps.
   - `notes`?: Optional storage location or consumption guidance.

2. **`PortionRequest`**:
   - `id`: Unique request UUID.
   - `foodItemId`: Direct reference to the target physical item's `id`.
   - `requester`: string (e.g., `"Bob"`).
   - `requestedQuantity`: Positive integer.
   - `status`: `'pending' | 'approved' | 'claimed' | 'expired' | 'rejected' | 'cancelled'`.
   - `createdAt`, `approvedAt`?, `expiresAt`?, `claimedAt`?, `expiredAt`?, `rejectedAt`?, `cancelledAt`?.
   - `rejectionReason`?, `cancellationReason`?.

3. **`InventoryAdjustment`**:
   - `id`, `foodItemId`, `foodItemName`, `previousQuantity`, `correctedQuantity`, `difference`, `reason`, `timestamp`, `adjustedBy`, `impactedReservationsCount`, `details`.

4. **`ActivityLogEntry`**:
   - `id`, `type`, `description`, `timestamp`, `actor`, `entityId`.

---

## 3. Quantity Calculations: Total vs Reserved vs Available

The application enforces a single source of truth for all inventory numbers:

$$\text{Reserved Quantity} = \sum_{r \in \text{Active Reservations}} r.\text{requestedQuantity}$$

$$\text{Available Quantity} = \max(0, \text{totalQuantity} - \text{reservedQuantity})$$

- **Total Recorded Quantity**: The total physical amount of the food item recorded in the application.
- **Reserved Quantity**: The sum of all portion requests for this item that are currently `status === 'approved'` and whose reservation expiry timestamp has not passed (`now < r.expiresAt`).
  - *Pending requests do NOT count as reserved portions.*
  - *Expired, rejected, claimed, or cancelled requests do NOT count as reserved portions.*
- **Available Quantity**: The remaining portion available to be requested or claimed.
  - Derived dynamically: $\text{Available} = \text{Total} - \text{Reserved}$.
  - Reserved portions are never displayed or counted as available inventory.
  - If an item is marked `'spoiled'` or `'discarded'`, both `reservedQuantity` and `availableQuantity` are strictly 0.

---

## 4. How the Four Scenarios are Handled

### Scenario 1: Prevent Double Allocation
- **Setup**: Alice has Pepperoni Pizza with exactly 25% remaining. Roommate B (Bob) requests 25%, and Roommate C (Charlie) also requests 25%.
- **Handling**:
  - The domain logic validates any approval against the authoritative unreserved available quantity at that exact moment.
  - When Alice approves Bob's request:
    - Bob's request atomically transitions to `status = 'approved'`.
    - Active reservation becomes 25%.
    - Available quantity drops to $25\% - 25\% = 0\%$.
  - When Alice attempts to approve Charlie's competing request:
    - The synchronous reducer checks current available quantity ($0\%$).
    - Because Charlie requested $25\% > 0\%$, the approval is **rejected synchronously**.
    - An explicit error toast informs the user: *"Insufficient unreserved quantity available. Only 0 % unreserved, but 25 was requested."*
    - Charlie's request remains pending and is never allocated.
  - Both competing requests can never succeed simultaneously. Over-allocation and negative inventory are strictly prevented.

### Scenario 2: Approved but Never Consumed Food Lifecycle
- **Lifecycle States**:
  $$\text{Pending} \xrightarrow{\text{Approve}} \text{Approved (Reserved)} \xrightarrow{\text{Claim}} \text{Claimed (Consumed)}$$
  $$\text{Approved (Reserved)} \xrightarrow{\text{Time Expiry}} \text{Expired (Released back to fridge)}$$
  $$\text{Pending} \xrightarrow{\text{Reject}} \text{Rejected}$$
  $$\text{Pending / Approved} \xrightarrow{\text{Food Discarded / Shortage}} \text{Cancelled}$$
- **Expiry Rules**:
  - Every approval includes an `expiresAt` timestamp (default: 5 minutes / 300,000 ms).
  - A 1-second background ticker (`TICK_TIME`) scans active reservations. If `now >= r.expiresAt`, the request transitions to `'expired'`.
  - The UI also provides a **"Simulate Expiry Now"** button on every approved reservation so reviewers can test expiration immediately without waiting.
  - Once expired, the reservation is released: the item's `reservedQuantity` decreases and its `availableQuantity` increases by that amount, provided the food is still active.
  - Expired requests are terminal; they are never silently reactivated.
  - An expired request **cannot be claimed**.
  - **Simultaneous Expiry and Claim Rule**: The claim logic verifies `now < r.expiresAt` before allowing a claim. If the time has passed, the claim is rejected with an error.
  - **Spoiled / Discarded Food**: When an owner marks an item as spoiled or discarded:
    - Item status becomes `'discarded'`.
    - All pending and approved requests are cancelled with explanation.
    - Future claims are blocked.
    - Discarded food total and available quantities are never restored by subsequent expirations.

### Scenario 3: Identical Food Names
- **Problem**: Roommate Alice and Roommate Bob both put a bottle of "Heinz Tomato Ketchup" in the fridge.
- **Handling**:
  - Every item has a unique, collision-resistant UUID (e.g. `item_ketchup_alice_02` vs `item_ketchup_bob_03`).
  - Item metadata independently tracks: `id`, `name`, `owner`, `totalQuantity`, `unit`, `createdAt`, `updatedAt`, `status`.
  - All portion requests, approvals, claims, and reconciliations strictly reference `foodItemId`, never the text name.
  - The UI displays unique ID badges (`#item_ketchup...`) and owner labels alongside the food name.
  - Modifying Alice's bottle (e.g., claiming 20% or reconciling to 70%) has zero effect on Bob's ketchup bottle.

### Scenario 4: Missing Food & Safe Inventory Reconciliation
- **Feature**: Every inventory item includes a visible **"Reconcile"** action.
- **Workflow**:
  1. Roommate opens the Reconcile modal, which displays current recorded quantity ($Q_{\text{recorded}}$), reserved quantity ($Q_{\text{reserved}}$), and available quantity.
  2. Roommate enters the actual physical quantity found in the fridge ($Q_{\text{actual}}$) and the reason for adjustment.
  3. The modal provides a real-time preview of the difference ($Q_{\text{actual}} - Q_{\text{recorded}}$) and warns if reservations will be impacted.
  4. Requires explicit confirmation click: **"Confirm Inventory Correction"**.
- **Deterministic Shortage Handling**:
  - If $Q_{\text{actual}} \ge Q_{\text{reserved}}$: All existing reservations remain intact. Available quantity is updated to $Q_{\text{actual}} - Q_{\text{reserved}}$.
  - If $Q_{\text{actual}} < Q_{\text{reserved}}$: Physical food is less than promised reservations.
    - **FIFO Priority Rule**: Active reservations are sorted ascending by `approvedAt` (earliest approved reservations are honored first).
    - Iterating through reservations, portions are retained until physical capacity is exhausted.
    - Excess reservations that cannot be fulfilled are cancelled: `status = 'cancelled'`, with a detailed `cancellationReason` explaining the reconciliation shortage.
    - Reserved quantity never exceeds actual physical quantity.
- **Audit Logging**:
  - Adjustments are recorded in `inventoryAdjustments` and the Activity Log with previous quantity, corrected quantity, difference, reason, adjuster name, timestamp, and impacted reservation details.
  - Quantities that were already consumed or discarded in the past are never restored.

---

## 5. Important Engineering Decisions and Assumptions
1. **Integer-Based Units**: All quantities and percentages are stored and validated as non-negative integers (`Number.isInteger`). This prevents fractional floating-point allocation errors (e.g., `0.30000000000000004` pizza slices).
2. **Pure Domain Logic Layer**: Domain operations (`computeItemQuantities`, `approvePortionRequest`, `claimPortionRequest`, `reconcileInventory`) are pure TypeScript functions decoupled from React. This allows direct unit testing in Node/Vitest with arbitrary injected timestamps.
3. **Synchronous State Reducer**: Browser prototype state transitions execute synchronously in a single reducer step, guaranteeing atomic reservation updates and eliminating race conditions or stale-state double allocations.
4. **Deterministic Shortage Strategy**: FIFO (First-In, First-Out) by approval timestamp was chosen for reconciliation shortages because it is equitable, predictable, and simple for roommates to understand: earlier approved portions take priority.
5. **Simulated Expiry Feature**: Because 5 minutes is impractical to wait through during an evaluation or video recording, an explicit "Simulate Expiry Now" action is built into each approved request.

---

## 6. Automated Tests & Actual Results

### Test Suite Execution
Tests were run via `npm test` (`vitest run`). All 22 tests across 5 test suites passed cleanly:

```
 RUN  v5.0.5 C:/Users/javid/FridgePolice_new

 ✓ src/tests/reducerAndStore.test.ts (4 tests) 11ms
 ✓ src/tests/scenario1_doubleAllocation.test.ts (4 tests) 11ms
 ✓ src/tests/scenario4_reconciliation.test.ts (4 tests) 11ms
 ✓ src/tests/scenario3_identicalItems.test.ts (3 tests) 11ms
 ✓ src/tests/scenario2_lifecycleAndExpiry.test.ts (7 tests) 13ms

 Test Files  5 passed (5)
      Tests  22 passed (22)
   Duration  425ms
```

### Coverage of Requirements:
- **Scenario 1**:
  - `validates initial available inventory is 25% and pending requests do not count as reservations` (Passed)
  - `approving Bob's request atomically reserves 25% and drops available quantity to 0%` (Passed)
  - `rejects a second competing approval for Charlie because unreserved available quantity is 0%` (Passed)
  - `pure domain function approvePortionRequest returns error when unreserved quantity is insufficient` (Passed)
- **Scenario 2**:
  - `approving reservation sets expiry time exactly 5 minutes in the future` (Passed)
  - `unclaimed reservation expires automatically when time elapses, restoring available quantity` (Passed)
  - `instant simulation of expiry transitions request to expired immediately and releases portion` (Passed)
  - `an expired request cannot be claimed` (Passed)
  - `enforces simultaneous expiry and claim rule: rejects claim if current time >= expiresAt` (Passed)
  - `a valid claim transitions status to claimed and permanently deducts physical quantity` (Passed)
  - `discarding food releases reservations, cancels requests, and prevents future claims` (Passed)
- **Scenario 3**:
  - `allows two separate items with the exact same name but distinct UUIDs and owners` (Passed)
  - `requesting from Alice's ketchup only reserves Alice's bottle and leaves Bob's untouched` (Passed)
  - `claiming or reconciling Alice's ketchup does not alter Bob's ketchup` (Passed)
- **Scenario 4**:
  - `strictly rejects negative quantities during reconciliation` (Passed)
  - `reconciles inventory when actual quantity is sufficient for all reservations` (Passed)
  - `safely handles shortage: cancels excess reservations using FIFO priority when actual < reserved` (Passed)
  - `cancels all reservations if actual physical quantity is 0` (Passed)
- **Store & Integration**:
  - `adds food items with validation and logs activity` (Passed)
  - `rejects portion request if requested quantity exceeds available quantity` (Passed)
  - `loading demo scenarios correctly configures each specific scenario state` (Passed)
  - `reset demo data restores valid initial seed state` (Passed)

### Production Build
Run command: `npm run build` (`tsc -b && vite build`)
```
✓ 2049 modules transformed.
dist/index.html                   1.24 kB │ gzip:  0.71 kB
dist/assets/index-B90f2HkG.css    5.02 kB │ gzip:  1.71 kB
dist/assets/index-CUmU-Hvg.js   303.14 kB │ gzip: 88.79 kB
✓ built in 574ms
```
Zero errors, zero warnings.

---

## 7. Known Limitations of Prototype
- **Single-Browser Persistence**: Data is persisted in browser `localStorage`. Real-time multi-device sync across physical devices would require a WebSockets/SSE server or cloud database (explicitly out of scope for this browser prototype).
- **Client Clock Dependency**: Timers depend on the local browser system clock. In production multi-user systems, expiration timestamps should be evaluated against an authoritative server clock.
- **Whole-Portion Shortage Trimming**: When reconciling an inventory shortage where a reservation can only be partially fulfilled, the prototype cancels the excess reservation rather than splitting it into a fractional portion.

---

## 8. Instructions for Running Locally

### Prerequisites
- Node.js v18+ (tested on Node v22.20.0)
- npm v9+

### Setup & Run
1. **Clone the repository**:
   ```bash
   git clone https://github.com/ShaikJaveed999/FridgePolice_new.git
   cd FridgePolice_new
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Run unit & integration tests**:
   ```bash
   npm test
   ```
4. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173/`.
5. **Run the production build preview**:
   ```bash
   npm run build
   npm run preview
   ```
   Open your browser at `http://localhost:4173/`.
