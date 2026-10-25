/**
 * PLAYFORGE — Electron Main Process
 * Launches the desktop window and manages the bot adapter lifecycle.
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { loadConfig } = require('./config/index');
const { BotAdapter } = require('./bot/adapter');
const { AIClient } = require('./ai/client');
const { validateAction, logActionAttempt, getAllowedActions } = require('./bot/safety');

let mainWindow = null;
let botAdapter = null;
let aiClient = null;
const activityLog = [];

function addLog(message) {
  const entry = `[${new Date().toISOString()}] ${message}`;
  activityLog.push(entry);
  // Keep log bounded
  if (activityLog.length > 500) activityLog.shift();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('log-entry', entry);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 700,
    minHeight: 500,
    title: 'PLAYFORGE — Minecraft AI Companion',
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Deny opening new windows from the renderer
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function initServices() {
  const config = loadConfig();

  if (config.errors.length > 0) {
    config.errors.forEach(err => addLog(`[Config Error] ${err}`));
  }

  addLog(`[Config] MC target: ${config.mc.host}:${config.mc.port} (${config.mc.version}, auth: ${config.mc.auth}) as ${config.mc.username}`);

  botAdapter = new BotAdapter(config.mc);
  aiClient = new AIClient(config.ai);

  // Forward adapter events to the renderer
  botAdapter.on('log', (msg) => addLog(msg));
  botAdapter.on('statusChange', (status) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('bot-status', status);
    }
  });
  botAdapter.on('stateUpdate', (state) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('bot-state', state);
    }
  });

  addLog('[Init] Services initialized. Bot adapter ready.');
  addLog(`[Init] AI client configured: ${aiClient.isConfigured ? 'Yes' : 'No (set AI_API_KEY in .env)'}`);
}

// ——— IPC Handlers ———

ipcMain.handle('bot:start', async () => {
  const check = validateAction('bot.connect');
  logActionAttempt('bot.connect', check, addLog);
  if (!check.allowed) return { ok: false, reason: check.reason };

  const config = loadConfig();
  if (config.errors.length > 0) {
    config.errors.forEach(err => addLog(`[Config Error] ${err}`));
    return { ok: false, reason: config.errors.join('; ') };
  }
  botAdapter.updateConfig(config.mc);

  try {
    await botAdapter.connect();
    return { ok: true };
  } catch (err) {
    addLog(`[Error] Connection failed: ${err.message}`);
    return { ok: false, reason: err.message };
  }
});

ipcMain.handle('bot:stop', async () => {
  const check = validateAction('bot.disconnect');
  logActionAttempt('bot.disconnect', check, addLog);
  if (!check.allowed) return { ok: false, reason: check.reason };

  try {
    await botAdapter.disconnect();
    return { ok: true };
  } catch (err) {
    addLog(`[Error] Disconnect failed: ${err.message}`);
    return { ok: false, reason: err.message };
  }
});

ipcMain.handle('bot:follow', async (_event, username) => {
  const check = validateAction('move.follow');
  logActionAttempt('move.follow', check, addLog);
  if (!check.allowed) return { ok: false, reason: check.reason };

  if (!botAdapter) return { ok: false, reason: 'Bot adapter not initialized' };
  return botAdapter.followPlayer(username);
});

ipcMain.handle('bot:come-here', async (_event, username) => {
  const check = validateAction('move.goto');
  logActionAttempt('move.goto', check, addLog);
  if (!check.allowed) return { ok: false, reason: check.reason };

  if (!botAdapter) return { ok: false, reason: 'Bot adapter not initialized' };
  return botAdapter.comeToPlayer(username);
});

ipcMain.handle('bot:stop-move', async () => {
  const check = validateAction('move.stop');
  logActionAttempt('move.stop', check, addLog);
  if (!check.allowed) return { ok: false, reason: check.reason };

  if (!botAdapter) return { ok: false, reason: 'Bot adapter not initialized' };
  return botAdapter.stopMovement();
});

ipcMain.handle('bot:status', () => {
  if (!botAdapter) return { status: 'not_initialized' };
  return botAdapter.getStatus();
});

ipcMain.handle('ai:status', () => {
  if (!aiClient) return { configured: false };
  return aiClient.getStatus();
});

ipcMain.handle('safety:allowlist', () => {
  return getAllowedActions();
});

ipcMain.handle('app:logs', () => {
  return [...activityLog];
});

// ——— App Lifecycle ———

app.whenReady().then(() => {
  createWindow();
  initServices();
});

app.on('window-all-closed', async () => {
  if (botAdapter && botAdapter.status !== 'disconnected') {
    await botAdapter.disconnect();
  }
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
