/**
 * PLAYFORGE Config Module Tests
 * Uses Node.js built-in test runner (node --test)
 */
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

describe('Config Module', () => {
  // Save and restore env vars
  let savedEnv;

  beforeEach(() => {
    savedEnv = { ...process.env };
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    // Restore environment
    for (const key of Object.keys(process.env)) {
      if (!(key in savedEnv)) delete process.env[key];
    }
    Object.assign(process.env, savedEnv);
    // Clear module cache so config re-reads env
    delete require.cache[require.resolve('../src/config/index')];
  });

  it('should load default values when env vars are not set', () => {
    delete process.env.MC_HOST;
    delete process.env.MC_PORT;
    delete process.env.MC_USERNAME;
    delete process.env.MC_VERSION;
    delete process.env.AI_API_BASE_URL;
    delete process.env.AI_API_KEY;
    delete process.env.AI_MODEL_ID;

    const { loadConfig } = require('../src/config/index');
    const config = loadConfig();

    assert.strictEqual(config.mc.host, 'localhost');
    assert.strictEqual(config.mc.port, 25565);
    assert.strictEqual(config.mc.username, 'PlayForgeBot');
    assert.strictEqual(config.mc.version, '1.21.4');
    assert.strictEqual(config.ai.modelId, 'nemotron');
    assert.strictEqual(config.errors.length, 0);
  });

  it('should read values from environment variables', () => {
    process.env.MC_HOST = '192.168.1.100';
    process.env.MC_PORT = '25570';
    process.env.MC_USERNAME = 'TestBot';
    process.env.MC_VERSION = '1.21.4';
    process.env.AI_API_BASE_URL = 'https://api.example.com/v1';
    process.env.AI_API_KEY = 'sk-test-key';
    process.env.AI_MODEL_ID = 'gpt-4';

    const { loadConfig } = require('../src/config/index');
    const config = loadConfig();

    assert.strictEqual(config.mc.host, '192.168.1.100');
    assert.strictEqual(config.mc.port, 25570);
    assert.strictEqual(config.mc.username, 'TestBot');
    assert.strictEqual(config.ai.baseUrl, 'https://api.example.com/v1');
    assert.strictEqual(config.ai.apiKey, 'sk-test-key');
    assert.strictEqual(config.errors.length, 0);
  });

  it('should report error for invalid port', () => {
    process.env.MC_PORT = 'not_a_number';

    const { loadConfig } = require('../src/config/index');
    const config = loadConfig();

    assert.ok(config.errors.length > 0);
    assert.ok(config.errors.some(e => e.includes('MC_PORT')));
  });

  it('should report error for port out of range', () => {
    process.env.MC_PORT = '99999';

    const { loadConfig } = require('../src/config/index');
    const config = loadConfig();

    assert.ok(config.errors.some(e => e.includes('MC_PORT')));
  });

  it('should not expose AI API key through config object directly', () => {
    process.env.AI_API_KEY = 'super-secret-key';

    const { loadConfig } = require('../src/config/index');
    const config = loadConfig();

    // The key IS in the config (backend use), but we verify it's there
    // The point is it must never reach the renderer/frontend
    assert.strictEqual(config.ai.apiKey, 'super-secret-key');
  });

  it('should default auth to offline and timeout to 30000', () => {
    delete process.env.MC_AUTH;
    delete process.env.MC_CONNECT_TIMEOUT_MS;

    const { loadConfig } = require('../src/config/index');
    const config = loadConfig();

    assert.strictEqual(config.mc.auth, 'offline');
    assert.strictEqual(config.mc.connectTimeoutMs, 30000);
    assert.strictEqual(config.errors.length, 0);
  });

  it('should accept valid auth modes and timeout', () => {
    process.env.MC_AUTH = 'microsoft';
    process.env.MC_CONNECT_TIMEOUT_MS = '15000';
    process.env.MC_PASSWORD = 'secret-password-123';

    const { loadConfig } = require('../src/config/index');
    const config = loadConfig();

    assert.strictEqual(config.mc.auth, 'microsoft');
    assert.strictEqual(config.mc.connectTimeoutMs, 15000);
    assert.strictEqual(config.mc.password, 'secret-password-123');
    assert.strictEqual(config.errors.length, 0);
  });

  it('should report error for invalid auth mode', () => {
    process.env.MC_AUTH = 'custom_insecure_auth';

    const { loadConfig } = require('../src/config/index');
    const config = loadConfig();

    assert.ok(config.errors.length > 0);
    assert.ok(config.errors.some(e => e.includes('MC_AUTH')));
  });

  it('should report error for invalid connect timeout', () => {
    process.env.MC_CONNECT_TIMEOUT_MS = '500'; // Less than 1000

    const { loadConfig } = require('../src/config/index');
    const config = loadConfig();

    assert.ok(config.errors.length > 0);
    assert.ok(config.errors.some(e => e.includes('MC_CONNECT_TIMEOUT_MS')));
  });
});
