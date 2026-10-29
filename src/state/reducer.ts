import type { AppState, FoodItem, PortionRequest, ActivityLogEntry } from '../types';
import {
  approvePortionRequest,
  rejectPortionRequest,
  claimPortionRequest,
  processReservationExpirations,
  discardFoodItem,
} from '../domain/requestLogic';
import { reconcileInventory } from '../domain/reconciliationLogic';
import { computeItemQuantities, validateFoodItemInput } from '../domain/inventoryLogic';
import { generateId } from '../utils/id';
import {
  createInitialSeedState,
  setupScenario1State,
  setupScenario2State,
  setupScenario3State,
  setupScenario4State,
} from '../domain/seedData';

export type Action =
  | { type: 'SET_CURRENT_USER'; payload: { user: string } }
  | {
      type: 'ADD_FOOD_ITEM';
      payload: {
        name: string;
        owner: string;
        totalQuantity: number;
        unit: string;
        notes?: string;
      };
    }
  | {
      type: 'REQUEST_PORTION';
      payload: {
        foodItemId: string;
        requester: string;
        requestedQuantity: number;
      };
    }
  | { type: 'APPROVE_REQUEST'; payload: { requestId: string } }
  | { type: 'REJECT_REQUEST'; payload: { requestId: string; reason?: string } }
  | { type: 'CLAIM_PORTION'; payload: { requestId: string } }
  | { type: 'CANCEL_REQUEST'; payload: { requestId: string; reason?: string } }
  | { type: 'DISCARD_FOOD_ITEM'; payload: { foodItemId: string; reason?: string } }
  | {
      type: 'RECONCILE_INVENTORY';
      payload: {
        foodItemId: string;
        actualQuantity: number;
        reason: string;
        adjustedBy: string;
      };
    }
  | { type: 'SIMULATE_EXPIRE_REQUEST'; payload: { requestId: string } }
  | { type: 'TICK_TIME'; payload: { now: number } }
  | { type: 'LOAD_DEMO_SCENARIO'; payload: { scenarioNumber: 1 | 2 | 3 | 4 } }
  | { type: 'RESET_DEMO_DATA' };

export interface ReducerResult {
  state: AppState;
  success: boolean;
  error?: string;
  successMessage?: string;
}

/**
 * Pure state reducer for FridgePolice.
 * Can be run in pure node tests with injectable `now` timestamp.
 */
export function appReducer(
  state: AppState,
  action: Action,
  now: number = Date.now()
): ReducerResult {
  switch (action.type) {
    case 'SET_CURRENT_USER': {
      return {
        state: { ...state, currentUser: action.payload.user },
        success: true,
      };
    }

    case 'ADD_FOOD_ITEM': {
      const { name, owner, totalQuantity, unit, notes } = action.payload;
      const validation = validateFoodItemInput(name, owner, totalQuantity, unit);
      if (!validation.isValid) {
        return { state, success: false, error: validation.error };
      }

      const newItem: FoodItem = {
        id: generateId('item'),
        name: name.trim(),
        owner: owner.trim(),
        totalQuantity,
        unit: unit.trim(),
        status: 'active',
        createdAt: now,
        updatedAt: now,
        notes: notes?.trim() || undefined,
      };

      const logEntry: ActivityLogEntry = {
        id: generateId('act'),
        type: 'item_added',
        description: `${newItem.owner} added ${newItem.name} (${newItem.totalQuantity} ${newItem.unit})`,
        timestamp: now,
        actor: newItem.owner,
        entityId: newItem.id,
      };

      return {
        state: {
          ...state,
          foodItems: [newItem, ...state.foodItems],
          activityLog: [logEntry, ...state.activityLog],
        },
        success: true,
        successMessage: `Added "${newItem.name}" to inventory!`,
      };
    }

    case 'REQUEST_PORTION': {
      const { foodItemId, requester, requestedQuantity } = action.payload;
      const item = state.foodItems.find((f) => f.id === foodItemId);
      if (!item) {
        return { state, success: false, error: 'Food item not found.' };
      }
      if (item.status !== 'active') {
        return { state, success: false, error: `Cannot request: Food item is ${item.status}.` };
      }
      if (!requester || !requester.trim()) {
        return { state, success: false, error: 'Requester name is required.' };
      }
      if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) {
        return { state, success: false, error: 'Requested quantity must be a positive integer.' };
      }

      const { availableQuantity } = computeItemQuantities(item, state.portionRequests, now);
      if (requestedQuantity > availableQuantity) {
        return {
          state,
          success: false,
          error: `Cannot request ${requestedQuantity} ${item.unit}: Only ${availableQuantity} ${item.unit} currently available.`,
        };
      }

      const newRequest: PortionRequest = {
        id: generateId('req'),
        foodItemId,
        requester: requester.trim(),
        requestedQuantity,
        status: 'pending',
        createdAt: now,
      };

      const logEntry: ActivityLogEntry = {
        id: generateId('act'),
        type: 'portion_requested',
        description: `${newRequest.requester} requested ${newRequest.requestedQuantity} ${item.unit} of ${item.name}`,
        timestamp: now,
        actor: newRequest.requester,
        entityId: newRequest.id,
      };

      return {
        state: {
          ...state,
          portionRequests: [newRequest, ...state.portionRequests],
          activityLog: [logEntry, ...state.activityLog],
        },
        success: true,
        successMessage: `Requested ${requestedQuantity} ${item.unit} of ${item.name}!`,
      };
    }

    case 'APPROVE_REQUEST': {
      const result = approvePortionRequest(
        action.payload.requestId,
        state.foodItems,
        state.portionRequests,
        state.reservationLifetimeMs,
        now
      );

      if (!result.success || !result.data) {
        return { state, success: false, error: result.error };
      }

      const { updatedRequests, approvedRequest } = result.data;
      const item = state.foodItems.find((f) => f.id === approvedRequest.foodItemId);
      const itemName = item ? item.name : 'food';
      const unit = item ? item.unit : '';

      const logEntry: ActivityLogEntry = {
        id: generateId('act'),
        type: 'request_approved',
        description: `${state.currentUser} approved ${approvedRequest.requester}’s request for ${approvedRequest.requestedQuantity} ${unit} of ${itemName} (Reserved for 5 min)`,
        timestamp: now,
        actor: state.currentUser,
        entityId: approvedRequest.id,
      };

      return {
        state: {
          ...state,
          portionRequests: updatedRequests,
          activityLog: [logEntry, ...state.activityLog],
        },
        success: true,
        successMessage: `Portion approved and reserved for ${approvedRequest.requester}!`,
      };
    }

    case 'REJECT_REQUEST': {
      const result = rejectPortionRequest(
        action.payload.requestId,
        state.portionRequests,
        action.payload.reason,
        now
      );

      if (!result.success || !result.data) {
        return { state, success: false, error: result.error };
      }

      const { updatedRequests, rejectedRequest } = result.data;
      const item = state.foodItems.find((f) => f.id === rejectedRequest.foodItemId);
      const itemName = item ? item.name : 'food';

      const logEntry: ActivityLogEntry = {
        id: generateId('act'),
        type: 'request_rejected',
        description: `${state.currentUser} rejected ${rejectedRequest.requester}’s request for ${itemName} (Reason: ${rejectedRequest.rejectionReason})`,
        timestamp: now,
        actor: state.currentUser,
        entityId: rejectedRequest.id,
      };

      return {
        state: {
          ...state,
          portionRequests: updatedRequests,
          activityLog: [logEntry, ...state.activityLog],
        },
        success: true,
        successMessage: 'Request rejected.',
      };
    }

    case 'CLAIM_PORTION': {
      const result = claimPortionRequest(
        action.payload.requestId,
        state.foodItems,
        state.portionRequests,
        now
      );

      if (!result.success || !result.data) {
        return { state, success: false, error: result.error };
      }

      const { updatedItems, updatedRequests, claimedRequest } = result.data;
      const item = state.foodItems.find((f) => f.id === claimedRequest.foodItemId);
      const itemName = item ? item.name : 'food';
      const unit = item ? item.unit : '';

      const logEntry: ActivityLogEntry = {
        id: generateId('act'),
        type: 'portion_claimed',
        description: `${claimedRequest.requester} claimed & consumed ${claimedRequest.requestedQuantity} ${unit} of ${itemName}`,
        timestamp: now,
        actor: claimedRequest.requester,
        entityId: claimedRequest.id,
      };

      return {
        state: {
          ...state,
          foodItems: updatedItems,
          portionRequests: updatedRequests,
          activityLog: [logEntry, ...state.activityLog],
        },
        success: true,
        successMessage: `Portion claimed! ${claimedRequest.requestedQuantity} ${unit} consumed.`,
      };
    }

    case 'CANCEL_REQUEST': {
      const req = state.portionRequests.find((r) => r.id === action.payload.requestId);
      if (!req) {
        return { state, success: false, error: 'Request not found.' };
      }
      if (req.status !== 'pending' && req.status !== 'approved') {
        return {
          state,
          success: false,
          error: `Cannot cancel request in status '${req.status}'.`,
        };
      }

      const updatedRequests = state.portionRequests.map((r) =>
        r.id === req.id
          ? {
              ...r,
              status: 'cancelled' as const,
              cancelledAt: now,
              cancellationReason: action.payload.reason || 'Cancelled by user',
            }
          : r
      );

      const logEntry: ActivityLogEntry = {
        id: generateId('act'),
        type: 'request_cancelled',
        description: `${state.currentUser} cancelled request #${req.id.substring(0, 8)}`,
        timestamp: now,
        actor: state.currentUser,
        entityId: req.id,
      };

      return {
        state: {
          ...state,
          portionRequests: updatedRequests,
          activityLog: [logEntry, ...state.activityLog],
        },
        success: true,
        successMessage: 'Request cancelled and reservation released.',
      };
    }

    case 'DISCARD_FOOD_ITEM': {
      const result = discardFoodItem(
        action.payload.foodItemId,
        state.foodItems,
        state.portionRequests,
        action.payload.reason,
        now
      );

      if (!result.success || !result.data) {
        return { state, success: false, error: result.error };
      }

      const { updatedItems, updatedRequests, cancelledRequests } = result.data;
      const item = state.foodItems.find((f) => f.id === action.payload.foodItemId);
      const itemName = item ? item.name : 'Item';

      const logEntry: ActivityLogEntry = {
        id: generateId('act'),
        type: 'food_discarded',
        description: `${state.currentUser} discarded ${itemName} (Released ${cancelledRequests.length} active reservation(s))`,
        timestamp: now,
        actor: state.currentUser,
        entityId: action.payload.foodItemId,
      };

      return {
        state: {
          ...state,
          foodItems: updatedItems,
          portionRequests: updatedRequests,
          activityLog: [logEntry, ...state.activityLog],
        },
        success: true,
        successMessage: `"${itemName}" marked as discarded. All reservations released.`,
      };
    }

    case 'RECONCILE_INVENTORY': {
      const { foodItemId, actualQuantity, reason, adjustedBy } = action.payload;
      const result = reconcileInventory(
        foodItemId,
        actualQuantity,
        reason,
        adjustedBy,
        state.foodItems,
        state.portionRequests,
        now
      );

      if (!result.success || !result.data) {
        return { state, success: false, error: result.error };
      }

      const { updatedItems, updatedRequests, adjustment, explanation } = result.data;

      const logEntry: ActivityLogEntry = {
        id: generateId('act'),
        type: 'inventory_corrected',
        description: `${adjustedBy} reconciled ${adjustment.foodItemName}: ${adjustment.previousQuantity} -> ${adjustment.correctedQuantity} (${adjustment.difference >= 0 ? '+' : ''}${adjustment.difference}). ${adjustment.impactedReservationsCount > 0 ? `${adjustment.impactedReservationsCount} reservations cancelled.` : ''}`,
        timestamp: now,
        actor: adjustedBy,
        entityId: adjustment.id,
      };

      return {
        state: {
          ...state,
          foodItems: updatedItems,
          portionRequests: updatedRequests,
          inventoryAdjustments: [adjustment, ...state.inventoryAdjustments],
          activityLog: [logEntry, ...state.activityLog],
        },
        success: true,
        successMessage: explanation,
      };
    }

    case 'SIMULATE_EXPIRE_REQUEST': {
      const req = state.portionRequests.find((r) => r.id === action.payload.requestId);
      if (!req) {
        return { state, success: false, error: 'Request not found.' };
      }
      if (req.status !== 'approved') {
        return {
          state,
          success: false,
          error: `Cannot expire request in status '${req.status}'. Must be 'approved'.`,
        };
      }

      const updatedRequests = state.portionRequests.map((r) =>
        r.id === req.id
          ? {
              ...r,
              status: 'expired' as const,
              expiredAt: now,
              expiresAt: now - 1, // expired immediately
            }
          : r
      );

      const item = state.foodItems.find((f) => f.id === req.foodItemId);
      const itemName = item ? item.name : 'Item';
      const unit = item ? item.unit : '';

      const logEntry: ActivityLogEntry = {
        id: generateId('act'),
        type: 'reservation_expired',
        description: `Simulated expiration: Reservation for ${req.requester} (${req.requestedQuantity} ${unit} ${itemName}) expired. Unclaimed portion returned to available inventory.`,
        timestamp: now,
        actor: 'Tester (Simulated)',
        entityId: req.id,
      };

      return {
        state: {
          ...state,
          portionRequests: updatedRequests,
          activityLog: [logEntry, ...state.activityLog],
        },
        success: true,
        successMessage: `Reservation expired! Unclaimed ${req.requestedQuantity} ${unit} returned to available inventory.`,
      };
    }

    case 'TICK_TIME': {
      const { updatedRequests, newlyExpired } = processReservationExpirations(
        state.portionRequests,
        action.payload.now
      );

      if (newlyExpired.length === 0) {
        return { state, success: true };
      }

      const newLogEntries: ActivityLogEntry[] = newlyExpired.map((r) => {
        const item = state.foodItems.find((f) => f.id === r.foodItemId);
        const itemName = item ? item.name : 'food';
        const unit = item ? item.unit : '';
        return {
          id: generateId('act'),
          type: 'reservation_expired',
          description: `Reservation for ${r.requester} (${r.requestedQuantity} ${unit} of ${itemName}) expired. Unclaimed portion returned to available inventory.`,
          timestamp: action.payload.now,
          actor: 'System Timer',
          entityId: r.id,
        };
      });

      return {
        state: {
          ...state,
          portionRequests: updatedRequests,
          activityLog: [...newLogEntries, ...state.activityLog],
        },
        success: true,
      };
    }

    case 'LOAD_DEMO_SCENARIO': {
      let nextState: AppState;
      switch (action.payload.scenarioNumber) {
        case 1:
          nextState = setupScenario1State(state);
          break;
        case 2:
          nextState = setupScenario2State(state);
          break;
        case 3:
          nextState = setupScenario3State(state);
          break;
        case 4:
          nextState = setupScenario4State(state);
          break;
        default:
          nextState = state;
      }
      return {
        state: nextState,
        success: true,
        successMessage: `Loaded Scenario ${action.payload.scenarioNumber}!`,
      };
    }

    case 'RESET_DEMO_DATA': {
      const fresh = createInitialSeedState();
      return {
        state: fresh,
        success: true,
        successMessage: 'Demo data reset to initial default state.',
      };
    }

    default:
      return { state, success: true };
  }
}
