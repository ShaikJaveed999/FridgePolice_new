import type { FoodItem, PortionRequest, DerivedItemQuantities } from '../types';

/**
 * Derives the authoritative quantities for a given food item.
 * 
 * Rules:
 * 1. If an item is spoiled or discarded:
 *    - Reserved quantity is 0
 *    - Available quantity is 0
 * 2. If an item is active:
 *    - Active reservations are requests where status === 'approved' AND (expiresAt is not set OR now < expiresAt)
 *    - Pending requests do NOT count as reservations.
 *    - Reserved quantity = sum of requested quantities of active reservations.
 *    - Available quantity = max(0, totalQuantity - reservedQuantity).
 *    - Reserved quantities are never displayed as available.
 */
export function computeItemQuantities(
  item: FoodItem,
  requests: PortionRequest[],
  now: number = Date.now()
): DerivedItemQuantities {
  if (item.status !== 'active') {
    return {
      totalQuantity: item.totalQuantity,
      reservedQuantity: 0,
      availableQuantity: 0,
      activeReservationsCount: 0,
    };
  }

  const activeReservations = requests.filter(
    (r) =>
      r.foodItemId === item.id &&
      r.status === 'approved' &&
      (r.expiresAt === undefined || now < r.expiresAt)
  );

  const reservedQuantity = activeReservations.reduce(
    (sum, r) => sum + r.requestedQuantity,
    0
  );

  const availableQuantity = Math.max(0, item.totalQuantity - reservedQuantity);

  return {
    totalQuantity: item.totalQuantity,
    reservedQuantity,
    availableQuantity,
    activeReservationsCount: activeReservations.length,
  };
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateFoodItemInput(
  name: string,
  owner: string,
  totalQuantity: number,
  unit: string
): ValidationResult {
  if (!name || !name.trim()) {
    return { isValid: false, error: 'Food item name is required.' };
  }
  if (!owner || !owner.trim()) {
    return { isValid: false, error: 'Owner name is required.' };
  }
  if (!Number.isInteger(totalQuantity)) {
    return { isValid: false, error: 'Quantity must be an integer (no decimals).' };
  }
  if (totalQuantity <= 0) {
    return { isValid: false, error: 'Quantity must be greater than zero.' };
  }
  if (!unit || !unit.trim()) {
    return { isValid: false, error: 'Unit is required (e.g., %, slices, ml, cans).' };
  }
  return { isValid: true };
}
