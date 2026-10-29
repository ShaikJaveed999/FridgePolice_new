import type { AppState, FoodItem, PortionRequest } from '../types';

export const DEFAULT_USERS = ['Alice', 'Bob', 'Charlie', 'David'];

export function createInitialSeedState(): AppState {
  const now = Date.now();
  const fiveMinutesMs = 5 * 60 * 1000;

  const foodItems: FoodItem[] = [
    {
      id: 'item_pizza_alice_01',
      name: 'Pepperoni Pizza',
      owner: 'Alice',
      totalQuantity: 25,
      unit: '%',
      status: 'active',
      createdAt: now - 3600000,
      updatedAt: now - 3600000,
      notes: 'From Joe’s Pizza. Only 1 slice left (approx 25%).',
    },
    {
      id: 'item_ketchup_alice_02',
      name: 'Heinz Tomato Ketchup',
      owner: 'Alice',
      totalQuantity: 80,
      unit: '%',
      status: 'active',
      createdAt: now - 86400000,
      updatedAt: now - 86400000,
      notes: 'Bought yesterday. Please keep cap clean.',
    },
    {
      id: 'item_ketchup_bob_03',
      name: 'Heinz Tomato Ketchup',
      owner: 'Bob',
      totalQuantity: 40,
      unit: '%',
      status: 'active',
      createdAt: now - 43200000,
      updatedAt: now - 43200000,
      notes: 'Extra spicy edition.',
    },
    {
      id: 'item_milk_charlie_04',
      name: 'Oat Milk (Barista Edition)',
      owner: 'Charlie',
      totalQuantity: 1000,
      unit: 'ml',
      status: 'active',
      createdAt: now - 18000000,
      updatedAt: now - 18000000,
      notes: 'Feel free to request for morning coffee!',
    },
    {
      id: 'item_cheesecake_david_05',
      name: 'New York Cheesecake',
      owner: 'David',
      totalQuantity: 4,
      unit: 'slices',
      status: 'active',
      createdAt: now - 7200000,
      updatedAt: now - 7200000,
      notes: 'Homemade by David’s mom.',
    },
  ];

  const portionRequests: PortionRequest[] = [
    {
      id: 'req_pizza_bob_01',
      foodItemId: 'item_pizza_alice_01',
      requester: 'Bob',
      requestedQuantity: 25,
      status: 'pending',
      createdAt: now - 1200000,
    },
    {
      id: 'req_pizza_charlie_02',
      foodItemId: 'item_pizza_alice_01',
      requester: 'Charlie',
      requestedQuantity: 25,
      status: 'pending',
      createdAt: now - 600000,
    },
    {
      id: 'req_milk_bob_03',
      foodItemId: 'item_milk_charlie_04',
      requester: 'Bob',
      requestedQuantity: 250,
      status: 'approved',
      createdAt: now - 300000,
      approvedAt: now - 120000,
      expiresAt: now + fiveMinutesMs - 120000,
    },
    {
      id: 'req_cheesecake_alice_04',
      foodItemId: 'item_cheesecake_david_05',
      requester: 'Alice',
      requestedQuantity: 1,
      status: 'claimed',
      createdAt: now - 7200000,
      approvedAt: now - 7000000,
      expiresAt: now - 6700000,
      claimedAt: now - 6800000,
    },
  ];

  return {
    foodItems,
    portionRequests,
    inventoryAdjustments: [
      {
        id: 'adj_seed_01',
        foodItemId: 'item_pizza_alice_01',
        foodItemName: 'Pepperoni Pizza',
        previousQuantity: 50,
        correctedQuantity: 25,
        difference: -25,
        reason: 'Alice noticed someone took a slice without requesting earlier.',
        timestamp: now - 4000000,
        adjustedBy: 'Alice',
        impactedReservationsCount: 0,
        details: 'Initial inventory calibration.',
      },
    ],
    activityLog: [
      {
        id: 'act_seed_01',
        type: 'item_added',
        description: 'Alice added Pepperoni Pizza (25% remaining)',
        timestamp: now - 3600000,
        actor: 'Alice',
        entityId: 'item_pizza_alice_01',
      },
      {
        id: 'act_seed_02',
        type: 'portion_requested',
        description: 'Bob requested 25% of Pepperoni Pizza',
        timestamp: now - 1200000,
        actor: 'Bob',
        entityId: 'req_pizza_bob_01',
      },
      {
        id: 'act_seed_03',
        type: 'portion_requested',
        description: 'Charlie requested 25% of Pepperoni Pizza',
        timestamp: now - 600000,
        actor: 'Charlie',
        entityId: 'req_pizza_charlie_02',
      },
      {
        id: 'act_seed_04',
        type: 'request_approved',
        description: 'Charlie approved Bob’s request for 250 ml Oat Milk',
        timestamp: now - 120000,
        actor: 'Charlie',
        entityId: 'req_milk_bob_03',
      },
    ],
    currentUser: 'Alice',
    reservationLifetimeMs: fiveMinutesMs,
  };
}

/**
 * Scenario 1: Setup Pizza Double Allocation
 * 25% remaining pizza, Roommate B requests 25%, Roommate C requests 25%.
 */
export function setupScenario1State(currentState: AppState): AppState {
  const now = Date.now();
  const pizzaId = 'item_pizza_scenario_1';

  const pizzaItem: FoodItem = {
    id: pizzaId,
    name: 'Pepperoni Pizza',
    owner: 'Alice',
    totalQuantity: 25,
    unit: '%',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    notes: 'Scenario 1: Exactly 25% remaining. Alice owns this pizza.',
  };

  const reqB: PortionRequest = {
    id: 'req_scenario1_bob',
    foodItemId: pizzaId,
    requester: 'Bob',
    requestedQuantity: 25,
    status: 'pending',
    createdAt: now - 5000,
  };

  const reqC: PortionRequest = {
    id: 'req_scenario1_charlie',
    foodItemId: pizzaId,
    requester: 'Charlie',
    requestedQuantity: 25,
    status: 'pending',
    createdAt: now - 2000,
  };

  // Keep other items, replace or prepend pizza
  const otherItems = currentState.foodItems.filter((f) => f.id !== pizzaId && f.name !== 'Pepperoni Pizza');
  const otherRequests = currentState.portionRequests.filter((r) => r.foodItemId !== pizzaId);

  return {
    ...currentState,
    foodItems: [pizzaItem, ...otherItems],
    portionRequests: [reqB, reqC, ...otherRequests],
    currentUser: 'Alice',
    activityLog: [
      {
        id: `act_${now}`,
        type: 'demo_reset',
        description: 'Initialized Scenario 1: 25% Pizza with competing 25% requests from Bob and Charlie.',
        timestamp: now,
        actor: 'Demo Engine',
      },
      ...currentState.activityLog,
    ],
  };
}

/**
 * Scenario 2: Setup Approved but Never Consumed Food
 * Approved reservation with an active timer, ready for instant expiry or discard.
 */
export function setupScenario2State(currentState: AppState): AppState {
  const now = Date.now();
  const cakeId = 'item_cheesecake_scenario_2';

  const cakeItem: FoodItem = {
    id: cakeId,
    name: 'Strawberry Cheesecake',
    owner: 'Alice',
    totalQuantity: 4,
    unit: 'slices',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    notes: 'Scenario 2: 4 slices total. 1 slice reserved for Bob expiring soon.',
  };

  const reqBob: PortionRequest = {
    id: 'req_scenario2_bob',
    foodItemId: cakeId,
    requester: 'Bob',
    requestedQuantity: 1,
    status: 'approved',
    createdAt: now - 60000,
    approvedAt: now - 50000,
    expiresAt: now + 60000, // 60s left, easily simulated to expire
  };

  const otherItems = currentState.foodItems.filter((f) => f.id !== cakeId);
  const otherRequests = currentState.portionRequests.filter((r) => r.foodItemId !== cakeId);

  return {
    ...currentState,
    foodItems: [cakeItem, ...otherItems],
    portionRequests: [reqBob, ...otherRequests],
    currentUser: 'Bob',
    activityLog: [
      {
        id: `act_${now}`,
        type: 'demo_reset',
        description: 'Initialized Scenario 2: 1 slice Cheesecake approved for Bob (expires soon / test instant expiry & discard).',
        timestamp: now,
        actor: 'Demo Engine',
      },
      ...currentState.activityLog,
    ],
  };
}

/**
 * Scenario 3: Setup Identical Item Names
 * Two distinct Heinz Tomato Ketchup bottles with separate owners (Alice & Bob) and unique IDs.
 */
export function setupScenario3State(currentState: AppState): AppState {
  const now = Date.now();
  const ketchupAliceId = 'item_ketchup_alice_s3';
  const ketchupBobId = 'item_ketchup_bob_s3';

  const aliceKetchup: FoodItem = {
    id: ketchupAliceId,
    name: 'Heinz Tomato Ketchup',
    owner: 'Alice',
    totalQuantity: 100,
    unit: '%',
    status: 'active',
    createdAt: now - 7200000,
    updatedAt: now - 7200000,
    notes: 'Alice’s brand new ketchup bottle.',
  };

  const bobKetchup: FoodItem = {
    id: ketchupBobId,
    name: 'Heinz Tomato Ketchup',
    owner: 'Bob',
    totalQuantity: 45,
    unit: '%',
    status: 'active',
    createdAt: now - 3600000,
    updatedAt: now - 3600000,
    notes: 'Bob’s half-used ketchup bottle.',
  };

  const otherItems = currentState.foodItems.filter(
    (f) => f.id !== ketchupAliceId && f.id !== ketchupBobId && f.name !== 'Heinz Tomato Ketchup'
  );
  const otherRequests = currentState.portionRequests.filter(
    (r) => r.foodItemId !== ketchupAliceId && r.foodItemId !== ketchupBobId
  );

  return {
    ...currentState,
    foodItems: [aliceKetchup, bobKetchup, ...otherItems],
    portionRequests: [...otherRequests],
    currentUser: 'Charlie',
    activityLog: [
      {
        id: `act_${now}`,
        type: 'demo_reset',
        description: 'Initialized Scenario 3: Two separate Heinz Tomato Ketchup bottles owned by Alice (100%) and Bob (45%).',
        timestamp: now,
        actor: 'Demo Engine',
      },
      ...currentState.activityLog,
    ],
  };
}

/**
 * Scenario 4: Setup Inventory Discrepancy & Reconciliation
 * Food item has 100% recorded, with 2 approved reservations of 30% each (60% total reserved).
 * Reconciling to 40% will cause a shortage and deterministically cancel the second reservation!
 */
export function setupScenario4State(currentState: AppState): AppState {
  const now = Date.now();
  const juiceId = 'item_orange_juice_s4';

  const juiceItem: FoodItem = {
    id: juiceId,
    name: 'Fresh Orange Juice',
    owner: 'Charlie',
    totalQuantity: 100,
    unit: '%',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    notes: 'Scenario 4: 100% recorded, with 60% reserved. Reconcile to 40% or 20% to test shortage handling.',
  };

  const reqAlice: PortionRequest = {
    id: 'req_s4_alice_first',
    foodItemId: juiceId,
    requester: 'Alice',
    requestedQuantity: 30,
    status: 'approved',
    createdAt: now - 10000,
    approvedAt: now - 8000, // FIFO Priority 1
    expiresAt: now + 5 * 60 * 1000,
  };

  const reqBob: PortionRequest = {
    id: 'req_s4_bob_second',
    foodItemId: juiceId,
    requester: 'Bob',
    requestedQuantity: 30,
    status: 'approved',
    createdAt: now - 5000,
    approvedAt: now - 4000, // FIFO Priority 2
    expiresAt: now + 5 * 60 * 1000,
  };

  const otherItems = currentState.foodItems.filter((f) => f.id !== juiceId);
  const otherRequests = currentState.portionRequests.filter((r) => r.foodItemId !== juiceId);

  return {
    ...currentState,
    foodItems: [juiceItem, ...otherItems],
    portionRequests: [reqAlice, reqBob, ...otherRequests],
    currentUser: 'Charlie',
    activityLog: [
      {
        id: `act_${now}`,
        type: 'demo_reset',
        description: 'Initialized Scenario 4: Orange Juice with 100% recorded and 60% reserved (Alice: 30%, Bob: 30%). Ready for reconciliation.',
        timestamp: now,
        actor: 'Demo Engine',
      },
      ...currentState.activityLog,
    ],
  };
}
