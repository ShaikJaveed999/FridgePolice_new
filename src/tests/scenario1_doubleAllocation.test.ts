import { describe, it, expect } from 'vitest';
import type { AppState, FoodItem, PortionRequest } from '../types';
import { appReducer } from '../state/reducer';
import { computeItemQuantities } from '../domain/inventoryLogic';
import { approvePortionRequest } from '../domain/requestLogic';

describe('Scenario 1: Prevent Double Allocation', () => {
  const baseTime = 1700000000000;

  function createPizzaState(): AppState {
    const pizza: FoodItem = {
      id: 'pizza-unique-id-01',
      name: 'Pepperoni Pizza',
      owner: 'Alice',
      totalQuantity: 25, // Exactly 25% remaining
      unit: '%',
      status: 'active',
      createdAt: baseTime,
      updatedAt: baseTime,
    };

    const reqB: PortionRequest = {
      id: 'req-bob-pizza',
      foodItemId: pizza.id,
      requester: 'Bob',
      requestedQuantity: 25,
      status: 'pending',
      createdAt: baseTime + 1000,
    };

    const reqC: PortionRequest = {
      id: 'req-charlie-pizza',
      foodItemId: pizza.id,
      requester: 'Charlie',
      requestedQuantity: 25,
      status: 'pending',
      createdAt: baseTime + 2000,
    };

    return {
      foodItems: [pizza],
      portionRequests: [reqB, reqC],
      inventoryAdjustments: [],
      activityLog: [],
      currentUser: 'Alice',
      reservationLifetimeMs: 5 * 60 * 1000,
    };
  }

  it('validates initial available inventory is 25% and pending requests do not count as reservations', () => {
    const state = createPizzaState();
    const pizza = state.foodItems[0];
    const quantities = computeItemQuantities(pizza, state.portionRequests, baseTime);

    expect(quantities.totalQuantity).toBe(25);
    expect(quantities.reservedQuantity).toBe(0);
    expect(quantities.availableQuantity).toBe(25);
    expect(quantities.activeReservationsCount).toBe(0);
  });

  it('approving Bob’s request atomically reserves the 25% and drops available quantity to 0%', () => {
    const state = createPizzaState();
    const result = appReducer(
      state,
      { type: 'APPROVE_REQUEST', payload: { requestId: 'req-bob-pizza' } },
      baseTime + 3000
    );

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();

    const updatedBobReq = result.state.portionRequests.find((r) => r.id === 'req-bob-pizza');
    expect(updatedBobReq?.status).toBe('approved');
    expect(updatedBobReq?.approvedAt).toBe(baseTime + 3000);
    expect(updatedBobReq?.expiresAt).toBe(baseTime + 3000 + 5 * 60 * 1000);

    const pizza = result.state.foodItems[0];
    const quantities = computeItemQuantities(pizza, result.state.portionRequests, baseTime + 3000);
    expect(quantities.totalQuantity).toBe(25);
    expect(quantities.reservedQuantity).toBe(25);
    expect(quantities.availableQuantity).toBe(0);
  });

  it('rejects a second competing approval for Charlie because unreserved available quantity is 0%', () => {
    const state = createPizzaState();

    // 1. Approve Bob's request
    const afterBob = appReducer(
      state,
      { type: 'APPROVE_REQUEST', payload: { requestId: 'req-bob-pizza' } },
      baseTime + 3000
    );
    expect(afterBob.success).toBe(true);

    // 2. Try to approve Charlie's request for the same 25%
    const afterCharlie = appReducer(
      afterBob.state,
      { type: 'APPROVE_REQUEST', payload: { requestId: 'req-charlie-pizza' } },
      baseTime + 4000
    );

    // Must be rejected
    expect(afterCharlie.success).toBe(false);
    expect(afterCharlie.error).toMatch(/Insufficient unreserved quantity available/i);
    expect(afterCharlie.error).toContain('Only 0 % unreserved');

    // Charlie's request must remain pending, NOT approved
    const charlieReq = afterCharlie.state.portionRequests.find((r) => r.id === 'req-charlie-pizza');
    expect(charlieReq?.status).toBe('pending');

    // Reserved quantity remains exactly 25%, never 50%
    const pizza = afterCharlie.state.foodItems[0];
    const quantities = computeItemQuantities(pizza, afterCharlie.state.portionRequests, baseTime + 4000);
    expect(quantities.reservedQuantity).toBe(25);
    expect(quantities.availableQuantity).toBe(0);
  });

  it('pure domain function approvePortionRequest returns error when unreserved quantity is insufficient', () => {
    const state = createPizzaState();
    const pizza = state.foodItems[0];

    // Simulate direct domain call
    const firstCall = approvePortionRequest(
      'req-bob-pizza',
      [pizza],
      state.portionRequests,
      300000,
      baseTime
    );
    expect(firstCall.success).toBe(true);

    // Second call with updated requests
    const secondCall = approvePortionRequest(
      'req-charlie-pizza',
      [pizza],
      firstCall.data!.updatedRequests,
      300000,
      baseTime
    );
    expect(secondCall.success).toBe(false);
    expect(secondCall.error).toContain('Insufficient unreserved quantity');
  });
});
