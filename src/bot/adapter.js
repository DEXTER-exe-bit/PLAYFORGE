/**
 * PLAYFORGE Bot Adapter — Modular Mineflayer Interface
 *
 * Provides real connection, disconnection, lifecycle management,
 * and read-only status reporting for Minecraft Java Edition 1.21.4 (Vanilla).
 */

const EventEmitter = require('events');
const { MovementController } = require('./behaviors/follow');
let mineflayer;
try {
  mineflayer = require('mineflayer');
} catch {
  mineflayer = null;
}

class BotAdapter extends EventEmitter {
  /**
   * @param {{ host: string, port: number, username: string, version: string, auth?: string, password?: string, connectTimeoutMs?: number }} config
   * @param {{ createBot?: Function, movementControllerFactory?: Function, pathfinderModule?: object }} [options]
   */
  constructor(config, options = {}) {
    super();
    this.config = { ...config };
    this._options = options;
    this._createBot = options.createBot || (mineflayer ? mineflayer.createBot : null);
    this._movementControllerFactory =
      options.movementControllerFactory ||
      ((bot) => new MovementController(bot, options));
    this.movement = null;
    this._bot = null;
    /** @type {'disconnected' | 'connecting' | 'connected' | 'error'} */
    this.status = 'disconnected';
    /** @type {{ health: number|null, food: number|null, position: {x:number, y:number, z:number}|null }} */
    this.state = {
      health: null,
      food: null,
      position: null,
    };
    this._connectTimer = null;
    this._intentionalDisconnect = false;
    this._lastPositionUpdate = 0;
  }

  /**
   * Updates bot configuration when disconnected or in error state.
   * @param {Partial<BotAdapter['config']>} newConfig
   * @returns {boolean}
   */
  updateConfig(newConfig) {
    if (this.status === 'connecting' || this.status === 'connected') {
      this.emit('log', '[Adapter] Cannot change configuration while connected or connecting.');
      return false;
    }
    this.config = { ...this.config, ...newConfig };
    return true;
  }

  /**
   * Connects to the Minecraft server.
   */
  async connect() {
    if (this.status === 'connected' || this.status === 'connecting') {
      this.emit('log', '[Adapter] Duplicate connection ignored — bot is already connected or connecting.');
      return;
    }

    if (typeof this._createBot !== 'function') {
      const err = new Error('Mineflayer library is not available');
      this.emit('log', `[Adapter] Error: ${err.message}`);
      this._setStatus('error');
      return;
    }

    // Clean up any stale bot instance
    if (this._bot) {
      this._cleanupBot();
    }

    this._intentionalDisconnect = false;
    this._setStatus('connecting');

    const authMode = this.config.auth || 'offline';
    this.emit(
      'log',
      `[Adapter] Connecting to ${this.config.host}:${this.config.port} as ${this.config.username} (MC ${this.config.version || '1.21.4'}, auth: ${authMode})...`
    );

    // Timeout protection
    const timeoutMs = this.config.connectTimeoutMs || 30000;
    this._clearConnectTimer();
    this._connectTimer = setTimeout(() => {
      if (this.status === 'connecting') {
        this.emit('log', `[Adapter] Connection timed out after ${timeoutMs}ms.`);
        this._setStatus('error');
        this._cleanupBot();
      }
    }, timeoutMs);

    try {
      const botOptions = {
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
        version: this.config.version || '1.21.4',
        auth: authMode,
      };

      if (this.config.password) {
        botOptions.password = this.config.password;
      }

      this._bot = this._createBot(botOptions);
      this._attachEventHandlers(this._bot);
    } catch (err) {
      this._clearConnectTimer();
      this.emit('log', `[Adapter] Failed to initiate connection: ${err.message}`);
      this._setStatus('error');
      this._cleanupBot();
    }
  }

  /**
   * Cleanly disconnects the bot.
   */
  async disconnect() {
    if (this.status === 'disconnected' && !this._bot) {
      this.emit('log', '[Adapter] Already disconnected.');
      return;
    }

    this._intentionalDisconnect = true;
    this._clearConnectTimer();
    this.emit('log', '[Adapter] Disconnecting...');

    if (this._bot) {
      try {
        if (typeof this._bot.quit === 'function') {
          this._bot.quit('User disconnected');
        } else if (typeof this._bot.end === 'function') {
          this._bot.end('User disconnected');
        }
      } catch (err) {
        this.emit('log', `[Adapter] Error during quit: ${err.message}`);
      }
    }

    this._setStatus('disconnected');
    this._cleanupBot();
    this.emit('log', '[Adapter] Disconnected.');
  }

  /**
   * Follows a player dynamically.
   * @param {string} [username]
   * @param {number} [range=2]
   * @returns {{ ok: boolean, message?: string, reason?: string }}
   */
  followPlayer(username, range = 2) {
    if (this.status !== 'connected' || !this.movement) {
      return { ok: false, reason: 'Bot is not connected to a server' };
    }
    const result = this.movement.follow(username, range);
    if (result.ok) {
      this.emit('log', `[Movement] ${result.message}`);
    } else {
      this.emit('log', `[Movement] Failed: ${result.reason}`);
    }
    return result;
  }

  /**
   * Navigates to a player's current location.
   * @param {string} [username]
   * @param {number} [range=1]
   * @returns {{ ok: boolean, message?: string, reason?: string }}
   */
  comeToPlayer(username, range = 1) {
    if (this.status !== 'connected' || !this.movement) {
      return { ok: false, reason: 'Bot is not connected to a server' };
    }
    const result = this.movement.comeHere(username, range);
    if (result.ok) {
      this.emit('log', `[Movement] ${result.message}`);
    } else {
      this.emit('log', `[Movement] Failed: ${result.reason}`);
    }
    return result;
  }

  /**
   * Stops active movement.
   * @returns {{ ok: boolean, message: string }}
   */
  stopMovement() {
    if (!this.movement) {
      return { ok: true, message: 'Movement already stopped' };
    }
    const result = this.movement.stop();
    this.emit('log', '[Movement] Movement stopped.');
    return result;
  }

  /**
   * Returns current safe bot status and state without leaking secrets.
   */
  getStatus() {
    return {
      status: this.status,
      health: this.state.health,
      food: this.state.food,
      position: this.state.position ? { ...this.state.position } : null,
      movement: this.movement
        ? this.movement.getStatus()
        : { active: false, type: null, target: null },
      config: {
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
        version: this.config.version || '1.21.4',
        auth: this.config.auth || 'offline',
      },
    };
  }

  /**
   * Attaches event listeners to the Mineflayer bot instance.
   * @private
   */
  _attachEventHandlers(bot) {
    if (!bot || typeof bot.on !== 'function') return;

    bot.on('login', () => {
      this.emit('log', '[Adapter] Server accepted login handshake. Waiting for world spawn...');
    });

    bot.on('spawn', () => {
      this._clearConnectTimer();
      this._setStatus('connected');

      let posStr = 'unknown position';
      if (bot.entity && bot.entity.position) {
        const { x, y, z } = bot.entity.position;
        posStr = `(${Math.round(x)}, ${Math.round(y)}, ${Math.round(z)})`;
      }
      this.emit('log', `[Adapter] Bot spawned in world at ${posStr}.`);

      this._updateState({
        health: typeof bot.health === 'number' ? bot.health : null,
        food: typeof bot.food === 'number' ? bot.food : null,
        position: bot.entity && bot.entity.position ? {
          x: bot.entity.position.x,
          y: bot.entity.position.y,
          z: bot.entity.position.z,
        } : null,
      });

      // Initialize movement controller
      try {
        this.movement = this._movementControllerFactory(bot);
        this.movement.init();
      } catch (err) {
        this.emit('log', `[Adapter] Pathfinder initialization notice: ${err.message}`);
      }
    });

    bot.on('health', () => {
      this._updateState({
        health: typeof bot.health === 'number' ? bot.health : null,
        food: typeof bot.food === 'number' ? bot.food : null,
      });
    });

    bot.on('move', () => {
      const now = Date.now();
      if (now - this._lastPositionUpdate >= 250) {
        this._lastPositionUpdate = now;
        if (bot.entity && bot.entity.position) {
          this._updateState({
            position: {
              x: bot.entity.position.x,
              y: bot.entity.position.y,
              z: bot.entity.position.z,
            },
          });
        }
      }
    });

    bot.on('chat', (username, message) => {
      if (username && username !== bot.username) {
        this.emit('log', `[Chat] <${username}> ${message}`);
      }
    });

    bot.on('kicked', (reason) => {
      this._clearConnectTimer();
      const reasonText = this._formatReason(reason);
      this.emit('log', `[Adapter] Bot was kicked from server: ${reasonText}`);
      this._setStatus('error');
      this._cleanupBot();
    });

    bot.on('error', (err) => {
      this._clearConnectTimer();
      const errMsg = err && (err.message || err.code) ? (err.message || err.code) : String(err);
      this.emit('log', `[Adapter] Connection error: ${errMsg}`);
      this._setStatus('error');
      this._cleanupBot();
    });

    bot.on('end', (reason) => {
      this._clearConnectTimer();
      if (!this._intentionalDisconnect) {
        const reasonText = reason ? `: ${this._formatReason(reason)}` : '';
        this.emit('log', `[Adapter] Server connection closed${reasonText}.`);
        if (this.status !== 'error') {
          this._setStatus('disconnected');
        }
      }
      this._cleanupBot();
    });
  }

  /**
   * Internal status updater.
   * @private
   */
  _setStatus(newStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.emit('statusChange', this.status);
    }
  }

  /**
   * Internal state updater.
   * @private
   */
  _updateState(partialState) {
    let changed = false;

    for (const [key, val] of Object.entries(partialState)) {
      if (key === 'position') {
        if (!this.state.position && val) {
          changed = true;
        } else if (this.state.position && !val) {
          changed = true;
        } else if (this.state.position && val) {
          if (
            Math.abs(this.state.position.x - val.x) > 0.05 ||
            Math.abs(this.state.position.y - val.y) > 0.05 ||
            Math.abs(this.state.position.z - val.z) > 0.05
          ) {
            changed = true;
          }
        }
      } else if (this.state[key] !== val) {
        changed = true;
      }
    }

    this.state = {
      ...this.state,
      ...partialState,
    };

    if (changed) {
      this.emit('stateUpdate', {
        health: this.state.health,
        food: this.state.food,
        position: this.state.position ? { ...this.state.position } : null,
      });
    }
  }

  /**
   * Formats chat kick or end reasons into a clean string.
   * @private
   */
  _formatReason(reason) {
    if (!reason) return 'Unknown reason';
    if (typeof reason === 'string') return reason;
    if (typeof reason === 'object') {
      if (reason.text) return reason.text;
      if (Array.isArray(reason.extra)) {
        return reason.extra.map((e) => (typeof e === 'object' ? e.text || '' : String(e))).join('');
      }
      if (reason.translate) return reason.translate;
      try {
        return JSON.stringify(reason);
      } catch {
        return String(reason);
      }
    }
    return String(reason);
  }

  /**
   * Clears timeout timer.
   * @private
   */
  _clearConnectTimer() {
    if (this._connectTimer) {
      clearTimeout(this._connectTimer);
      this._connectTimer = null;
    }
  }

  /**
   * Cleans up bot instance and resets state.
   * @private
   */
  _cleanupBot() {
    this._clearConnectTimer();
    if (this.movement) {
      try {
        this.movement.stop();
      } catch {}
      this.movement = null;
    }
    if (this._bot) {
      try {
        this._bot.removeAllListeners();
        this._bot.on('error', () => {}); // Prevent unhandled error events
      } catch {}
      this._bot = null;
    }
    this._updateState({ health: null, food: null, position: null });
  }
}

module.exports = { BotAdapter };
