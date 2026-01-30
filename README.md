# Comet Drifters - Development Guide

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
    │   └── Comet.js        (Asteroids with gravity wells)
    ├── managers/
    │   ├── CometManager.js (Spawning & lifecycle)
    │   └── InputManager.js (Input abstraction)
    └── scenes/
        ├── GameScene.js    (Main game loop)
        └── UIScene.js      (HUD overlay)
```

## Phase 1 Implementation ✅

### Features Implemented

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
- **ESC**: Restart game
- **Touch**: Tap to rotate ship toward finger and thrust

## Next Steps - Phase 2

### To Implement Next:

1. **Enhanced Docking**
   - Visual cues for docking range
   - Docking tutorial on first play
   - Sound effects

2. **Combat System** (Phase 3)
   - Shooting mechanic
   - Ammo system
   - Projectile physics

3. **Multiplayer** (Phase 3)
   - Integrate Playroom Kit
   - Sync ship positions
   - Lobby system

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
