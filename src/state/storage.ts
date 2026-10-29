import type { AppState } from '../types';
import { createInitialSeedState } from '../domain/seedData';

const STORAGE_KEY = 'fridgepolice_state_v1';

export function loadPersistedState(): AppState {
  if (typeof window === 'undefined' || !window.localStorage) {
    return createInitialSeedState();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createInitialSeedState();
      savePersistedState(initial);
      return initial;
    }

    const parsed = JSON.parse(raw);

    // Defensive validation
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !Array.isArray(parsed.foodItems) ||
      !Array.isArray(parsed.portionRequests)
    ) {
      console.warn('Persisted state format invalid, resetting to seed state.');
      const initial = createInitialSeedState();
      savePersistedState(initial);
      return initial;
    }

    return {
      foodItems: parsed.foodItems,
      portionRequests: parsed.portionRequests,
      inventoryAdjustments: Array.isArray(parsed.inventoryAdjustments)
        ? parsed.inventoryAdjustments
        : [],
      activityLog: Array.isArray(parsed.activityLog) ? parsed.activityLog : [],
      currentUser: typeof parsed.currentUser === 'string' ? parsed.currentUser : 'Alice',
      reservationLifetimeMs:
        typeof parsed.reservationLifetimeMs === 'number'
          ? parsed.reservationLifetimeMs
          : 5 * 60 * 1000,
    };
  } catch (err) {
    console.error('Failed to load state from localStorage:', err);
    return createInitialSeedState();
  }
}

export function savePersistedState(state: AppState): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to persist state to localStorage:', err);
  }
}

export function clearPersistedState(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}
