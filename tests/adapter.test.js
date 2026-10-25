/**
 * PLAYFORGE Bot Adapter Tests
 * Uses Node.js built-in test runner (node --test) with mocked Mineflayer instances.
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const EventEmitter = require('events');
const { BotAdapter } = require('../src/bot/adapter');

class MockBot extends EventEmitter {
  constructor(options) {
    super();
    this.options = options;
    this.username = options.username;
    this.entity = { position: { x: 120.4, y: 64.0, z: -250.8 } };
    this.health = 20;
    this.food = 18;
    this.quitCalled = false;
    this.quitReason = null;
  }

  quit(reason) {
    this.quitCalled = true;
    this.quitReason = reason;
    this.emit('end', reason);
  }

  end(reason) {
    this.quitCalled = true;
    this.quitReason = reason;
    this.emit('end', reason);
  }
}

describe('BotAdapter', () => {
  const baseConfig = {
    host: '127.0.0.1',
    port: 25565,
    username: 'TestBot',
    version: '1.21.4',
    auth: 'offline',
    connectTimeoutMs: 5000,
  };

  it('should initialize with disconnected status and empty state', () => {
    const adapter = new BotAdapter(baseConfig);
    const status = adapter.getStatus();

    assert.strictEqual(status.status, 'disconnected');
    assert.strictEqual(status.health, null);
    assert.strictEqual(status.food, null);
    assert.strictEqual(status.position, null);
    assert.strictEqual(status.config.host, '127.0.0.1');
    assert.strictEqual(status.config.port, 25565);
    assert.strictEqual(status.config.username, 'TestBot');
    assert.strictEqual(status.config.version, '1.21.4');
    assert.strictEqual(status.config.auth, 'offline');
  });

  it('should never expose password in getStatus even if set', () => {
    const adapter = new BotAdapter({
      ...baseConfig,
      password: 'super-secret-password',
    });
    const status = adapter.getStatus();

    assert.strictEqual(status.config.password, undefined);
    assert.strictEqual(JSON.stringify(status).includes('super-secret-password'), false);
  });

  it('should transition to connecting and then connected on spawn', async () => {
    let mockBotInstance = null;
    const createBot = (opts) => {
      mockBotInstance = new MockBot(opts);
      return mockBotInstance;
    };

    const adapter = new BotAdapter(baseConfig, { createBot });
    const statusHistory = [];
    adapter.on('statusChange', (s) => statusHistory.push(s));

    await adapter.connect();
    assert.strictEqual(adapter.status, 'connecting');
    assert.ok(mockBotInstance !== null);

    // Simulate server login and spawn
    mockBotInstance.emit('login');
    mockBotInstance.emit('spawn');

    assert.strictEqual(adapter.status, 'connected');
    assert.deepStrictEqual(statusHistory, ['connecting', 'connected']);

    const status = adapter.getStatus();
    assert.strictEqual(status.health, 20);
    assert.strictEqual(status.food, 18);
    assert.deepStrictEqual(status.position, { x: 120.4, y: 64.0, z: -250.8 });
  });

  it('should update health and food on health events', async () => {
    let mockBotInstance;
    const adapter = new BotAdapter(baseConfig, {
      createBot: (opts) => (mockBotInstance = new MockBot(opts)),
    });

    await adapter.connect();
    mockBotInstance.emit('spawn');

    let stateUpdateReceived = null;
    adapter.on('stateUpdate', (st) => {
      stateUpdateReceived = st;
    });

    mockBotInstance.health = 14;
    mockBotInstance.food = 10;
    mockBotInstance.emit('health');

    assert.ok(stateUpdateReceived !== null);
    assert.strictEqual(stateUpdateReceived.health, 14);
    assert.strictEqual(stateUpdateReceived.food, 10);
    assert.strictEqual(adapter.state.health, 14);
    assert.strictEqual(adapter.state.food, 10);
  });

  it('should log chat from other players and ignore own messages', async () => {
    let mockBotInstance;
    const adapter = new BotAdapter(baseConfig, {
      createBot: (opts) => (mockBotInstance = new MockBot(opts)),
    });

    const logs = [];
    adapter.on('log', (msg) => logs.push(msg));

    await adapter.connect();
    mockBotInstance.emit('spawn');

    // Message from another player
    mockBotInstance.emit('chat', 'Alex', 'Hello there bot!');
    // Message from own bot
    mockBotInstance.emit('chat', 'TestBot', 'I said this');

    assert.ok(logs.some((l) => l.includes('[Chat] <Alex> Hello there bot!')));
    assert.strictEqual(logs.some((l) => l.includes('<TestBot>')), false);
  });

  it('should cleanly disconnect and reset state', async () => {
    let mockBotInstance;
    const adapter = new BotAdapter(baseConfig, {
      createBot: (opts) => (mockBotInstance = new MockBot(opts)),
    });

    await adapter.connect();
    mockBotInstance.emit('spawn');
    assert.strictEqual(adapter.status, 'connected');

    const logs = [];
    adapter.on('log', (msg) => logs.push(msg));

    await adapter.disconnect();
    assert.strictEqual(adapter.status, 'disconnected');
    assert.strictEqual(mockBotInstance.quitCalled, true);
    assert.strictEqual(adapter.state.health, null);
    assert.strictEqual(adapter.state.food, null);
    assert.strictEqual(adapter.state.position, null);
    assert.ok(logs.some((l) => l.includes('[Adapter] Disconnected.')));

    // Second disconnect should report already disconnected
    logs.length = 0;
    await adapter.disconnect();
    assert.ok(logs.some((l) => l.includes('[Adapter] Already disconnected.')));
  });

  it('should prevent duplicate connect calls', async () => {
    let createCount = 0;
    const adapter = new BotAdapter(baseConfig, {
      createBot: (opts) => {
        createCount++;
        return new MockBot(opts);
      },
    });

    const logs = [];
    adapter.on('log', (l) => logs.push(l));

    await adapter.connect();
    assert.strictEqual(createCount, 1);

    // Call connect again while status is connecting
    await adapter.connect();
    assert.strictEqual(createCount, 1);
    assert.ok(logs.some((l) => l.includes('Duplicate connection ignored')));
  });

  it('should transition to error on bot error event', async () => {
    let mockBotInstance;
    const adapter = new BotAdapter(baseConfig, {
      createBot: (opts) => (mockBotInstance = new MockBot(opts)),
    });

    const logs = [];
    adapter.on('log', (l) => logs.push(l));

    await adapter.connect();
    assert.strictEqual(adapter.status, 'connecting');

    mockBotInstance.emit('error', new Error('ECONNREFUSED connect'));

    assert.strictEqual(adapter.status, 'error');
    assert.ok(logs.some((l) => l.includes('Connection error: ECONNREFUSED connect')));
    assert.strictEqual(adapter._bot, null);
  });

  it('should transition to error on kicked event', async () => {
    let mockBotInstance;
    const adapter = new BotAdapter(baseConfig, {
      createBot: (opts) => (mockBotInstance = new MockBot(opts)),
    });

    const logs = [];
    adapter.on('log', (l) => logs.push(l));

    await adapter.connect();
    mockBotInstance.emit('kicked', 'You are not whitelisted on this server');

    assert.strictEqual(adapter.status, 'error');
    assert.ok(logs.some((l) => l.includes('Bot was kicked from server: You are not whitelisted')));
    assert.strictEqual(adapter._bot, null);
  });

  it('should handle connection timeout', async () => {
    const adapter = new BotAdapter(
      {
        ...baseConfig,
        connectTimeoutMs: 50, // 50ms timeout for test
      },
      {
        createBot: (opts) => new MockBot(opts), // does not emit spawn
      }
    );

    const logs = [];
    adapter.on('log', (l) => logs.push(l));

    await adapter.connect();
    assert.strictEqual(adapter.status, 'connecting');

    // Wait for timeout to fire
    await new Promise((r) => setTimeout(r, 80));

    assert.strictEqual(adapter.status, 'error');
    assert.ok(logs.some((l) => l.includes('Connection timed out after 50ms')));
    assert.strictEqual(adapter._bot, null);
  });

  it('should allow config update when disconnected but reject when connected', async () => {
    let mockBotInstance;
    const adapter = new BotAdapter(baseConfig, {
      createBot: (opts) => (mockBotInstance = new MockBot(opts)),
    });

    // Valid update when disconnected
    const ok = adapter.updateConfig({ host: '192.168.1.50', port: 25570 });
    assert.strictEqual(ok, true);
    assert.strictEqual(adapter.config.host, '192.168.1.50');
    assert.strictEqual(adapter.config.port, 25570);

    // Connect
    await adapter.connect();
    assert.strictEqual(adapter.status, 'connecting');

    // Rejected while connecting
    const rejected = adapter.updateConfig({ host: '10.0.0.1' });
    assert.strictEqual(rejected, false);
    assert.strictEqual(adapter.config.host, '192.168.1.50');

    await adapter.disconnect();
  });

  it('should handle real Mineflayer network failure on closed port gracefully', async () => {
    const adapter = new BotAdapter({
      host: '127.0.0.1',
      port: 64321,
      username: 'TestOfflineBot',
      version: '1.21.4',
      auth: 'offline',
      connectTimeoutMs: 3000,
    });

    const logs = [];
    adapter.on('log', (l) => logs.push(l));

    await adapter.connect();
    assert.strictEqual(adapter.status, 'connecting');

    await new Promise((resolve) => {
      adapter.on('statusChange', (s) => {
        if (s === 'error') resolve();
      });
      setTimeout(resolve, 2500);
    });

    assert.strictEqual(adapter.status, 'error');
    assert.ok(logs.some((l) => l.includes('Connection error') || l.includes('ECONNREFUSED')));
  });
});
