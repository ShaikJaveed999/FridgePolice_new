import { describe, it, expect } from 'vitest';
import type { AppState, FoodItem, PortionRequest } from '../types';
import { appReducer } from '../state/reducer';
import { computeItemQuantities } from '../domain/inventoryLogic';
import { reconcileInventory } from '../domain/reconciliationLogic';

describe('Scenario 4: Inventory Reconciliation When Food Is Missing', () => {
  const baseTime = 1700000000000;

  function createOrangeJuiceState(): AppState {
    const juice: FoodItem = {
      id: 'item-juice-s4',
      name: 'Orange Juice',
      owner: 'Charlie',
      totalQuantity: 100,
      unit: '%',
      status: 'active',
      createdAt: baseTime,
      updatedAt: baseTime,
    };

    // Alice has earlier approved reservation of 30% (FIFO priority 1)
    const reqAlice: PortionRequest = {
      id: 'req-alice-juice',
      foodItemId: juice.id,
      requester: 'Alice',
      requestedQuantity: 30,
      status: 'approved',
      createdAt: baseTime + 1000,
      approvedAt: baseTime + 2000,
      expiresAt: baseTime + 5 * 60 * 1000,
    };

    // Bob has later approved reservation of 30% (FIFO priority 2)
    const reqBob: PortionRequest = {
      id: 'req-bob-juice',
      foodItemId: juice.id,
      requester: 'Bob',
      requestedQuantity: 30,
      status: 'approved',
      createdAt: baseTime + 3000,
      approvedAt: baseTime + 4000,
      expiresAt: baseTime + 5 * 60 * 1000,
    };

    return {
      foodItems: [juice],
      portionRequests: [reqAlice, reqBob],
      inventoryAdjustments: [],
      activityLog: [],
      currentUser: 'Charlie',
      reservationLifetimeMs: 5 * 60 * 1000,
    };
  }

  it('strictly rejects negative quantities during reconciliation', () => {
    const state = createOrangeJuiceState();
    const result = appReducer(
      state,
      {
        type: 'RECONCILE_INVENTORY',
        payload: {
          foodItemId: 'item-juice-s4',
          actualQuantity: -10,
          reason: 'Typo test',
          adjustedBy: 'Charlie',
        },
      },
      baseTime + 10000
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Negative quantities are strictly forbidden/i);
  });

  it('reconciles inventory when actual quantity is sufficient for all reservations', () => {
    const state = createOrangeJuiceState();

    // Total reserved is 60%. Correct actual to 70%.
    const result = appReducer(
      state,
      {
        type: 'RECONCILE_INVENTORY',
        payload: {
          foodItemId: 'item-juice-s4',
          actualQuantity: 70,
          reason: 'Audited fridge; bottle was less full than recorded',
          adjustedBy: 'Charlie',
        },
      },
      baseTime + 10000
    );

    expect(result.success).toBe(true);

    const juice = result.state.foodItems[0];
    expect(juice.totalQuantity).toBe(70);

    const q = computeItemQuantities(juice, result.state.portionRequests, baseTime + 10000);
    expect(q.totalQuantity).toBe(70);
    expect(q.reservedQuantity).toBe(60); // 30 + 30
    expect(q.availableQuantity).toBe(10); // 70 - 60

    // Both reservations remain approved
    const reqAlice = result.state.portionRequests.find((r) => r.id === 'req-alice-juice')!;
    const reqBob = result.state.portionRequests.find((r) => r.id === 'req-bob-juice')!;
    expect(reqAlice.status).toBe('approved');
    expect(reqBob.status).toBe('approved');

    // Adjustment history recorded
    expect(result.state.inventoryAdjustments).toHaveLength(1);
    const adj = result.state.inventoryAdjustments[0];
    expect(adj.previousQuantity).toBe(100);
    expect(adj.correctedQuantity).toBe(70);
    expect(adj.difference).toBe(-30);
    expect(adj.impactedReservationsCount).toBe(0);
    expect(adj.adjustedBy).toBe('Charlie');
  });

  it('safely handles shortage: cancels excess reservations using FIFO priority when actual < reserved', () => {
    const state = createOrangeJuiceState();

    // Total reserved is 60% (Alice: 30%, Bob: 30%).
    // Physical fridge actually only has 40%!
    // Alice was approved first (at baseTime + 2000). She takes 30%.
    // Only 10% capacity left, which cannot fulfill Bob's 30%.
    // Bob's reservation MUST be deterministically cancelled.
    const result = appReducer(
      state,
      {
        type: 'RECONCILE_INVENTORY',
        payload: {
          foodItemId: 'item-juice-s4',
          actualQuantity: 40,
          reason: 'Huge spill discovered in fridge door',
          adjustedBy: 'Charlie',
        },
      },
      baseTime + 10000
    );

    expect(result.success).toBe(true);
    expect(result.successMessage).toMatch(/To prevent over-allocation, 1 reservation\(s\) were cancelled using FIFO priority: Bob/i);

    const juice = result.state.foodItems[0];
    expect(juice.totalQuantity).toBe(40);

    // Alice remains approved
    const reqAlice = result.state.portionRequests.find((r) => r.id === 'req-alice-juice')!;
    expect(reqAlice.status).toBe('approved');

    // Bob is cancelled
    const reqBob = result.state.portionRequests.find((r) => r.id === 'req-bob-juice')!;
    expect(reqBob.status).toBe('cancelled');
    expect(reqBob.cancellationReason).toContain('Reconciliation shortage');

    // Reserved quantity is now 30%, which does NOT exceed actual physical quantity of 40%
    const q = computeItemQuantities(juice, result.state.portionRequests, baseTime + 10000);
    expect(q.totalQuantity).toBe(40);
    expect(q.reservedQuantity).toBe(30);
    expect(q.availableQuantity).toBe(10); // 40 - 30

    // Adjustment log records 1 impacted reservation
    const adj = result.state.inventoryAdjustments[0];
    expect(adj.impactedReservationsCount).toBe(1);
    expect(adj.details).toContain('Bob');
  });

  it('cancels all reservations if actual physical quantity is 0', () => {
    const state = createOrangeJuiceState();

    const result = reconcileInventory(
      'item-juice-s4',
      0,
      'Entire container empty and thrown out',
      'Charlie',
      state.foodItems,
      state.portionRequests,
      baseTime + 10000
    );

    expect(result.success).toBe(true);
    expect(result.data?.cancelledReservations).toHaveLength(2);

    const activeRemaining = result.data?.updatedRequests.filter(
      (r) => r.status === 'approved'
    );
    expect(activeRemaining).toHaveLength(0);
  });
});
