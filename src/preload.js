/**
 * PLAYFORGE — Preload Script (Secure Bridge)
 * Exposes a minimal API to the renderer via contextBridge.
 * No Node.js APIs leak into the frontend.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('playforge', {
  // Bot controls
  startBot: () => ipcRenderer.invoke('bot:start'),
  stopBot: () => ipcRenderer.invoke('bot:stop'),
  getBotStatus: () => ipcRenderer.invoke('bot:status'),

  // Movement controls
  followPlayer: (username) => ipcRenderer.invoke('bot:follow', username),
  comeHere: (username) => ipcRenderer.invoke('bot:come-here', username),
  stopMovement: () => ipcRenderer.invoke('bot:stop-move'),

  // AI status
  getAIStatus: () => ipcRenderer.invoke('ai:status'),

  // Safety
  getAllowlist: () => ipcRenderer.invoke('safety:allowlist'),

  // Logs
  getLogs: () => ipcRenderer.invoke('app:logs'),

  // Event listeners (renderer subscribes to these)
  onLogEntry: (callback) => {
    ipcRenderer.on('log-entry', (_event, entry) => callback(entry));
  },
  onBotStatus: (callback) => {
    ipcRenderer.on('bot-status', (_event, status) => callback(status));
  },
  onBotState: (callback) => {
    ipcRenderer.on('bot-state', (_event, state) => callback(state));
  },
});
