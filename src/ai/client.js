/**
 * PLAYFORGE AI Client — OpenAI-compatible API interface
 *
 * Designed for future Nemotron integration.
 * Sends requests to any OpenAI-compatible endpoint.
 *
 * STATUS: Stub — does not make real API calls yet.
 * The interface is ready; actual integration comes in Milestone 4.
 */

class AIClient {
  /**
   * @param {{ baseUrl: string, apiKey: string, modelId: string }} config
   */
  constructor(config) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.modelId = config.modelId;
    this.isConfigured = !!(config.baseUrl && config.apiKey);
  }

  /**
   * Returns whether the AI client has valid configuration.
   */
  getStatus() {
    return {
      configured: this.isConfigured,
      baseUrl: this.baseUrl,
      modelId: this.modelId,
      // Never expose the API key
      hasApiKey: !!this.apiKey,
    };
  }

  /**
   * Sends a chat completion request to the AI endpoint.
   * Milestone 4 will implement the actual HTTP call.
 *
   * @param {Array<{role: string, content: string}>} messages
   * @returns {Promise<{content: string, raw: object}>}
   */
  async chat(messages) {
    if (!this.isConfigured) {
      return {
        content: '[AI not configured — set AI_API_KEY and AI_API_BASE_URL in .env]',
        raw: null,
      };
    }

    // Milestone 4: actual fetch() call to this.baseUrl + '/chat/completions'
    return {
      content: '[AI stub — real API integration pending Milestone 4]',
      raw: null,
    };
  }
}

module.exports = { AIClient };
