# FridgePolice — Roommate Food Tracking & Allocation

A functional prototype built with React, Vite, TypeScript, and Vitest designed to eliminate roommate fridge disputes, prevent portion over-allocation, manage reservation lifecycles, safely reconcile physical inventory discrepancies, and keep identical items distinct.

---

## Key Features

1. **Prevent Double Allocation (Scenario 1)**:
   - When portion requests compete for remaining inventory (e.g., two roommates requesting the final 25% of pizza), the first approval atomically reserves the quantity.
   - The second approval is synchronously rejected with clear error feedback because unreserved inventory is 0%.
2. **Approved but Never Consumed Food Lifecycle (Scenario 2)**:
   - Complete lifecycle: `Pending` → `Approved (Reserved)` → `Claimed (Consumed)` / `Expired` / `Rejected` / `Cancelled`.
   - Approvals have a 5-minute reservation timer. Unclaimed reservations expire and automatically return portions to available inventory.
   - Includes a **"Simulate Expiry Now"** button for instant demonstration.
   - Spoiled or discarded items release all outstanding reservations and prevent future claims.
3. **Identical Item Names (Scenario 3)**:
   - Multiple roommates can store identically named items (e.g., two bottles of "Heinz Tomato Ketchup" owned by Alice and Bob).
   - Each physical item possesses a collision-resistant UUID and isolated quantity state. Modifying one bottle never affects the other.
4. **Missing Food & Safe Inventory Reconciliation (Scenario 4)**:
   - Roommates can report actual physical quantities found in the fridge.
   - If actual quantity is less than active reservations, excess reservations are deterministically cancelled using FIFO priority (earliest approvals preserved) so reserved quantities never exceed physical quantity.
   - Transparent audit log captures all adjustments.
5. **Interactive Demo Toolbar**:
   - One-click buttons to initialize and demonstrate all four scenarios using real application logic.

---

## Technology Stack

- **Frontend**: React 19, TypeScript
- **Build Tool**: Vite 8
- **Styling**: Vanilla CSS (modern dark theme, glassmorphism, responsive)
- **State Management**: Centralized synchronous state reducer with pure domain logic
- **Persistence**: Browser `localStorage` with defensive schema validation
- **Testing**: Vitest (5 test suites, 22 unit & integration tests)

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm (v9 or higher)

### Installation
```bash
git clone https://github.com/ShaikJaveed999/FridgePolice_new.git
cd FridgePolice_new
npm install
```

### Running the App Locally
```bash
npm run dev
```
Open your browser at `http://localhost:5173/`.

### Running Automated Tests
```bash
npm test
```
To run tests in watch mode:
```bash
npm run test:watch
```

### Building for Production
```bash
npm run build
npm run preview
```

---

## Architectural Highlights

- **Integer-Based Units**: All quantities and percentages are stored as integers to eliminate floating-point precision errors.
- **Derived Available Quantities**: Available inventory is derived on-the-fly (`available = total - reserved`), preventing stale copies of inventory.
- **Pure Domain Layer**: Logic resides in `src/domain/` independent of React, allowing direct testing with mockable timestamps.

---

## Documentation

See [Changes.md](Changes.md) for detailed architectural documentation, scenario breakdowns, quantity calculation formulas, and test execution reports.
