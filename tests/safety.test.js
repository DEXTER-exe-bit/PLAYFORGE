/**
 * PLAYFORGE Safety Module Tests
 * Uses Node.js built-in test runner (node --test)
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { validateAction, getAllowedActions, logActionAttempt, ALLOWED_ACTIONS } = require('../src/bot/safety');

describe('Safety Module', () => {
  describe('validateAction', () => {
    it('should allow actions in the allowlist', () => {
      const result = validateAction('bot.connect');
      assert.strictEqual(result.allowed, true);
      assert.ok(result.reason.includes('permitted'));
    });

    it('should allow status.health', () => {
      const result = validateAction('status.health');
      assert.strictEqual(result.allowed, true);
    });

    it('should allow move.follow', () => {
      const result = validateAction('move.follow');
      assert.strictEqual(result.allowed, true);
    });

    it('should deny actions NOT in the allowlist', () => {
      const result = validateAction('world.destroy_everything');
      assert.strictEqual(result.allowed, false);
      assert.ok(result.reason.includes('NOT in the allowlist'));
    });

    it('should deny griefing actions', () => {
      const result = validateAction('block.break');
      assert.strictEqual(result.allowed, false);
    });

    it('should deny empty string', () => {
      const result = validateAction('');
      assert.strictEqual(result.allowed, false);
      assert.ok(result.reason.includes('non-empty'));
    });

    it('should deny non-string input', () => {
      const result = validateAction(123);
      assert.strictEqual(result.allowed, false);
    });

    it('should deny null input', () => {
      const result = validateAction(null);
      assert.strictEqual(result.allowed, false);
    });

    it('should handle whitespace-padded action names', () => {
      const result = validateAction('  chat.send  ');
      assert.strictEqual(result.allowed, true);
    });
  });

  describe('getAllowedActions', () => {
    it('should return a copy of the allowlist', () => {
      const actions = getAllowedActions();
      assert.ok(typeof actions === 'object');
      assert.ok('bot.connect' in actions);
      assert.ok('move.follow' in actions);
    });

    it('should not allow mutation of the original allowlist', () => {
      const actions = getAllowedActions();
      actions['hack.server'] = 'nope';
      const fresh = getAllowedActions();
      assert.strictEqual('hack.server' in fresh, false);
    });
  });

  describe('ALLOWED_ACTIONS', () => {
    it('should be frozen', () => {
      assert.ok(Object.isFrozen(ALLOWED_ACTIONS));
    });

    it('should not allow adding new properties', () => {
      assert.throws(() => {
        'use strict';
        ALLOWED_ACTIONS['exploit.xray'] = 'bad';
      });
    });
  });

  describe('logActionAttempt', () => {
    it('should log allowed actions with ALLOWED status', () => {
      const logs = [];
      const result = { allowed: true, reason: 'test' };
      const entry = logActionAttempt('bot.connect', result, (msg) => logs.push(msg));
      assert.ok(entry.includes('ALLOWED'));
      assert.ok(entry.includes('bot.connect'));
      assert.strictEqual(logs.length, 1);
    });

    it('should log denied actions with DENIED status', () => {
      const logs = [];
      const result = { allowed: false, reason: 'not allowed' };
      const entry = logActionAttempt('hack.everything', result, (msg) => logs.push(msg));
      assert.ok(entry.includes('DENIED'));
      assert.ok(entry.includes('hack.everything'));
    });

    it('should include ISO timestamp', () => {
      const result = { allowed: true, reason: 'ok' };
      const entry = logActionAttempt('chat.send', result, () => {});
      // ISO timestamps contain 'T' and 'Z' or '+'
      assert.ok(/\d{4}-\d{2}-\d{2}T/.test(entry));
    });
  });
});
