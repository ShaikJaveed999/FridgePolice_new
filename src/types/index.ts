export type FoodItemStatus = 'active' | 'spoiled' | 'discarded';

export interface FoodItem {
  id: string; // Unique physical item ID (UUID)
  name: string;
  owner: string;
  totalQuantity: number; // Integer quantity or percentage (>= 0)
  unit: string; // e.g., '%', 'slices', 'ml', 'cans', 'portions'
  status: FoodItemStatus;
  createdAt: number;
  updatedAt: number;
  notes?: string;
}

export type RequestStatus =
  | 'pending'
  | 'approved'
  | 'claimed'
  | 'expired'
  | 'rejected'
  | 'cancelled';

export interface PortionRequest {
  id: string; // Unique request ID (UUID)
  foodItemId: string; // Target physical food item ID
  requester: string; // Roommate who wants the portion
  requestedQuantity: number; // Positive integer
  status: RequestStatus;
  createdAt: number;
  approvedAt?: number;
  expiresAt?: number; // Expiry timestamp for reservation
  claimedAt?: number;
  rejectedAt?: number;
  cancelledAt?: number;
  expiredAt?: number;
  rejectionReason?: string;
  cancellationReason?: string;
}

export interface InventoryAdjustment {
  id: string;
  foodItemId: string;
  foodItemName: string;
  previousQuantity: number;
  correctedQuantity: number;
  difference: number;
  reason: string;
  timestamp: number;
  adjustedBy: string;
  impactedReservationsCount: number;
  details?: string;
}

export type ActivityType =
  | 'item_added'
  | 'portion_requested'
  | 'request_approved'
  | 'portion_claimed'
  | 'reservation_expired'
  | 'request_rejected'
  | 'request_cancelled'
  | 'food_discarded'
  | 'inventory_corrected'
  | 'demo_reset';

export interface ActivityLogEntry {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: number;
  actor: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export interface DerivedItemQuantities {
  totalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  activeReservationsCount: number;
}

export interface AppState {
  foodItems: FoodItem[];
  portionRequests: PortionRequest[];
  inventoryAdjustments: InventoryAdjustment[];
  activityLog: ActivityLogEntry[];
  currentUser: string;
  reservationLifetimeMs: number; // Default: 300,000 (5 minutes)
}
