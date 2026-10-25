/**
 * PLAYFORGE Follow & Movement Behavior Tests
 * Uses Node.js built-in test runner (node --test) with mocked bot & pathfinder.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const EventEmitter = require('events');
const { MovementController } = require('../src/bot/behaviors/follow');
const { BotAdapter } = require('../src/bot/adapter');

class MockPathfinderGoals {
  static GoalFollow = class {
    constructor(entity, range) {
      this.entity = entity;
      this.range = range;
    }
  };
  static GoalNear = class {
    constructor(x, y, z, range) {
      this.x = x;
      this.y = y;
      this.z = z;
      this.range = range;
    }
  };
}

class MockPathfinderModule {
  static goals = MockPathfinderGoals;
  static pathfinder = () => {};
  static Movements = class {
    constructor(bot) {
      this.bot = bot;
    }
  };
}

class MockBotWithPlayers extends EventEmitter {
  constructor(username = 'PlayForgeBot') {
    super();
    this.username = username;
    this.entity = { position: { x: 0, y: 64, z: 0 } };
    this.health = 20;
    this.food = 20;
    const pf = {
      currentGoal: null,
      isDynamic: false,
      movements: null,
      setMovements: (m) => {
        pf.movements = m;
      },
      setGoal: (goal, dynamic) => {
        pf.currentGoal = goal;
        pf.isDynamic = dynamic;
      },
      stop: () => {
        pf.currentGoal = null;
      },
    };
    this.pathfinder = pf;
    this.players = {
      PlayForgeBot: { username: 'PlayForgeBot' },
      Alex: {
        username: 'Alex',
        entity: { position: { x: 10, y: 64, z: 20 } },
      },
      DistantSteve: {
        username: 'DistantSteve',
        entity: null, // outside render distance
      },
    };
  }

  loadPlugin() {}

  quit(reason) {
    this.emit('end', reason);
  }
}

describe('MovementController', () => {
  it('should initialize pathfinder and default movements on bot', () => {
    const bot = new MockBotWithPlayers();
    const controller = new MovementController(bot, {
      pathfinderModule: MockPathfinderModule,
    });

    const success = controller.init();
    assert.strictEqual(success, true);
    assert.ok(bot.pathfinder.movements);
  });

  it('should reject follow when target player does not exist', () => {
    const bot = new MockBotWithPlayers();
    const controller = new MovementController(bot, {
      pathfinderModule: MockPathfinderModule,
    });

    const res = controller.follow('NonExistentPlayer');
    assert.strictEqual(res.ok, false);
    assert.ok(res.reason.includes('not found'));
  });

  it('should reject follow when player entity is not in render distance', () => {
    const bot = new MockBotWithPlayers();
    const controller = new MovementController(bot, {
      pathfinderModule: MockPathfinderModule,
    });

    const res = controller.follow('DistantSteve');
    assert.strictEqual(res.ok, false);
    assert.ok(res.reason.includes('render/entity distance'));
  });

  it('should set GoalFollow when target player is found', () => {
    const bot = new MockBotWithPlayers();
    const controller = new MovementController(bot, {
      pathfinderModule: MockPathfinderModule,
    });

    const res = controller.follow('Alex', 3);
    assert.strictEqual(res.ok, true);
    assert.ok(res.message.includes('Alex'));
    assert.strictEqual(controller.currentGoalType, 'follow');
    assert.strictEqual(controller.currentTarget, 'Alex');
    assert.ok(bot.pathfinder.currentGoal instanceof MockPathfinderGoals.GoalFollow);
    assert.strictEqual(bot.pathfinder.currentGoal.range, 3);
  });

  it('should auto-target first other player if username is empty', () => {
    const bot = new MockBotWithPlayers();
    const controller = new MovementController(bot, {
      pathfinderModule: MockPathfinderModule,
    });

    const res = controller.follow('');
    assert.strictEqual(res.ok, true);
    assert.strictEqual(controller.currentTarget, 'Alex');
  });

  it('should set GoalNear for comeHere to player coordinates', () => {
    const bot = new MockBotWithPlayers();
    const controller = new MovementController(bot, {
      pathfinderModule: MockPathfinderModule,
    });

    const res = controller.comeHere('Alex', 1);
    assert.strictEqual(res.ok, true);
    assert.ok(res.message.includes('10, 64, 20'));
    assert.strictEqual(controller.currentGoalType, 'goto');
    assert.ok(bot.pathfinder.currentGoal instanceof MockPathfinderGoals.GoalNear);
    assert.strictEqual(bot.pathfinder.currentGoal.x, 10);
    assert.strictEqual(bot.pathfinder.currentGoal.y, 64);
    assert.strictEqual(bot.pathfinder.currentGoal.z, 20);
  });

  it('should stop movement and reset goal state', () => {
    const bot = new MockBotWithPlayers();
    const controller = new MovementController(bot, {
      pathfinderModule: MockPathfinderModule,
    });

    controller.follow('Alex');
    assert.strictEqual(controller.getStatus().active, true);

    const res = controller.stop();
    assert.strictEqual(res.ok, true);
    assert.strictEqual(controller.getStatus().active, false);
    assert.strictEqual(bot.pathfinder.currentGoal, null);
  });
});

describe('BotAdapter Movement Integration', () => {
  const baseConfig = {
    host: '127.0.0.1',
    port: 25565,
    username: 'PlayForgeBot',
    version: '1.21.4',
    auth: 'offline',
  };

  it('should reject movement requests when bot is disconnected', () => {
    const adapter = new BotAdapter(baseConfig);

    const followRes = adapter.followPlayer('Alex');
    assert.strictEqual(followRes.ok, false);
    assert.ok(followRes.reason.includes('not connected'));

    const comeRes = adapter.comeToPlayer('Alex');
    assert.strictEqual(comeRes.ok, false);
    assert.ok(comeRes.reason.includes('not connected'));

    const stopRes = adapter.stopMovement();
    assert.strictEqual(stopRes.ok, true);
  });

  it('should delegate movement commands when bot is connected', async () => {
    let mockBot;
    const adapter = new BotAdapter(baseConfig, {
      createBot: () => {
        mockBot = new MockBotWithPlayers();
        return mockBot;
      },
      pathfinderModule: MockPathfinderModule,
    });

    await adapter.connect();
    mockBot.emit('spawn');
    assert.strictEqual(adapter.status, 'connected');

    const followRes = adapter.followPlayer('Alex');
    assert.strictEqual(followRes.ok, true);

    const status = adapter.getStatus();
    assert.strictEqual(status.movement.active, true);
    assert.strictEqual(status.movement.target, 'Alex');

    const stopRes = adapter.stopMovement();
    assert.strictEqual(stopRes.ok, true);

    const statusAfter = adapter.getStatus();
    assert.strictEqual(statusAfter.movement.active, false);

    await adapter.disconnect();
  });
});
