# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-10-25

### Added
- **Electron Desktop Application**: Dark-themed user interface displaying real-time connection status, bot health, hunger, position, and streamed activity logs.
- **Minecraft 1.21.4 Bot Adapter**: Real Mineflayer adapter supporting Minecraft Java Edition 1.21.4 (Vanilla, Protocol 769).
- **Connection Lifecycle Management**: Clean transitions between `disconnected`, `connecting`, `connected`, and `error` states with timeout guards and duplicate connection prevention.
- **Local Movement Controls**:
  - `Follow`: Dynamic player tracking via `mineflayer-pathfinder` (`GoalFollow`) with automatic player detection.
  - `Come Here`: Direct navigation to player coordinates (`GoalNear`).
  - `Stop Move`: Immediate pathfinding cancellation (`bot.pathfinder.stop`).
- **Safety Action Allowlist**: Frozen runtime allowlist (`ALLOWED_ACTIONS`) validating and auditing every bot command prior to execution.
- **Modular Configuration**: Environment loader reading `.env` with support for server host, port, username, authentication mode (`offline` or `microsoft`), and timeout.
- **AI Client Interface**: Modular OpenAI-compatible client stub prepared for future Nemotron integration.
- **Automated Test Suite**: 46 unit and integration tests covering config validation, safety allowlisting, connection lifecycle, and pathfinding.

### Security
- Context isolation and disabled node integration in Electron preload bridge.
- Strict Content Security Policy (CSP) enforcing local script and asset execution.
- Credential sanitization ensuring passwords and API keys are never exposed to renderer processes or logged.
- Comprehensive `.gitignore` protecting `.env`, runtime logs, and local configuration.
