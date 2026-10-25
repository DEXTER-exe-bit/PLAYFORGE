/**
 * PLAYFORGE Follow & Movement Behavior
 * Implements local pathfinding for follow, come-here, and stop using mineflayer-pathfinder.
 */

let pathfinderModule = null;
try {
  pathfinderModule = require('mineflayer-pathfinder');
} catch {
  pathfinderModule = null;
}

class MovementController {
  /**
   * @param {object} bot - mineflayer bot instance
   * @param {{ pathfinderModule?: object }} [options]
   */
  constructor(bot, options = {}) {
    this.bot = bot;
    this.pathfinder = options.pathfinderModule || pathfinderModule;
    /** @type {'follow' | 'goto' | null} */
    this.currentGoalType = null;
    /** @type {string | null} */
    this.currentTarget = null;
    this._initialized = false;
  }

  /**
   * Initializes pathfinder plugin and movements on the bot.
   * @returns {boolean}
   */
  init() {
    if (!this.bot || !this.pathfinder) return false;
    if (this._initialized) return true;

    try {
      if (!this.bot.pathfinder && typeof this.bot.loadPlugin === 'function') {
        this.bot.loadPlugin(this.pathfinder.pathfinder);
      }

      if (this.pathfinder.Movements && this.bot.pathfinder) {
        const defaultMove = new this.pathfinder.Movements(this.bot);
        this.bot.pathfinder.setMovements(defaultMove);
      }

      this._initialized = true;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Follow a player dynamically.
   * @param {string} [username]
   * @param {number} [range=2]
   * @returns {{ ok: boolean, message?: string, reason?: string }}
   */
  follow(username, range = 2) {
    if (!this.init()) {
      return { ok: false, reason: 'Pathfinder is not available or failed to initialize' };
    }

    const target = this._findPlayer(username);
    if (!target) {
      return { ok: false, reason: `Player "${username || 'target'}" not found on server` };
    }
    if (!target.entity) {
      return { ok: false, reason: `Player "${target.username}" is outside render/entity distance` };
    }

    try {
      const { GoalFollow } = this.pathfinder.goals;
      const goal = new GoalFollow(target.entity, range);
      this.bot.pathfinder.setGoal(goal, true);
      this.currentGoalType = 'follow';
      this.currentTarget = target.username;
      return { ok: true, message: `Now following ${target.username} (range: ${range})` };
    } catch (err) {
      return { ok: false, reason: err.message };
    }
  }

  /**
   * Navigate to player's current position.
   * @param {string} [username]
   * @param {number} [range=1]
   * @returns {{ ok: boolean, message?: string, reason?: string }}
   */
  comeHere(username, range = 1) {
    if (!this.init()) {
      return { ok: false, reason: 'Pathfinder is not available or failed to initialize' };
    }

    const target = this._findPlayer(username);
    if (!target) {
      return { ok: false, reason: `Player "${username || 'target'}" not found on server` };
    }
    if (!target.entity || !target.entity.position) {
      return { ok: false, reason: `Player "${target.username}" position is not available` };
    }

    try {
      const { GoalNear } = this.pathfinder.goals;
      const { x, y, z } = target.entity.position;
      const goal = new GoalNear(x, y, z, range);
      this.bot.pathfinder.setGoal(goal, false);
      this.currentGoalType = 'goto';
      this.currentTarget = target.username;
      return {
        ok: true,
        message: `Moving toward ${target.username} at (${Math.round(x)}, ${Math.round(y)}, ${Math.round(z)})`,
      };
    } catch (err) {
      return { ok: false, reason: err.message };
    }
  }

  /**
   * Stops current movement and clears pathfinder goal.
   * @returns {{ ok: boolean, message: string }}
   */
  stop() {
    this.currentGoalType = null;
    this.currentTarget = null;

    if (this.bot && this.bot.pathfinder) {
      try {
        if (typeof this.bot.pathfinder.stop === 'function') {
          this.bot.pathfinder.stop();
        } else if (typeof this.bot.pathfinder.setGoal === 'function') {
          this.bot.pathfinder.setGoal(null);
        }
      } catch {}
    }

    return { ok: true, message: 'Movement stopped' };
  }

  /**
   * Returns current movement state.
   */
  getStatus() {
    return {
      active: !!this.currentGoalType,
      type: this.currentGoalType,
      target: this.currentTarget,
    };
  }

  /**
   * Helper to resolve player instance from username or fallback to first other player.
   * @private
   */
  _findPlayer(username) {
    if (!this.bot || !this.bot.players) return null;

    if (username && typeof username === 'string' && username.trim() !== '') {
      const targetName = username.trim().toLowerCase();
      return (
        Object.values(this.bot.players).find(
          (p) => p.username && p.username.toLowerCase() === targetName
        ) || null
      );
    }

    // Fallback: first other player on server when no username was specified
    return (
      Object.values(this.bot.players).find(
        (p) => p.username && p.username !== this.bot.username
      ) || null
    );
  }
}

module.exports = { MovementController };
