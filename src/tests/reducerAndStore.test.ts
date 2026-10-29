import { describe, it, expect } from 'vitest';
import { appReducer } from '../state/reducer';
import { createInitialSeedState } from '../domain/seedData';

describe('App Reducer & Store Integration', () => {
  const baseTime = 1700000000000;

  it('adds food items with validation and logs activity', () => {
    const initialState = createInitialSeedState();

    // Valid item
    const res = appReducer(
      initialState,
      {
        type: 'ADD_FOOD_ITEM',
        payload: {
          name: 'Greek Yogurt',
          owner: 'Alice',
          totalQuantity: 500,
          unit: 'g',
          notes: 'Vanilla flavor',
        },
      },
      baseTime
    );

    expect(res.success).toBe(true);
    expect(res.state.foodItems[0].name).toBe('Greek Yogurt');
    expect(res.state.foodItems[0].totalQuantity).toBe(500);
    expect(res.state.activityLog[0].type).toBe('item_added');

    // Invalid item: empty name
    const invalidName = appReducer(
      initialState,
      {
        type: 'ADD_FOOD_ITEM',
        payload: {
          name: '',
          owner: 'Alice',
          totalQuantity: 10,
          unit: 'cans',
        },
      },
      baseTime
    );
    expect(invalidName.success).toBe(false);
    expect(invalidName.error).toContain('name is required');

    // Invalid item: non-integer quantity
    const invalidFloat = appReducer(
      initialState,
      {
        type: 'ADD_FOOD_ITEM',
        payload: {
          name: 'Coke',
          owner: 'Alice',
          totalQuantity: 2.5,
          unit: 'cans',
        },
      },
      baseTime
    );
    expect(invalidFloat.success).toBe(false);
    expect(invalidFloat.error).toContain('integer');
  });

  it('rejects portion request if requested quantity exceeds available quantity', () => {
    const initialState = createInitialSeedState();
    const pizza = initialState.foodItems.find((f) => f.name === 'Pepperoni Pizza')!;

    const res = appReducer(
      initialState,
      {
        type: 'REQUEST_PORTION',
        payload: {
          foodItemId: pizza.id,
          requester: 'Charlie',
          requestedQuantity: 50, // Pizza only has 25% total
        },
      },
      baseTime
    );

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Cannot request 50 %: Only 25 % currently available/i);
  });

  it('loading demo scenarios correctly configures each specific scenario state', () => {
    const initialState = createInitialSeedState();

    // Scenario 1
    const s1 = appReducer(initialState, { type: 'LOAD_DEMO_SCENARIO', payload: { scenarioNumber: 1 } });
    expect(s1.success).toBe(true);
    const pizza = s1.state.foodItems.find((f) => f.name === 'Pepperoni Pizza')!;
    expect(pizza.totalQuantity).toBe(25);
    const pizzaReqs = s1.state.portionRequests.filter((r) => r.foodItemId === pizza.id);
    expect(pizzaReqs).toHaveLength(2);

    // Scenario 2
    const s2 = appReducer(initialState, { type: 'LOAD_DEMO_SCENARIO', payload: { scenarioNumber: 2 } });
    expect(s2.success).toBe(true);
    const cake = s2.state.foodItems.find((f) => f.name === 'Strawberry Cheesecake')!;
    expect(cake).toBeDefined();

    // Scenario 3
    const s3 = appReducer(initialState, { type: 'LOAD_DEMO_SCENARIO', payload: { scenarioNumber: 3 } });
    expect(s3.success).toBe(true);
    const ketchups = s3.state.foodItems.filter((f) => f.name === 'Heinz Tomato Ketchup');
    expect(ketchups).toHaveLength(2);
    expect(ketchups[0].id).not.toBe(ketchups[1].id);

    // Scenario 4
    const s4 = appReducer(initialState, { type: 'LOAD_DEMO_SCENARIO', payload: { scenarioNumber: 4 } });
    expect(s4.success).toBe(true);
    const juice = s4.state.foodItems.find((f) => f.name === 'Fresh Orange Juice')!;
    expect(juice.totalQuantity).toBe(100);
  });

  it('reset demo data restores valid initial seed state', () => {
    const modifiedState = appReducer(
      createInitialSeedState(),
      { type: 'LOAD_DEMO_SCENARIO', payload: { scenarioNumber: 1 } }
    ).state;

    const reset = appReducer(modifiedState, { type: 'RESET_DEMO_DATA' });
    expect(reset.success).toBe(true);
    expect(reset.state.foodItems.length).toBeGreaterThan(0);
    expect(reset.state.portionRequests.length).toBeGreaterThan(0);
  });
});
