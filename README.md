# PLAYFORGE ⛏

> **An independent desktop AI companion for Minecraft Java Edition.**

PLAYFORGE is a desktop application built with Electron and Mineflayer that connects an autonomous companion bot to Minecraft Java Edition servers. It provides real-time telemetry, pathfinding controls (Follow, Come Here, Stop), safety action allowlisting, and a modular architecture prepared for future AI model integration.

---

## 📸 Preview

```
+-----------------------------------------------------------------------+
|  ⛏ PLAYFORGE                         Minecraft AI Companion          |
+-----------------------------------------------------------------------+
|  [ CONNECTION STATUS ]                 [ BOT STATE ]                  |
|  Status: Connected                    Health: 20 / 20                 |
|  Server: 127.0.0.1:25565              Food:   20 / 20                 |
|  Version: 1.21.4 (Vanilla)            Position: (142, 64, -289)       |
|  Username: PlayForgeBot               AI: Nemotron (Stub)             |
+-----------------------------------------------------------------------+
|  [ CONTROLS ]                                                         |
|  [ ▶ Start Bot ]   [ ⏹ Stop Bot ]                                     |
|  [ Target Player: Alex         ] [ 🏃 Follow ] [ 📍 Come Here ] [ 🛑 Stop Move ] |
+-----------------------------------------------------------------------+
|  [ ACTIVITY LOG ]                                                     |
|  [19:15:02] [Adapter] Connecting to 127.0.0.1:25565 as PlayForgeBot...|
|  [19:15:04] [Adapter] Bot spawned in world at (142, 64, -289).        |
|  [19:15:10] [SAFETY] ALLOWED: move.follow — Action permitted          |
|  [19:15:10] [Movement] Now following Alex (range: 2)                  |
+-----------------------------------------------------------------------+
```

---

## 🚀 Development Status (v0.1.0 Preview)

> [!IMPORTANT]
> **Version 0.1.0 is an early public preview.**
> - **Working:** Real Minecraft 1.21.4 (Vanilla) connection, lifecycle handling, live health/food/position tracking, and local follow-player pathfinding.
> - **Local Movement:** Movement runs entirely on local pathfinding (`mineflayer-pathfinder`). No AI tokens or external API calls are used for routine movement.
> - **In Progress:** AI decision-making (Nemotron integration) is currently a modular stub designed for future milestones. Standalone Windows installer packaging (`.exe`) is planned for future releases.

---

## ✨ Features

- **Minecraft 1.21.4 Compatibility:** Targets Vanilla Java Edition release 1.21.4 (Protocol 769) using the official `mineflayer` (v4.39.0) ecosystem.
- **Clean Desktop UI:** Dark-themed interface showing live connection status, bot vital signs, coordinates, and real-time activity logs.
- **Local Movement Controls:**
  - **🏃 Follow:** Dynamically tracks and paths toward the designated player (or nearest player if left blank).
  - **📍 Come Here:** Navigates directly to the player's current coordinates.
  - **🛑 Stop Move:** Clears current pathfinding goals immediately.
- **Safety Action Allowlist:** Every bot action is strictly validated against a frozen allowlist (`ALLOWED_ACTIONS`) and logged before execution.
- **Secure Configuration:** Environment variables loaded locally via `.env`. Secrets and API keys are strictly excluded from frontend code, activity logs, and Git tracking.
- **Robust Connection Lifecycle:** Handles timeouts, disconnection, kicks, and error recovery cleanly without crashing.

---

## 📋 Prerequisites

- **Operating System:** Windows 10/11, macOS, or Linux
- **Node.js:** v18.0.0 or higher (tested on Node.js v24.19.0)
- **npm:** v9.0.0 or higher (tested on npm 11.17.0)
- **Minecraft:** Java Edition **Release 1.21.4 (Vanilla)** (via official launcher, TLauncher, or compatible launcher)

---

## 🛠 Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/playforge.git
   cd playforge
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment settings:**
   Copy the sample environment file to create your local `.env`:
   ```bash
   cp .env.example .env
   ```
   *(On Windows Command Prompt, use `copy .env.example .env`)*

---

## ⚙️ Configuration Reference

Edit `.env` in the root directory to match your Minecraft server settings:

| Variable | Default | Description |
|---|---|---|
| `MC_HOST` | `localhost` | Server IP or hostname (e.g. `127.0.0.1` or `myserver.aternos.me`) |
| `MC_PORT` | `25565` | Server port (1–65535). For LAN games, use the 5-digit port shown in game |
| `MC_USERNAME` | `PlayForgeBot` | Companion bot in-game username (1–16 characters) |
| `MC_VERSION` | `1.21.4` | Fixed target version (`1.21.4`) |
| `MC_AUTH` | `offline` | Authentication mode: `offline` (for LAN / TLauncher / cracked) or `microsoft` |
| `MC_CONNECT_TIMEOUT_MS` | `30000` | Connection timeout in milliseconds (minimum 1000) |
| `MC_PASSWORD` | *(empty)* | Optional password if required by server auth plugins or Microsoft account |
| `AI_API_BASE_URL` | `http://localhost:8000/v1` | OpenAI-compatible endpoint (prepared for v0.3.0) |
| `AI_API_KEY` | *(empty)* | Optional API key for LLM provider (never exposed to UI or Git) |
| `AI_MODEL_ID` | `nemotron` | AI model identifier |

---

## 🎮 Connecting to Minecraft

### Option A: Local Singleplayer World (Quickest)
1. Launch **Minecraft Java Edition 1.21.4**.
2. Open a Singleplayer world.
3. Press `Esc` ➔ **Open to LAN** ➔ **Start LAN World**.
4. Note the port displayed in chat (e.g., `Local game hosted on port 58882`).
5. In `.env`, set:
   ```env
   MC_HOST=127.0.0.1
   MC_PORT=58882
   MC_AUTH=offline
   ```
6. Start PLAYFORGE:
   ```bash
   npm start
   ```
7. Click **▶ Start Bot**.

### Option B: Aternos / Multiplayer Server
1. Ensure your server software is set to **Vanilla 1.21.4**.
2. If using `MC_AUTH=offline`, enable **Cracked: ON** in server options.
3. Whitelist `PlayForgeBot` or turn whitelist off.
4. Copy the server address and dynamic port into `MC_HOST` and `MC_PORT`.
5. For full server details, see [SERVER_SETUP.md](SERVER_SETUP.md).

---

## 🧪 Testing

Run the automated test suite (includes config validation, safety allowlisting, connection lifecycle, and pathfinding mocks):

```bash
npm test
```

All 46 unit and integration tests run using Node.js's native test runner (`node --test`).

---

## 🔍 Troubleshooting

| Issue | Likely Cause | Solution |
|---|---|---|
| `ECONNREFUSED` | Server is offline or wrong port | Verify Minecraft is running and check the port in `.env` |
| `Version mismatch` | Server is running an incompatible release | Ensure your server and game profile are set to Vanilla `1.21.4` |
| `Outside render distance` | Player is too far away for pathfinding | Walk closer to the bot in game so chunk entities are loaded |
| `Bot kicked: Whitelist` | Server has whitelist enabled | Run `/whitelist add <bot-username>` in server console |
| Bot doesn't move | Obstacles or unsupported jump | Ensure the terrain is walkable; clear immediate obstructions |

---

## 🗺 Roadmap

- [x] **v0.1.0 — Early Public Preview:**
  - Real Mineflayer connection to Minecraft Java Edition 1.21.4
  - Electron dark desktop dashboard with telemetry and activity logs
  - Local follow-player pathfinding controls (Follow, Come Here, Stop)
  - Action allowlist and secure configuration
- [ ] **v0.2.0 — Navigation & Controls:**
  - Improved obstacle handling, unstuck routines, and jump parkour
  - Custom follow distance and stay-within-radius settings
  - Chat command listening and basic companion emotes
- [ ] **v0.3.0 — AI Companion Integration:**
  - OpenAI-compatible LLM endpoint integration (e.g. local Nemotron)
  - Natural language chat interaction
  - Contextual awareness (inventory, nearby mobs, time of day)

---

## 🔒 Security & Privacy

- **API Key & Credential Safety:** The Electron frontend is completely isolated via `contextBridge` (`nodeIntegration: false`, `contextIsolation: true`). Secret keys and passwords stored in `.env` are never passed over IPC or rendered in the DOM.
- **Git Hygiene:** `.env` and runtime logs are explicitly excluded via `.gitignore`. Check tracked files prior to committing.

---

## 📄 License

*License decision is currently pending.* Options under consideration include:
- **MIT License:** Permissive, allowing anyone to use, modify, and distribute freely.
- **Apache 2.0:** Permissive with explicit grant of patent rights.
- **GNU GPL v3:** Copyleft, requiring derivative works to remain open source.

Please see the project discussion or open an issue if you have licensing feedback.
