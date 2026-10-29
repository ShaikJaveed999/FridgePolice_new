import { describe, it, expect } from 'vitest';
import type { AppState, FoodItem, PortionRequest } from '../types';
import { appReducer } from '../state/reducer';
import { computeItemQuantities } from '../domain/inventoryLogic';
import { claimPortionRequest } from '../domain/requestLogic';

describe('Scenario 2: Approved but Never Consumed Food Lifecycle', () => {
  const baseTime = 1700000000000;
  const lifetime = 5 * 60 * 1000; // 5 minutes

  function createCheesecakeState(): AppState {
    const cake: FoodItem = {
      id: 'item-cake-01',
      name: 'Cheesecake',
      owner: 'Alice',
      totalQuantity: 4,
      unit: 'slices',
      status: 'active',
      createdAt: baseTime,
      updatedAt: baseTime,
    };

    const req: PortionRequest = {
      id: 'req-bob-cake',
      foodItemId: cake.id,
      requester: 'Bob',
      requestedQuantity: 1,
      status: 'pending',
      createdAt: baseTime + 1000,
    };

    return {
      foodItems: [cake],
      portionRequests: [req],
      inventoryAdjustments: [],
      activityLog: [],
      currentUser: 'Alice',
      reservationLifetimeMs: lifetime,
    };
  }

  it('approving reservation sets expiry time exactly 5 minutes in the future', () => {
    const state = createCheesecakeState();
    const approved = appReducer(
      state,
      { type: 'APPROVE_REQUEST', payload: { requestId: 'req-bob-cake' } },
      baseTime + 2000
    );

    const req = approved.state.portionRequests.find((r) => r.id === 'req-bob-cake')!;
    expect(req.status).toBe('approved');
    expect(req.approvedAt).toBe(baseTime + 2000);
    expect(req.expiresAt).toBe(baseTime + 2000 + lifetime);

    const cake = approved.state.foodItems[0];
    const q = computeItemQuantities(cake, approved.state.portionRequests, baseTime + 2000);
    expect(q.reservedQuantity).toBe(1);
    expect(q.availableQuantity).toBe(3);
  });

  it('unclaimed reservation expires automatically when time elapses, restoring available quantity', () => {
    const state = createCheesecakeState();
    const approved = appReducer(
      state,
      { type: 'APPROVE_REQUEST', payload: { requestId: 'req-bob-cake' } },
      baseTime
    );

    const expiryTime = baseTime + lifetime;

    // Just before expiry (4m 59s): still reserved
    const qBefore = computeItemQuantities(
      approved.state.foodItems[0],
      approved.state.portionRequests,
      expiryTime - 1000
    );
    expect(qBefore.reservedQuantity).toBe(1);
    expect(qBefore.availableQuantity).toBe(3);

    // At or after expiry: TICK_TIME transitions status to 'expired'
    const ticked = appReducer(
      approved.state,
      { type: 'TICK_TIME', payload: { now: expiryTime + 1000 } },
      expiryTime + 1000
    );

    const req = ticked.state.portionRequests.find((r) => r.id === 'req-bob-cake')!;
    expect(req.status).toBe('expired');
    expect(req.expiredAt).toBe(expiryTime + 1000);

    // Reserved quantity is now 0, available is restored to full 4 slices!
    const qAfter = computeItemQuantities(
      ticked.state.foodItems[0],
      ticked.state.portionRequests,
      expiryTime + 1000
    );
    expect(qAfter.reservedQuantity).toBe(0);
    expect(qAfter.availableQuantity).toBe(4);
  });

  it('instant simulation of expiry transitions request to expired immediately and releases portion', () => {
    const state = createCheesecakeState();
    const approved = appReducer(
      state,
      { type: 'APPROVE_REQUEST', payload: { requestId: 'req-bob-cake' } },
      baseTime
    );

    const simulated = appReducer(
      approved.state,
      { type: 'SIMULATE_EXPIRE_REQUEST', payload: { requestId: 'req-bob-cake' } },
      baseTime + 5000
    );

    expect(simulated.success).toBe(true);
    const req = simulated.state.portionRequests.find((r) => r.id === 'req-bob-cake')!;
    expect(req.status).toBe('expired');

    const cake = simulated.state.foodItems[0];
    const q = computeItemQuantities(cake, simulated.state.portionRequests, baseTime + 5000);
    expect(q.reservedQuantity).toBe(0);
    expect(q.availableQuantity).toBe(4);
  });

  it('an expired request cannot be claimed', () => {
    const state = createCheesecakeState();
    const approved = appReducer(
      state,
      { type: 'APPROVE_REQUEST', payload: { requestId: 'req-bob-cake' } },
      baseTime
    );
    const expired = appReducer(
      approved.state,
      { type: 'SIMULATE_EXPIRE_REQUEST', payload: { requestId: 'req-bob-cake' } },
      baseTime + 5000
    );

    // Try to claim expired request
    const claimResult = appReducer(
      expired.state,
      { type: 'CLAIM_PORTION', payload: { requestId: 'req-bob-cake' } },
      baseTime + 6000
    );

    expect(claimResult.success).toBe(false);
    expect(claimResult.error).toMatch(/Cannot claim: This reservation has expired/i);
  });

  it('enforces simultaneous expiry and claim rule: rejects claim if current time >= expiresAt', () => {
    const state = createCheesecakeState();
    const approved = appReducer(
      state,
      { type: 'APPROVE_REQUEST', payload: { requestId: 'req-bob-cake' } },
      baseTime
    );

    const expiryTime = baseTime + lifetime;

    // Even if status string has not transitioned yet, domain logic rejects claim at or after expiryTime
    const result = claimPortionRequest(
      'req-bob-cake',
      approved.state.foodItems,
      approved.state.portionRequests,
      expiryTime // Exactly at expiry
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/expired at this exact moment/i);
  });

  it('a valid claim transitions status to claimed and permanently deducts physical quantity', () => {
    const state = createCheesecakeState();
    const approved = appReducer(
      state,
      { type: 'APPROVE_REQUEST', payload: { requestId: 'req-bob-cake' } },
      baseTime
    );

    const claimed = appReducer(
      approved.state,
      { type: 'CLAIM_PORTION', payload: { requestId: 'req-bob-cake' } },
      baseTime + 30000
    );

    expect(claimed.success).toBe(true);
    const req = claimed.state.portionRequests.find((r) => r.id === 'req-bob-cake')!;
    expect(req.status).toBe('claimed');
    expect(req.claimedAt).toBe(baseTime + 30000);

    // Physical totalQuantity decreased from 4 to 3
    const cake = claimed.state.foodItems[0];
    expect(cake.totalQuantity).toBe(3);

    // Reserved quantity is now 0, available is 3
    const q = computeItemQuantities(cake, claimed.state.portionRequests, baseTime + 30000);
    expect(q.reservedQuantity).toBe(0);
    expect(q.availableQuantity).toBe(3);

    // Attempting to claim a second time fails
    const secondClaim = appReducer(
      claimed.state,
      { type: 'CLAIM_PORTION', payload: { requestId: 'req-bob-cake' } },
      baseTime + 40000
    );
    expect(secondClaim.success).toBe(false);
    expect(secondClaim.error).toMatch(/already been claimed/i);
  });

  it('discarding food releases reservations, cancels requests, and prevents future claims', () => {
    const state = createCheesecakeState();
    const approved = appReducer(
      state,
      { type: 'APPROVE_REQUEST', payload: { requestId: 'req-bob-cake' } },
      baseTime
    );

    // Discard the cheesecake
    const discarded = appReducer(
      approved.state,
      { type: 'DISCARD_FOOD_ITEM', payload: { foodItemId: 'item-cake-01', reason: 'Found mold' } },
      baseTime + 10000
    );

    expect(discarded.success).toBe(true);
    const cake = discarded.state.foodItems[0];
    expect(cake.status).toBe('discarded');

    const req = discarded.state.portionRequests.find((r) => r.id === 'req-bob-cake')!;
    expect(req.status).toBe('cancelled');
    expect(req.cancellationReason).toContain('Found mold');

    // Available quantity for discarded food is always 0
    const q = computeItemQuantities(cake, discarded.state.portionRequests, baseTime + 10000);
    expect(q.availableQuantity).toBe(0);
    expect(q.reservedQuantity).toBe(0);

    // Trying to claim cancelled reservation fails
    const claimResult = appReducer(
      discarded.state,
      { type: 'CLAIM_PORTION', payload: { requestId: 'req-bob-cake' } },
      baseTime + 20000
    );
    expect(claimResult.success).toBe(false);
  });
});
