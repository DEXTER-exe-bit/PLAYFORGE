/**
 * PLAYFORGE Configuration Loader
 * Reads .env file and validates required configuration.
 */
const path = require('path');
const fs = require('fs');

// Load .env from project root (not in test environment)
if (process.env.NODE_ENV !== 'test') {
  const dotenvPath = path.resolve(__dirname, '..', '..', '.env');
  if (fs.existsSync(dotenvPath)) {
    require('dotenv').config({ path: dotenvPath });
  }
}

const DEFAULTS = {
  MC_HOST: 'localhost',
  MC_PORT: '25565',
  MC_USERNAME: 'PlayForgeBot',
  MC_VERSION: '1.21.4',
  MC_AUTH: 'offline',
  MC_CONNECT_TIMEOUT_MS: '30000',
  AI_API_BASE_URL: 'http://localhost:8000/v1',
  AI_MODEL_ID: 'nemotron',
};

/**
 * Loads and validates configuration from environment variables.
 * @returns {{ mc: { host: string, port: number, username: string, version: string, auth: string, password?: string, connectTimeoutMs: number }, ai: { baseUrl: string, apiKey: string, modelId: string } }}
 */
function loadConfig() {
  const mc = {
    host: process.env.MC_HOST || DEFAULTS.MC_HOST,
    port: parseInt(process.env.MC_PORT || DEFAULTS.MC_PORT, 10),
    username: process.env.MC_USERNAME || DEFAULTS.MC_USERNAME,
    version: process.env.MC_VERSION || DEFAULTS.MC_VERSION,
    auth: process.env.MC_AUTH || DEFAULTS.MC_AUTH,
    password: process.env.MC_PASSWORD || '',
    connectTimeoutMs: parseInt(process.env.MC_CONNECT_TIMEOUT_MS || DEFAULTS.MC_CONNECT_TIMEOUT_MS, 10),
  };

  const ai = {
    baseUrl: process.env.AI_API_BASE_URL || DEFAULTS.AI_API_BASE_URL,
    apiKey: process.env.AI_API_KEY || '',
    modelId: process.env.AI_MODEL_ID || DEFAULTS.AI_MODEL_ID,
  };

  // Validate
  const errors = [];
  if (!mc.host) errors.push('MC_HOST is required');
  if (isNaN(mc.port) || mc.port < 1 || mc.port > 65535) {
    errors.push('MC_PORT must be a valid port number (1-65535)');
  }
  if (!mc.username || mc.username.length < 1 || mc.username.length > 16) {
    errors.push('MC_USERNAME must be 1-16 characters');
  }
  if (!mc.version) errors.push('MC_VERSION is required');
  if (mc.auth !== 'offline' && mc.auth !== 'microsoft') {
    errors.push('MC_AUTH must be either "offline" or "microsoft"');
  }
  if (isNaN(mc.connectTimeoutMs) || mc.connectTimeoutMs < 1000) {
    errors.push('MC_CONNECT_TIMEOUT_MS must be at least 1000 ms');
  }

  return { mc, ai, errors };
}

module.exports = { loadConfig, DEFAULTS };
