import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import type {
  AppState,
  FoodItem,
  DerivedItemQuantities,
} from '../types';
import { appReducer } from './reducer';
import type { Action, ReducerResult } from './reducer';
import { loadPersistedState, savePersistedState } from './storage';
import { computeItemQuantities } from '../domain/inventoryLogic';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface FridgeContextType {
  state: AppState;
  toast: ToastMessage | null;
  clearToast: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  setCurrentUser: (user: string) => void;
  addFoodItem: (
    name: string,
    owner: string,
    totalQuantity: number,
    unit: string,
    notes?: string
  ) => ReducerResult;
  requestPortion: (
    foodItemId: string,
    requester: string,
    requestedQuantity: number
  ) => ReducerResult;
  approveRequest: (requestId: string) => ReducerResult;
  rejectRequest: (requestId: string, reason?: string) => ReducerResult;
  claimPortion: (requestId: string) => ReducerResult;
  cancelRequest: (requestId: string, reason?: string) => ReducerResult;
  discardFood: (foodItemId: string, reason?: string) => ReducerResult;
  reconcile: (
    foodItemId: string,
    actualQuantity: number,
    reason: string,
    adjustedBy: string
  ) => ReducerResult;
  simulateExpire: (requestId: string) => ReducerResult;
  loadScenario: (scenarioNumber: 1 | 2 | 3 | 4) => void;
  resetAllDemoData: () => void;
  getItemQuantities: (item: FoodItem) => DerivedItemQuantities;
  metrics: {
    totalItems: number;
    totalAvailable: number;
    pendingCount: number;
    activeReservationsCount: number;
    expiredCount: number;
  };
}

const FridgeContext = createContext<FridgeContextType | null>(null);

export const FridgeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(
    (currentState: AppState, action: Action) => {
      const res = appReducer(currentState, action, Date.now());
      return res.state;
    },
    undefined,
    loadPersistedState
  );

  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Sync to localStorage
  useEffect(() => {
    savePersistedState(state);
  }, [state]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString();
    setToast({ id, message, type });
  }, []);

  const clearToast = useCallback(() => {
    setToast(null);
  }, []);

  // Auto-dismiss toast after 5s
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast((current) => (current?.id === toast.id ? null : current));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Periodic ticker every 1 second to handle live expirations
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: 'TICK_TIME', payload: { now: Date.now() } });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Wrapper helper to execute action with reducer feedback
  const executeAction = useCallback(
    (action: Action): ReducerResult => {
      const result = appReducer(state, action, Date.now());
      dispatch(action);

      if (result.success && result.successMessage) {
        showToast(result.successMessage, 'success');
      } else if (!result.success && result.error) {
        showToast(result.error, 'error');
      }

      return result;
    },
    [state, showToast]
  );

  const setCurrentUser = useCallback((user: string) => {
    executeAction({ type: 'SET_CURRENT_USER', payload: { user } });
  }, [executeAction]);

  const addFoodItem = useCallback(
    (name: string, owner: string, totalQuantity: number, unit: string, notes?: string) => {
      return executeAction({
        type: 'ADD_FOOD_ITEM',
        payload: { name, owner, totalQuantity, unit, notes },
      });
    },
    [executeAction]
  );

  const requestPortion = useCallback(
    (foodItemId: string, requester: string, requestedQuantity: number) => {
      return executeAction({
        type: 'REQUEST_PORTION',
        payload: { foodItemId, requester, requestedQuantity },
      });
    },
    [executeAction]
  );

  const approveRequest = useCallback(
    (requestId: string) => {
      return executeAction({ type: 'APPROVE_REQUEST', payload: { requestId } });
    },
    [executeAction]
  );

  const rejectRequest = useCallback(
    (requestId: string, reason?: string) => {
      return executeAction({
        type: 'REJECT_REQUEST',
        payload: { requestId, reason },
      });
    },
    [executeAction]
  );

  const claimPortion = useCallback(
    (requestId: string) => {
      return executeAction({ type: 'CLAIM_PORTION', payload: { requestId } });
    },
    [executeAction]
  );

  const cancelRequest = useCallback(
    (requestId: string, reason?: string) => {
      return executeAction({
        type: 'CANCEL_REQUEST',
        payload: { requestId, reason },
      });
    },
    [executeAction]
  );

  const discardFood = useCallback(
    (foodItemId: string, reason?: string) => {
      return executeAction({
        type: 'DISCARD_FOOD_ITEM',
        payload: { foodItemId, reason },
      });
    },
    [executeAction]
  );

  const reconcile = useCallback(
    (foodItemId: string, actualQuantity: number, reason: string, adjustedBy: string) => {
      return executeAction({
        type: 'RECONCILE_INVENTORY',
        payload: { foodItemId, actualQuantity, reason, adjustedBy },
      });
    },
    [executeAction]
  );

  const simulateExpire = useCallback(
    (requestId: string) => {
      return executeAction({
        type: 'SIMULATE_EXPIRE_REQUEST',
        payload: { requestId },
      });
    },
    [executeAction]
  );

  const loadScenario = useCallback(
    (scenarioNumber: 1 | 2 | 3 | 4) => {
      executeAction({
        type: 'LOAD_DEMO_SCENARIO',
        payload: { scenarioNumber },
      });
    },
    [executeAction]
  );

  const resetAllDemoData = useCallback(() => {
    executeAction({ type: 'RESET_DEMO_DATA' });
  }, [executeAction]);

  const getItemQuantities = useCallback(
    (item: FoodItem) => {
      return computeItemQuantities(item, state.portionRequests, Date.now());
    },
    [state.portionRequests]
  );

  const metrics = useMemo(() => {
    const now = Date.now();
    const activeItems = state.foodItems.filter((f) => f.status === 'active');
    const totalItems = activeItems.length;

    let totalAvailable = 0;
    activeItems.forEach((item) => {
      const q = computeItemQuantities(item, state.portionRequests, now);
      totalAvailable += q.availableQuantity;
    });

    const pendingCount = state.portionRequests.filter((r) => r.status === 'pending').length;
    const activeReservationsCount = state.portionRequests.filter(
      (r) => r.status === 'approved' && (!r.expiresAt || now < r.expiresAt)
    ).length;
    const expiredCount = state.portionRequests.filter((r) => r.status === 'expired').length;

    return {
      totalItems,
      totalAvailable,
      pendingCount,
      activeReservationsCount,
      expiredCount,
    };
  }, [state.foodItems, state.portionRequests]);

  const contextValue = useMemo(
    () => ({
      state,
      toast,
      clearToast,
      showToast,
      setCurrentUser,
      addFoodItem,
      requestPortion,
      approveRequest,
      rejectRequest,
      claimPortion,
      cancelRequest,
      discardFood,
      reconcile,
      simulateExpire,
      loadScenario,
      resetAllDemoData,
      getItemQuantities,
      metrics,
    }),
    [
      state,
      toast,
      clearToast,
      showToast,
      setCurrentUser,
      addFoodItem,
      requestPortion,
      approveRequest,
      rejectRequest,
      claimPortion,
      cancelRequest,
      discardFood,
      reconcile,
      simulateExpire,
      loadScenario,
      resetAllDemoData,
      getItemQuantities,
      metrics,
    ]
  );

  return (
    <FridgeContext.Provider value={contextValue}>
      {children}
    </FridgeContext.Provider>
  );
};

export function useFridge(): FridgeContextType {
  const context = useContext(FridgeContext);
  if (!context) {
    throw new Error('useFridge must be used within a FridgeProvider');
  }
  return context;
}
