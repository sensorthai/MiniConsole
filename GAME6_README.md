# Game 6: Cyber Tennis (`games/game6.js`)

## 1. Architecture
`Game6Tennis` extends [`GameBase`](js/gameBase.js) and integrates into the Mini Game Console 3D lifecycle:
- `init()`: Initializes the 3D cyber-tennis arena, neon court lines, net, glowing tennis ball with ground shadow ring, 1–4 players, and `this.audio.startTennisBGM()`.
- `fixedUpdate(dt)`: Runs deterministic 60 Hz physics (ball gravity, court bounce, net collision, boundary/double-bounce scoring), player movement, shot execution, AI positioning, and camera framing.
- `updateHUD()`: Renders live scoreboard, match timer, player hit/special-charge cards, point banners, and the end-of-match summary via `this.buildSummaryTableHTML(...)`.
- `dispose()`: Stops BGM and victory music (`this.audio.stopBGM()`, `this.audio.stopVictoryMusic()`) and releases scene geometries/materials via `super.dispose()`.

## 2. Multiplayer & AI Behavior
- Reads `Config.players.activeCount` (1–4 players):
  - **1–2 players**: 1v1 match (`P1` Blue vs `P2` Red; if 1 player, `P2` is an AI bot).
  - **3–4 players**: 2v2 doubles (`P1+P3` Blue vs `P2+P4` Red; if 3 players, `P4` is an AI bot).
- Any disconnected controller slot (`!pad || !pad.connected`) automatically activates the AI bot, which predicts ball landing coordinates (`predictBallTargetForSide()`), moves smoothly into position, and returns normal, lob, or power shots.

## 3. Controller Mapping (`this.input.pads[i]`)
| Input | Action |
| :--- | :--- |
| Left Stick (`lx`, `ly`) | Move player & aim return direction |
| `✕` (`cross`) / `R1` | Normal Shot |
| `□` (`square`) / `R2` | Power Shot (high speed + camera shake + rumble) |
| `◯` (`circle`) / `L1` | Lob Shot (high arc) |
| `△` (`triangle`) / `L2` | Special Cyber Smash (uses 50% special charge) |

> System/Menu navigation (`Enter`, `Backspace`, `P`, `ESC`, `Tab`) remains Keyboard-only in `js/main.js`.

## 4. Integration Files
- `games/game6.js` (and synced `public/games/game6.js`)
- `js/config.js` (and `public/js/config.js`): Added `cyber-tennis` to `Config.games`
- `js/main.js` (and `public/js/main.js`): Imported `Game6Tennis`, added to `GAME_CLASSES`, added 3D carousel racket+ball model
- `js/audio.js` (and `public/js/audio.js`): Added `tennisHit()`, `tennisBounce()`, `startTennisBGM()`
- `index.html`: Synced inline `<script type="module">` bundle for direct `file://` execution

## 5. How to Test
1. **Direct Browser (`file://`)**: Open `index.html`, advance to the 6th game (`CYBER TENNIS`), and start the match.
2. **Next.js Server**: Run `./start.sh` and open `http://localhost:8080`.
3. **Automated Headless Chrome Verification**: Run Chrome with `--enable-logging=stderr` and CDP to verify 1–4 player modes, shot mechanics, scoring, match completion summary, Games 1–5 compatibility, and zero JS/WebGL errors.
