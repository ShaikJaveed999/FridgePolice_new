import { describe, it, expect } from 'vitest';
import type { AppState, FoodItem } from '../types';
import { appReducer } from '../state/reducer';
import { computeItemQuantities } from '../domain/inventoryLogic';

describe('Scenario 3: Identical Item Names Belonging to Different Owners', () => {
  const baseTime = 1700000000000;

  function createDualKetchupState(): AppState {
    const aliceKetchup: FoodItem = {
      id: 'item-ketchup-alice-uuid-001',
      name: 'Heinz Tomato Ketchup',
      owner: 'Alice',
      totalQuantity: 100,
      unit: '%',
      status: 'active',
      createdAt: baseTime,
      updatedAt: baseTime,
    };

    const bobKetchup: FoodItem = {
      id: 'item-ketchup-bob-uuid-002',
      name: 'Heinz Tomato Ketchup',
      owner: 'Bob',
      totalQuantity: 50,
      unit: '%',
      status: 'active',
      createdAt: baseTime,
      updatedAt: baseTime,
    };

    return {
      foodItems: [aliceKetchup, bobKetchup],
      portionRequests: [],
      inventoryAdjustments: [],
      activityLog: [],
      currentUser: 'Charlie',
      reservationLifetimeMs: 5 * 60 * 1000,
    };
  }

  it('allows two separate items with the exact same name but distinct UUIDs and owners', () => {
    const state = createDualKetchupState();
    expect(state.foodItems).toHaveLength(2);
    expect(state.foodItems[0].name).toBe(state.foodItems[1].name);
    expect(state.foodItems[0].id).not.toBe(state.foodItems[1].id);
    expect(state.foodItems[0].owner).toBe('Alice');
    expect(state.foodItems[1].owner).toBe('Bob');
  });

  it('requesting from Alice’s ketchup only reserves Alice’s bottle and leaves Bob’s untouched', () => {
    const state = createDualKetchupState();

    // 1. Charlie requests 20% from Alice's ketchup using its unique ID
    const requestResult = appReducer(
      state,
      {
        type: 'REQUEST_PORTION',
        payload: {
          foodItemId: 'item-ketchup-alice-uuid-001',
          requester: 'Charlie',
          requestedQuantity: 20,
        },
      },
      baseTime + 1000
    );

    expect(requestResult.success).toBe(true);
    const req = requestResult.state.portionRequests[0];
    expect(req.foodItemId).toBe('item-ketchup-alice-uuid-001');

    // 2. Alice approves Charlie's request
    const approveResult = appReducer(
      requestResult.state,
      { type: 'APPROVE_REQUEST', payload: { requestId: req.id } },
      baseTime + 2000
    );

    expect(approveResult.success).toBe(true);

    // Verify Alice's bottle
    const aliceItem = approveResult.state.foodItems.find(
      (f) => f.id === 'item-ketchup-alice-uuid-001'
    )!;
    const aliceQ = computeItemQuantities(
      aliceItem,
      approveResult.state.portionRequests,
      baseTime + 2000
    );
    expect(aliceQ.totalQuantity).toBe(100);
    expect(aliceQ.reservedQuantity).toBe(20);
    expect(aliceQ.availableQuantity).toBe(80);

    // Verify Bob's bottle remains 100% completely unchanged
    const bobItem = approveResult.state.foodItems.find(
      (f) => f.id === 'item-ketchup-bob-uuid-002'
    )!;
    const bobQ = computeItemQuantities(
      bobItem,
      approveResult.state.portionRequests,
      baseTime + 2000
    );
    expect(bobQ.totalQuantity).toBe(50);
    expect(bobQ.reservedQuantity).toBe(0);
    expect(bobQ.availableQuantity).toBe(50);
  });

  it('claiming or reconciling Alice’s ketchup does not alter Bob’s ketchup', () => {
    const state = createDualKetchupState();

    // Reconcile Alice's ketchup to 70%
    const reconciled = appReducer(
      state,
      {
        type: 'RECONCILE_INVENTORY',
        payload: {
          foodItemId: 'item-ketchup-alice-uuid-001',
          actualQuantity: 70,
          reason: 'Alice measured 70% remaining bottle',
          adjustedBy: 'Alice',
        },
      },
      baseTime + 3000
    );

    expect(reconciled.success).toBe(true);

    const aliceItem = reconciled.state.foodItems.find(
      (f) => f.id === 'item-ketchup-alice-uuid-001'
    )!;
    expect(aliceItem.totalQuantity).toBe(70);

    const bobItem = reconciled.state.foodItems.find(
      (f) => f.id === 'item-ketchup-bob-uuid-002'
    )!;
    expect(bobItem.totalQuantity).toBe(50);
  });
});
