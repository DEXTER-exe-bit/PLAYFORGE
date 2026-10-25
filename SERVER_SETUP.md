# PLAYFORGE — Minecraft 1.21.4 Server Connection Guide

This guide describes how to configure and connect PLAYFORGE to a Minecraft Java Edition 1.21.4 server.

---

## 1. Environment & Protocol Compatibility

- **Minecraft Edition:** Java Edition
- **Target Release:** `1.21.4` (Vanilla)
- **Protocol Version:** `769`
- **Bot Engine:** Mineflayer `4.39.0` (with `minecraft-data` 1.21.4)

---

## 2. Configuration Fields (`.env`)

Configuration is read locally from `E:\PLAYFORGE\.env`. Secrets are never committed to version control or sent to the renderer.

| Variable | Type | Default | Description |
|---|---|---|---|
| `MC_HOST` | String | `localhost` | Server IP or hostname (e.g. `127.0.0.1` or `myserver.aternos.me`) |
| `MC_PORT` | Integer | `25565` | Server port (1–65535). For LAN/Aternos, use the dynamic port shown in game |
| `MC_USERNAME` | String | `PlayForgeBot` | In-game bot name (1–16 characters) |
| `MC_VERSION` | String | `1.21.4` | Minecraft version string (fixed to `1.21.4`) |
| `MC_AUTH` | String | `offline` | Authentication mode: `offline` (for TLauncher/LAN/cracked) or `microsoft` |
| `MC_CONNECT_TIMEOUT_MS` | Integer | `30000` | Connection timeout in milliseconds (minimum 1000) |
| `MC_PASSWORD` | String | *(empty)* | Optional. Password if using Microsoft auth or server auth plugins |

### Example `.env` for Local LAN or Cracked Server:
```env
MC_HOST=127.0.0.1
MC_PORT=51234
MC_USERNAME=PlayForgeBot
MC_VERSION=1.21.4
MC_AUTH=offline
MC_CONNECT_TIMEOUT_MS=30000
```

---

## 3. Step-by-Step Connection Instructions

### Scenario A: Local Minecraft World ("Open to LAN")
This is the easiest way to test without an external server:
1. Launch **Minecraft Java Edition 1.21.4** (e.g., via TLauncher or official launcher).
2. Create or load a Singleplayer world.
3. Press `Esc` and click **Open to LAN**.
4. Set **Allow Cheats: ON** (optional) and click **Start LAN World**.
5. Note the 5-digit port shown in Minecraft chat (e.g., `Local game hosted on port 54321`).
6. In `E:\PLAYFORGE\.env`:
   ```env
   MC_HOST=127.0.0.1
   MC_PORT=54321
   MC_USERNAME=PlayForgeBot
   MC_AUTH=offline
   MC_VERSION=1.21.4
   ```
7. Start PLAYFORGE (`npm start`), and click **▶ Start Bot**.
8. Verify in game that `PlayForgeBot joined the game` and check the health/position in PLAYFORGE.

---

### Scenario B: Aternos Server (Minecraft 1.21.4)
1. Go to your Aternos dashboard and verify the Software is set to **Vanilla 1.21.4**.
2. In the **Options** tab on Aternos:
   - Turn **Cracked: ON** (if using `MC_AUTH=offline` or TLauncher).
   - Turn **Whitelist: OFF** (or add `PlayForgeBot` to the whitelist).
3. Start the Aternos server.
4. Locate the **Connect** button on Aternos to see the dynamic IP and Port (e.g. `yourname.aternos.me:42135`).
5. Update `E:\PLAYFORGE\.env`:
   ```env
   MC_HOST=yourname.aternos.me
   MC_PORT=42135
   MC_USERNAME=PlayForgeBot
   MC_AUTH=offline
   MC_VERSION=1.21.4
   ```
6. Start PLAYFORGE (`npm start`) and click **▶ Start Bot**.

---

### Scenario C: Dedicated Private Vanilla Server
1. Ensure `server.properties` has:
   ```properties
   server-port=25565
   online-mode=false   # if using offline auth
   white-list=false    # or add PlayForgeBot to whitelist.json
   ```
2. Set `MC_HOST` to your server's IP and `MC_PORT` to `25565`.

---

## 4. Lifecycle & Safety Verification

- **Start Bot:** Initiates connection handshake. Status switches to `Connecting`, then `Connected` once the bot spawns.
- **Stop Bot:** Sends a clean disconnect packet and closes the socket. State resets to null.
- **Timeout Protection:** If the server does not respond within `MC_CONNECT_TIMEOUT_MS`, the bot aborts and reports an `error` status.
- **Read-Only Reporting:** Milestone 2 only queries bot health, food, position, and chat. No automatic movement or actions are executed.
