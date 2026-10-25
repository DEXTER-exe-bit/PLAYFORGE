/**
 * PLAYFORGE — Renderer (Frontend) Logic
 * Communicates with the main process exclusively through
 * the window.playforge API exposed by preload.js.
 * No Node.js APIs are available here.
 */

// ——— DOM References ———
const connStatus = document.getElementById('conn-status');
const connServer = document.getElementById('conn-server');
const connVersion = document.getElementById('conn-version');
const connUsername = document.getElementById('conn-username');
const botHealth = document.getElementById('bot-health');
const botFood = document.getElementById('bot-food');
const botPosition = document.getElementById('bot-position');
const aiStatus = document.getElementById('ai-status');
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const targetPlayerInput = document.getElementById('target-player');
const btnFollow = document.getElementById('btn-follow');
const btnComeHere = document.getElementById('btn-come-here');
const btnStopMove = document.getElementById('btn-stop-move');
const logOutput = document.getElementById('log-output');
const logContainer = document.getElementById('log-container');

// ——— State ———
let currentStatus = 'disconnected';

// ——— UI Update Functions ———

function updateConnectionStatus(status) {
  currentStatus = status;
  connStatus.textContent = status.charAt(0).toUpperCase() + status.slice(1);
  connStatus.className = 'value status-' + status;

  // Toggle buttons
  btnStart.disabled = (status === 'connected' || status === 'connecting');
  btnStop.disabled = (status === 'disconnected');

  // Toggle movement controls (only active when connected)
  const isConnected = (status === 'connected');
  if (btnFollow) btnFollow.disabled = !isConnected;
  if (btnComeHere) btnComeHere.disabled = !isConnected;
  if (btnStopMove) btnStopMove.disabled = !isConnected;
}

function updateBotState(state) {
  botHealth.textContent = state.health !== null ? `${state.health} / 20` : '—';
  botFood.textContent = state.food !== null ? `${state.food} / 20` : '—';

  if (state.position) {
    const p = state.position;
    botPosition.textContent = `${Math.round(p.x)}, ${Math.round(p.y)}, ${Math.round(p.z)}`;
  } else {
    botPosition.textContent = '—';
  }
}

function appendLog(entry) {
  if (logOutput.textContent === 'Waiting for events...') {
    logOutput.textContent = '';
  }
  logOutput.textContent += entry + '\n';
  // Auto-scroll to bottom
  logContainer.scrollTop = logContainer.scrollHeight;
}

// ——— Event Listeners ———

btnStart.addEventListener('click', async () => {
  btnStart.disabled = true;
  appendLog('[UI] Starting bot...');
  const result = await window.playforge.startBot();
  if (!result.ok) {
    appendLog(`[UI] Start failed: ${result.reason}`);
    btnStart.disabled = false;
  }
});

btnStop.addEventListener('click', async () => {
  btnStop.disabled = true;
  appendLog('[UI] Stopping bot...');
  const result = await window.playforge.stopBot();
  if (!result.ok) {
    appendLog(`[UI] Stop failed: ${result.reason}`);
    btnStop.disabled = false;
  }
});

btnFollow.addEventListener('click', async () => {
  const username = targetPlayerInput ? targetPlayerInput.value.trim() : '';
  appendLog(`[UI] Follow requested for: ${username || '(auto-target player)'}`);
  const result = await window.playforge.followPlayer(username);
  if (!result.ok) {
    appendLog(`[UI] Follow command rejected: ${result.reason}`);
  }
});

btnComeHere.addEventListener('click', async () => {
  const username = targetPlayerInput ? targetPlayerInput.value.trim() : '';
  appendLog(`[UI] Come Here requested for: ${username || '(auto-target player)'}`);
  const result = await window.playforge.comeHere(username);
  if (!result.ok) {
    appendLog(`[UI] Come Here command rejected: ${result.reason}`);
  }
});

btnStopMove.addEventListener('click', async () => {
  appendLog('[UI] Stop movement requested');
  const result = await window.playforge.stopMovement();
  if (!result.ok) {
    appendLog(`[UI] Stop movement error: ${result.reason}`);
  }
});

// ——— IPC Listeners ———

window.playforge.onLogEntry((entry) => {
  appendLog(entry);
});

window.playforge.onBotStatus((status) => {
  updateConnectionStatus(status);
  window.playforge.getBotStatus().then((st) => {
    if (st && st.config) {
      connServer.textContent = `${st.config.host}:${st.config.port}`;
      connVersion.textContent = st.config.version || '1.21.4';
      connUsername.textContent = st.config.username;
    }
  }).catch(() => {});
});

window.playforge.onBotState((state) => {
  updateBotState(state);
});

// ——— Initialization ———

async function init() {
  try {
    // Load initial status
    const status = await window.playforge.getBotStatus();
    if (status.config) {
      connServer.textContent = `${status.config.host}:${status.config.port}`;
      connVersion.textContent = status.config.version;
      connUsername.textContent = status.config.username;
    }
    updateConnectionStatus(status.status || 'disconnected');

    // Load AI status
    const ai = await window.playforge.getAIStatus();
    aiStatus.textContent = ai.configured
      ? `${ai.modelId} ✓`
      : 'Not configured';
    aiStatus.className = 'value ' + (ai.configured ? 'status-connected' : 'status-disconnected');

    // Load existing logs
    const logs = await window.playforge.getLogs();
    logs.forEach(entry => appendLog(entry));
  } catch (err) {
    appendLog(`[UI Error] Init failed: ${err.message}`);
  }
}

init();
