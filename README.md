# Comet Chasers - Development Guide

## Project Structure

This project follows a modular architecture using ES6 modules for clean separation of concerns.

```
CometChaser/
├── index.html          (Original prototype - preserved)
├── game.html           (New Phaser 3 implementation)
├── docs/
│   ├── main_idea.txt
│   └── style_implementation.txt
└── src/
    ├── main.js         (Entry point, Phaser config)
    ├── config/
    │   └── constants.js    (All game constants)
    ├── entities/
    │   ├── Ship.js         (Player ship with zero-g physics)
    │   ├── Comet.js        (Asteroids with gravity wells)
    │   ├── Alien.js        (Enemy AI ships)
    │   └── Projectile.js   (Laser weapons)
    ├── managers/
    │   ├── CometManager.js     (Spawning & lifecycle)
    │   ├── AlienManager.js     (Enemy management)
    │   ├── InputManager.js     (Input abstraction)
    │   └── MultiplayerManager.js (Playroom Kit integration)
    └── scenes/
        ├── GameScene.js    (Main game loop)
        └── UIScene.js      (HUD overlay)
```

## Phase 3 Implementation ✅ (LATEST)

### Multiplayer Features

1. **Playroom Kit Integration**
   - Automatic lobby system - everyone who joins the game enters one shared lobby
   - Real-time player state synchronization using WebRTC and WebSockets
   - Random name generation for players (e.g., "Swift Explorer", "Cosmic Navigator")
   - Player colors assigned by Playroom Kit profile

2. **Leaderboard System**
   - Appears automatically when 2+ players join
   - Shows all player names and scores in real-time
   - Highlights local player with "►" indicator and gold color
   - Shows [DESTROYED] status for eliminated players
   - Updates dynamically as scores change

3. **Player Join Notifications**
   - Toast notification appears when new players join
   - Shows player name with animated fade in/out
   - Queues multiple notifications to avoid overlap

4. **Player Finding System**
   - Directional arrows appear at screen edges
   - Point toward other players when they're >600 units away
   - Color-coded by player color
   - Automatically hide when players are nearby

5. **PvP Combat**
   - Players can shoot each other with lasers
   - Damage and health synchronization across network
   - All players can hit aliens collaboratively
   - Collision detection for player-player projectiles

6. **Visual Differentiation**
   - Local player: Standard blue color with crosshair
   - Remote players: Unique colors from Playroom profile
   - Remote player names displayed above their ships
   - No crosshair shown for remote players (client-side only)

## Phase 1 & 2 Features ✅

### Phase 1: Core Mechanics

1. **Zero-G Physics (Matter.js)**
   - Ships drift continuously with inertia
   - No friction - true space movement
   - Thrust applies force, not velocity
   - Velocity cap prevents infinite acceleration

2. **Gravity Wells**
   - Each comet emits gravitational pull
   - Strength based on comet size
   - Inverse-square law approximation
   - Helps players "catch" comets for docking

3. **The Rain**
   - Comets spawn top-left, drift bottom-right
   - Diagonal flow prevents camping
   - Dynamic spawn rate increases with score
   - Variety in size and speed

4. **Fuel Management**
   - Thrust consumes fuel
   - Slow drift allows passive regeneration
   - Docking provides rapid refueling
   - Out of fuel = game over

5. **Docking Mechanic**
   - Must match comet velocity (relative speed < 3)
   - Press S/Down when close to dock
   - Locks ship to comet position
   - Thrust to undock

6. **Input System**
   - Keyboard: Arrow keys, WASD, Space
   - Touch: Tap to rotate and thrust toward finger
   - Designed for easy Playroom Kit integration

### Phase 2: Combat System

1. **Health & Damage**
   - Ships start with 100 health
   - Take damage from alien projectiles and player lasers
   - Invulnerability frames after being hit (flicker effect)
   - Heal slowly while docked on comets

2. **Laser Weapons**
   - Charge-based system (0-100%)
   - Charges faster while docked
   - Z key to shoot
   - Consumes full charge per shot

3. **Lock-On Targeting**
   - SHIFT to lock onto nearest alien
   - Ship auto-rotates toward locked target
   - Visual indicator shows locked target
   - Lock breaks if target too far away

4. **Alien AI**
   - Patrol, Attack, Flee, and Dock behaviors
   - Aliens chase and shoot at players
   - Flee to comets when health is low
   - Heal while docked on comets

## Running the Game

### Local Development

1. **Start a local server** (required for ES6 modules):
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Node.js (with http-server)
   npx http-server -p 8000
   ```

2. **Open in browser**:
   ```
   http://localhost:8000/game.html
   ```

### Controls

- **Arrow Keys / WASD**: Rotate and thrust
- **Space**: Thrust forward
- **S / Down Arrow**: Dock (when near comet at low speed)
- **Z**: Shoot laser (when charged)
- **SHIFT**: Lock-on to nearest alien
- **ESC**: Restart game
- **Touch**: Tap to rotate ship toward finger and thrust

## Multiplayer Setup

The game uses Playroom Kit for multiplayer functionality. When you load the game:

1. A lobby screen appears automatically
2. Share the room code or QR code with other players
3. Players can join from any device (desktop or mobile)
4. Host clicks "Launch" to start the game
5. All players spawn in the same world
6. Leaderboard appears showing all player scores

### Multiplayer Features

- **Shared World**: All players see the same comets and aliens
- **PvP Combat**: Players can shoot each other (friendly fire enabled)
- **Collaborative Combat**: Work together to fight aliens
- **Player Tracking**: Arrows point to distant players
- **Real-time Sync**: Player positions, health, and scores sync automatically

## Technical Implementation

### Multiplayer Architecture

**MultiplayerManager** handles all Playroom Kit integration:
- Initializes lobby and manages player connections
- Syncs player positions using unreliable (fast) WebRTC
- Syncs critical state (health, score) using reliable WebSockets
- Generates random player names from adjective + noun combinations
- Maintains map of all active players and their ships

**Host Authority**: The host player is authoritative for:
- Comet spawn positions and velocities
- Alien positions and behaviors
- Hit detection and damage calculations

**Client Prediction**: Non-host players:
- Render their own ship immediately (no lag)
- Interpolate remote player positions for smooth movement
- Receive authoritative updates from host

### Network Optimization

- Position updates: 10Hz (100ms) via WebRTC (unreliable, fast)
- State updates: On change via WebSockets (reliable, slower)
- Interpolation: 30% lerp factor for smooth remote player movement
- Projectiles: Each client simulates their own with occasional sync

## Future Enhancements (Phase 4+)

### Potential Features:

1. **Enhanced Visuals**
   - Particle trails for ships
   - More dramatic explosions
   - Background nebulae
   - Planet textures

2. **Power-ups**
   - Shield generators
   - Speed boosts
   - Weapon upgrades
   - Fuel canisters

3. **Game Modes**
   - Team battles (2v2, 3v3)
   - Capture the Comet
   - Race mode
   - Survival waves

4. **Mobile Controls**
   - Playroom Kit joystick integration
   - Touch-optimized UI
   - Gyroscope controls

## Development Notes

### Adding New Features

1. **Constants**: Add to `src/config/constants.js`
2. **Entities**: Create class in `src/entities/`
3. **Game Logic**: Add to `GameScene.js`
4. **UI**: Add to `UIScene.js`

### Debugging

Enable Matter.js debug mode in `main.js`:
```javascript
matter: {
    debug: true  // Shows collision boundaries
}
```

### Performance Tips

- Use object pooling for particles
- Limit comet count based on performance
- Consider LOD for distant objects

## Credits

Based on design docs in `docs/` folder.
Built with Phaser 3 and Matter.js.
