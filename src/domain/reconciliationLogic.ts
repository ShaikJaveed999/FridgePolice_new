import type { FoodItem, PortionRequest, InventoryAdjustment } from '../types';
import { generateId } from '../utils/id';

export interface ReconciliationResult {
  updatedItems: FoodItem[];
  updatedRequests: PortionRequest[];
  adjustment: InventoryAdjustment;
  cancelledReservations: PortionRequest[];
  explanation: string;
}

export interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Validates and reconciles physical inventory when the real fridge contents differ from the recorded state.
 * Implements Scenario 4 requirements:
 * - Rejects negative quantities.
 * - Safely reconciles outstanding reservations when actual quantity < recorded quantity.
 * - Enforces that reserved quantity never exceeds actual physical quantity.
 * - Deterministic cancellation rule: FIFO by approvedAt (earliest approvals preserved, newer ones cancelled).
 * - Leaves audit history record.
 */
export function reconcileInventory(
  foodItemId: string,
  actualQuantity: number,
  reason: string,
  adjustedBy: string,
  foodItems: FoodItem[],
  requests: PortionRequest[],
  now: number = Date.now()
): ActionResult<ReconciliationResult> {
  const item = foodItems.find((f) => f.id === foodItemId);
  if (!item) {
    return { success: false, error: `Food item with ID ${foodItemId} not found.` };
  }

  if (item.status === 'discarded' || item.status === 'spoiled') {
    return {
      success: false,
      error: `Cannot reconcile inventory: Food item is ${item.status}.`,
    };
  }

  if (!Number.isInteger(actualQuantity)) {
    return { success: false, error: 'Actual quantity must be an integer (no decimals).' };
  }

  if (actualQuantity < 0) {
    return { success: false, error: 'Negative quantities are strictly forbidden.' };
  }

  if (!reason || !reason.trim()) {
    return { success: false, error: 'A reason for inventory reconciliation is required.' };
  }

  if (!adjustedBy || !adjustedBy.trim()) {
    return { success: false, error: 'Roommate performing the reconciliation is required.' };
  }

  const previousQuantity = item.totalQuantity;
  const difference = actualQuantity - previousQuantity;

  // Active reservations for this specific item
  const activeReservations = requests.filter(
    (r) =>
      r.foodItemId === foodItemId &&
      r.status === 'approved' &&
      (r.expiresAt === undefined || now < r.expiresAt)
  );

  const totalReserved = activeReservations.reduce(
    (sum, r) => sum + r.requestedQuantity,
    0
  );

  const cancelledReservations: PortionRequest[] = [];
  let explanation = '';

  let updatedRequests = [...requests];

  if (actualQuantity < totalReserved) {
    // Physical shortage! Active reservations exceed actual physical quantity.
    // Deterministic FIFO strategy: Sort by approvedAt ascending (earliest approvals honored first)
    const sortedReservations = [...activeReservations].sort((a, b) => {
      const timeA = a.approvedAt ?? a.createdAt;
      const timeB = b.approvedAt ?? b.createdAt;
      return timeA - timeB;
    });

    let capacityRemaining = actualQuantity;

    for (const res of sortedReservations) {
      if (capacityRemaining >= res.requestedQuantity) {
        // Can be fulfilled
        capacityRemaining -= res.requestedQuantity;
      } else {
        // Cannot be fully fulfilled: cancel reservation to prevent physical over-allocation
        const cancelled: PortionRequest = {
          ...res,
          status: 'cancelled',
          cancelledAt: now,
          cancellationReason: `Reconciliation shortage: Physical inventory audited to ${actualQuantity} ${item.unit}. Could not fulfill ${res.requestedQuantity} ${item.unit}.`,
        };
        cancelledReservations.push(cancelled);
      }
    }

    if (cancelledReservations.length > 0) {
      const cancelledIds = new Set(cancelledReservations.map((c) => c.id));
      updatedRequests = updatedRequests.map((r) => {
        if (cancelledIds.has(r.id)) {
          const matchingCancelled = cancelledReservations.find((c) => c.id === r.id);
          return matchingCancelled || r;
        }
        return r;
      });

      const requesters = cancelledReservations.map((c) => `${c.requester} (${c.requestedQuantity} ${item.unit})`).join(', ');
      explanation = `Audited physical quantity (${actualQuantity} ${item.unit}) was less than total reserved portions (${totalReserved} ${item.unit}). To prevent over-allocation, ${cancelledReservations.length} reservation(s) were cancelled using FIFO priority: ${requesters}.`;
    }
  } else {
    explanation = difference >= 0
      ? `Inventory increased by ${difference} ${item.unit}. All existing reservations remain intact.`
      : `Inventory decreased by ${Math.abs(difference)} ${item.unit}. Remaining quantity is sufficient to honor all ${activeReservations.length} active reservation(s).`;
  }

  const updatedItems = foodItems.map((f) => {
    if (f.id === foodItemId) {
      return {
        ...f,
        totalQuantity: actualQuantity,
        updatedAt: now,
      };
    }
    return f;
  });

  const adjustment: InventoryAdjustment = {
    id: generateId('adj'),
    foodItemId,
    foodItemName: item.name,
    previousQuantity,
    correctedQuantity: actualQuantity,
    difference,
    reason: reason.trim(),
    timestamp: now,
    adjustedBy: adjustedBy.trim(),
    impactedReservationsCount: cancelledReservations.length,
    details: explanation,
  };

  return {
    success: true,
    data: {
      updatedItems,
      updatedRequests,
      adjustment,
      cancelledReservations,
      explanation,
    },
  };
}
