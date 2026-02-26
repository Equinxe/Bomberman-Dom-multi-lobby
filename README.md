# Bomberman DOM — Multiplayer Lobby

A real-time multiplayer Bomberman game built entirely with vanilla JavaScript and a custom virtual-DOM renderer. No frameworks — just pure ES modules, WebSockets, and sprite-based rendering.

![Bomberman Logo](assets/logo/bomberman-logo.png)

## Features

- **Real-time multiplayer** via WebSockets (up to 4 players per lobby)
- **Lobby system** — create or join lobbies with a short code; lobby chat included
- **Game modes** — Free-for-All (FFA) and 2v2 Team mode
- **Power-ups** — bombs, flames, speed, wallpass, detonator, vest, extra life, and skull curses
- **Custom virtual-DOM** — lightweight `render()` / `createElement()` engine in `Core/dom.js`
- **Sprite-based rendering** — all players, tiles, bombs, and power-ups rendered from sprite sheets
- **Responsive HUD** — top bar with player cards + timer, bottom bar with live power-up stats
- **Spectator overlay** — watch after elimination
- **Auto-countdown** — lobby auto-starts when 4 players join or all players ready up

## Project Structure

```
├── index.html              Entry HTML (loads main.js)
├── main.js                 Client entry point (orchestrator)
├── style.css               Global styles
├── package.json            Node project config (ws dependency)
│
├── Core/                   Custom virtual-DOM framework
│   ├── dom.js              render(), createElement(), diff/patch
│   ├── events.js           Event registration system
│   ├── router.js           Simple hash-based router
│   └── state.js            Global client state store
│
├── client/                 Client-side game logic
│   ├── game-client.js      Game bootstrap, render loop, overlays
│   ├── game-engine.js      Game-loop tick, HUD wiring
│   ├── game-chat.js        In-game chat handler
│   ├── input-manager.js    Keyboard input capture
│   ├── lobby-controller.js Lobby join/create/update logic
│   ├── overlays.js         Death & win overlay helpers
│   ├── ui-overlays.js      WS indicator, popups, lobby countdown
│   ├── state-sync.js       Dispatcher for server → client state sync
│   └── sync/               Per-entity sync handlers
│       ├── player-sync.js
│       ├── bomb-sync.js
│       └── powerup-sync.js
│
├── multiplayer/            Networking
│   ├── server.js           Node entry point (imports ws-server)
│   ├── ws-server.js        WebSocket server, broadcast, message routing
│   └── socket.js           Client-side WebSocket wrapper
│
├── server/                 Server-side game logic
│   ├── gameManager.js      Per-lobby game state manager
│   ├── bomb.js             Bomb placement & explosion logic
│   ├── collision.js        Server-side collision detection
│   ├── entities/
│   │   ├── explosion.js    Explosion propagation
│   │   ├── power-up.js     Power-up drop & pickup
│   │   └── skull-curse.js  Skull curse effects
│   ├── game/
│   │   ├── game-lifecycle.js  Game start / end / win detection
│   │   ├── input-handler.js   Process player inputs
│   │   └── movement.js        Player movement with collision
│   └── lobby/
│       ├── lobby-manager.js   Lobby CRUD, player join/leave, exit-to-lobby
│       ├── lobby-state.js     Lobby state factory & serialisation
│       └── lobby-timer.js     Waiting / countdown timer state machine
│
├── shared/                 Code shared between client & server
│   ├── constants.js        Colors, map size, teams, game modes
│   ├── cell-types.js       Tile type enum (empty, wall, brick, …)
│   ├── game-rules.js       Win-condition helpers
│   ├── map-generator.js    Random map generation
│   └── player-defaults.js  Default player stats factory
│
├── ui/                     UI components (virtual-DOM)
│   ├── components/
│   │   ├── Hud.js              HUD orchestrator
│   │   ├── hud/
│   │   │   ├── top-hud-bar.js      Top bar (players + timer)
│   │   │   ├── powerup-bar.js      Bottom bar (power-ups + score + FPS)
│   │   │   └── player-hud-card.js  Single player card widget
│   │   ├── ChatPanel.js
│   │   ├── ColorSelector.js
│   │   ├── GameChat.js
│   │   ├── LobbyPanel.js
│   │   ├── LobbySettings.js
│   │   ├── PlayerCard.js
│   │   ├── PlayerPreview.js
│   │   ├── Popup.js
│   │   ├── SpectatorOverlay.js
│   │   ├── Sprite.js
│   │   ├── TeamSelector.js
│   │   └── WsIndicator.js
│   ├── helpers/
│   │   ├── collision.js
│   │   ├── constants.js
│   │   ├── nickname.js
│   │   ├── sprite-loader.js
│   │   └── tiles.js
│   ├── renderers/
│   │   ├── bomb-renderer.js
│   │   ├── player-renderer.js
│   │   ├── powerup-renderer.js
│   │   └── tile-renderer.js
│   └── views/
│       ├── GameView.js
│       ├── LobbyView.js
│       └── WaitingRoomView.js
│
└── assets/                 Sprites, backgrounds, logo
    ├── background/
    ├── images/
    └── logo/
```

## Getting Started

### Prerequisites

- **Node.js** v18 or later
- **npm** (comes with Node)
- A modern browser (Chrome, Firefox, Edge, Safari)

### Install & Run

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/Bomberman-Dom-multi-lobby.git
cd Bomberman-Dom-multi-lobby

# 2. Install dependencies
npm install

# 3. Start the WebSocket server
npm start
```

The WebSocket server starts on **port 9001**.

### Open the Game

Open `index.html` directly in your browser (e.g. double-click the file, or use a local HTTP server):

```bash
# Option A: use any static file server
npx serve .

# Option B: VS Code Live Server extension, Python http.server, etc.
```

Then enter a nickname, optionally a lobby code, and click **Play**.

## How to Play

| Key        | Action              |
| ---------- | ------------------- |
| Arrow keys | Move                |
| Space      | Place bomb          |
| E          | Detonate (if owned) |
| Enter      | Send chat message   |

### Power-ups

| Icon | Name      | Effect                       |
| ---- | --------- | ---------------------------- |
| 💣   | Bomb      | +1 max simultaneous bombs    |
| 🔥   | Flames    | +1 explosion range           |
| ⚡   | Speed     | Move faster                  |
| 👻   | Wallpass  | Walk through breakable walls |
| 🎯   | Detonator | Press **E** to trigger bombs |
| 🛡️   | Vest      | Survive one explosion        |
| ❤️   | Life Up   | +1 extra life                |
| 💀   | Skull     | Random negative curse        |

## Game Modes

- **FFA (Free-for-All)** — Last player standing wins
- **Team 2v2** — Last team with a surviving member wins

## Tech Stack

| Layer      | Technology                         |
| ---------- | ---------------------------------- |
| Runtime    | Node.js (ES modules)               |
| Networking | `ws` (WebSocket library)           |
| Rendering  | Custom virtual-DOM + sprite sheets |
| Styling    | Vanilla CSS + inline styles        |
| Font       | Press Start 2P (Google Fonts)      |

## License

ISC — see [LICENSE](LICENSE) for details.
