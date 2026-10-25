/**
 * PLAYFORGE Safety Module
 * Validates bot actions against an explicit allowlist.
 * No action executes unless it appears in ALLOWED_ACTIONS.
 */

/**
 * Allowlist of permitted bot actions.
 * Each key is an action name; value is a description.
 * To enable a new action, it MUST be added here first.
 */
const ALLOWED_ACTIONS = {
  // Read-only / passive actions
  'status.health': 'Read bot health',
  'status.position': 'Read bot position',
  'status.inventory': 'Read bot inventory',
  'chat.read': 'Read chat messages',
  'chat.send': 'Send a chat message',

  // Movement actions
  'move.follow': 'Follow a specific player',
  'move.stop': 'Stop all movement',
  'move.goto': 'Navigate to coordinates',

  // Lifecycle
  'bot.connect': 'Connect to server',
  'bot.disconnect': 'Disconnect from server',
};

// Frozen to prevent runtime mutation
const FROZEN_ALLOWLIST = Object.freeze({ ...ALLOWED_ACTIONS });

/**
 * Validates whether an action is permitted.
 * @param {string} actionName - The action to validate (e.g. 'move.follow')
 * @returns {{ allowed: boolean, reason: string }}
 */
function validateAction(actionName) {
  if (typeof actionName !== 'string' || actionName.trim() === '') {
    return { allowed: false, reason: 'Action name must be a non-empty string' };
  }

  const normalized = actionName.trim().toLowerCase();

  if (normalized in FROZEN_ALLOWLIST) {
    return { allowed: true, reason: `Action '${normalized}' is permitted` };
  }

  return {
    allowed: false,
    reason: `Action '${normalized}' is NOT in the allowlist. Denied.`,
  };
}

/**
 * Returns a copy of the current allowlist.
 * @returns {Record<string, string>}
 */
function getAllowedActions() {
  return { ...FROZEN_ALLOWLIST };
}

/**
 * Logs an action attempt for auditing.
 * @param {string} actionName
 * @param {{ allowed: boolean, reason: string }} result
 * @param {Function} [logger=console.log]
 */
function logActionAttempt(actionName, result, logger = console.log) {
  const timestamp = new Date().toISOString();
  const status = result.allowed ? 'ALLOWED' : 'DENIED';
  const entry = `[${timestamp}] [SAFETY] ${status}: ${actionName} — ${result.reason}`;
  logger(entry);
  return entry;
}

module.exports = {
  validateAction,
  getAllowedActions,
  logActionAttempt,
  ALLOWED_ACTIONS: FROZEN_ALLOWLIST,
};
