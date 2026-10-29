import type { FoodItem, PortionRequest } from '../types';
import { computeItemQuantities } from './inventoryLogic';

export interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Validates and approves a pending portion request.
 * Implements strict double-allocation prevention (Scenario 1).
 */
export function approvePortionRequest(
  requestId: string,
  foodItems: FoodItem[],
  requests: PortionRequest[],
  reservationLifetimeMs: number = 5 * 60 * 1000,
  now: number = Date.now()
): ActionResult<{ updatedRequests: PortionRequest[]; approvedRequest: PortionRequest }> {
  const request = requests.find((r) => r.id === requestId);
  if (!request) {
    return { success: false, error: `Request with ID ${requestId} not found.` };
  }

  if (request.status !== 'pending') {
    return {
      success: false,
      error: `Cannot approve request: Status is '${request.status}' (expected 'pending').`,
    };
  }

  const item = foodItems.find((f) => f.id === request.foodItemId);
  if (!item) {
    return { success: false, error: `Associated food item not found.` };
  }

  if (item.status !== 'active') {
    return {
      success: false,
      error: `Cannot approve request: Food item is ${item.status}.`,
    };
  }

  // Authoritatively compute current available quantity (total minus existing unexpired reservations)
  const { availableQuantity } = computeItemQuantities(item, requests, now);

  if (request.requestedQuantity > availableQuantity) {
    return {
      success: false,
      error: `Insufficient unreserved quantity available. Only ${availableQuantity} ${item.unit} unreserved, but ${request.requestedQuantity} was requested.`,
    };
  }

  const approvedRequest: PortionRequest = {
    ...request,
    status: 'approved',
    approvedAt: now,
    expiresAt: now + reservationLifetimeMs,
  };

  const updatedRequests = requests.map((r) =>
    r.id === requestId ? approvedRequest : r
  );

  return {
    success: true,
    data: { updatedRequests, approvedRequest },
  };
}

/**
 * Rejects a portion request.
 */
export function rejectPortionRequest(
  requestId: string,
  requests: PortionRequest[],
  reason: string = 'Declined by owner',
  now: number = Date.now()
): ActionResult<{ updatedRequests: PortionRequest[]; rejectedRequest: PortionRequest }> {
  const request = requests.find((r) => r.id === requestId);
  if (!request) {
    return { success: false, error: `Request with ID ${requestId} not found.` };
  }

  if (request.status !== 'pending') {
    return {
      success: false,
      error: `Cannot reject request: Status is '${request.status}' (expected 'pending').`,
    };
  }

  const rejectedRequest: PortionRequest = {
    ...request,
    status: 'rejected',
    rejectedAt: now,
    rejectionReason: reason,
  };

  const updatedRequests = requests.map((r) =>
    r.id === requestId ? rejectedRequest : r
  );

  return {
    success: true,
    data: { updatedRequests, rejectedRequest },
  };
}

/**
 * Claims (consumes) an approved portion.
 * Enforces:
 * 1. Must be currently approved.
 * 2. Must not be expired (now < expiresAt). Validates current time before claim.
 * 3. Food item must be active (not discarded/spoiled).
 * 4. Cannot be claimed twice.
 * 5. Deducts the claimed portion from physical item totalQuantity.
 */
export function claimPortionRequest(
  requestId: string,
  foodItems: FoodItem[],
  requests: PortionRequest[],
  now: number = Date.now()
): ActionResult<{
  updatedItems: FoodItem[];
  updatedRequests: PortionRequest[];
  claimedRequest: PortionRequest;
}> {
  const request = requests.find((r) => r.id === requestId);
  if (!request) {
    return { success: false, error: `Request with ID ${requestId} not found.` };
  }

  if (request.status === 'claimed') {
    return { success: false, error: 'This portion has already been claimed and consumed.' };
  }

  if (request.status === 'expired') {
    return { success: false, error: 'Cannot claim: This reservation has expired.' };
  }

  if (request.status !== 'approved') {
    return {
      success: false,
      error: `Cannot claim: Request status is '${request.status}' (must be 'approved').`,
    };
  }

  // Critical rule: Validate current time before allowing claim (simultaneous expiry & claim rule)
  if (request.expiresAt && now >= request.expiresAt) {
    return {
      success: false,
      error: 'Cannot claim: Reservation just expired at this exact moment.',
    };
  }

  const item = foodItems.find((f) => f.id === request.foodItemId);
  if (!item) {
    return { success: false, error: 'Associated food item not found.' };
  }

  if (item.status !== 'active') {
    return {
      success: false,
      error: `Cannot claim: Food item has been marked as ${item.status}.`,
    };
  }

  // Ensure item has enough physical quantity left to fulfill claim
  if (item.totalQuantity < request.requestedQuantity) {
    return {
      success: false,
      error: `Cannot claim: Insufficient physical food remaining (${item.totalQuantity} ${item.unit} left).`,
    };
  }

  const claimedRequest: PortionRequest = {
    ...request,
    status: 'claimed',
    claimedAt: now,
  };

  const updatedRequests = requests.map((r) =>
    r.id === requestId ? claimedRequest : r
  );

  const updatedItems = foodItems.map((f) => {
    if (f.id === item.id) {
      return {
        ...f,
        totalQuantity: Math.max(0, f.totalQuantity - request.requestedQuantity),
        updatedAt: now,
      };
    }
    return f;
  });

  return {
    success: true,
    data: { updatedItems, updatedRequests, claimedRequest },
  };
}

/**
 * Checks all active reservations against the current timestamp.
 * Expired reservations transition from 'approved' to 'expired'.
 * Returns newly expired requests so quantity is automatically released and activity logged.
 */
export function processReservationExpirations(
  requests: PortionRequest[],
  now: number = Date.now()
): { updatedRequests: PortionRequest[]; newlyExpired: PortionRequest[] } {
  const newlyExpired: PortionRequest[] = [];

  const updatedRequests = requests.map((r) => {
    if (r.status === 'approved' && r.expiresAt && now >= r.expiresAt) {
      const expired: PortionRequest = {
        ...r,
        status: 'expired',
        expiredAt: now,
      };
      newlyExpired.push(expired);
      return expired;
    }
    return r;
  });

  return { updatedRequests, newlyExpired };
}

/**
 * Marks a food item as spoiled or discarded.
 * Releases all outstanding reservations and cancels all pending requests.
 * Expired reservations or discarded items can never restore food quantities.
 */
export function discardFoodItem(
  foodItemId: string,
  foodItems: FoodItem[],
  requests: PortionRequest[],
  reason: string = 'Spoiled / Discarded',
  now: number = Date.now()
): ActionResult<{
  updatedItems: FoodItem[];
  updatedRequests: PortionRequest[];
  cancelledRequests: PortionRequest[];
}> {
  const item = foodItems.find((f) => f.id === foodItemId);
  if (!item) {
    return { success: false, error: `Food item with ID ${foodItemId} not found.` };
  }

  if (item.status === 'discarded' || item.status === 'spoiled') {
    return { success: false, error: 'Food item has already been discarded.' };
  }

  const updatedItems = foodItems.map((f) =>
    f.id === foodItemId
      ? { ...f, status: 'discarded' as const, updatedAt: now }
      : f
  );

  const cancelledRequests: PortionRequest[] = [];
  const updatedRequests = requests.map((r) => {
    if (r.foodItemId === foodItemId && (r.status === 'pending' || r.status === 'approved')) {
      const cancelled: PortionRequest = {
        ...r,
        status: 'cancelled',
        cancelledAt: now,
        cancellationReason: `Item discarded: ${reason}`,
      };
      cancelledRequests.push(cancelled);
      return cancelled;
    }
    return r;
  });

  return {
    success: true,
    data: { updatedItems, updatedRequests, cancelledRequests },
  };
}
