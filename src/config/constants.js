// Game Constants for Comet Drifters

// Display Settings
export const GAME_WIDTH = 1200;
export const GAME_HEIGHT = 800;
export const BACKGROUND_COLOR = '#050510';

// Physics Settings
export const GRAVITY_X = 0;
export const GRAVITY_Y = 0;
export const TIME_SCALE = 1;

// Ship Settings
export const SHIP_SIZE = 20;
export const SHIP_MASS = 1;
export const SHIP_FRICTION = 0; // Zero friction for true zero-g
export const SHIP_FRICTIONAIR = 0.01; // Very slight air resistance for control
export const SHIP_RESTITUTION = 0.3; // Bounce off walls
export const SHIP_THRUST_FORCE = 0.0015; // Force applied when thrusting
export const SHIP_ROTATION_SPEED = 0.08; // Radians per frame
export const SHIP_MAX_VELOCITY = 12; // Maximum speed cap
export const SHIP_START_FUEL = 100;
export const SHIP_MAX_FUEL = 100;
export const SHIP_FUEL_CONSUMPTION = 0.5; // Fuel used per thrust frame
export const SHIP_FUEL_REGEN_RATE = 0.15; // Fuel gained per frame while docked
export const SHIP_COLOR = 0x3b82f6;
export const SHIP_STROKE_COLOR = 0x1e40af;

// Comet Settings
export const COMET_SPAWN_OFFSET = -100; // Off-screen spawn
export const COMET_MIN_SIZE = 50; // Increased from 30
export const COMET_MAX_SIZE = 120; // Increased from 80
export const COMET_MIN_VELOCITY_X = 1;
export const COMET_MAX_VELOCITY_X = 3;
export const COMET_MIN_VELOCITY_Y = 1.5;
export const COMET_MAX_VELOCITY_Y = 3.5;
export const COMET_BASE_SPAWN_RATE = 0.04; // Probability per frame - reduced for better spacing
export const COMET_SPAWN_INCREASE_RATE = 0.00005; // Increase per score point
export const MAX_COMETS_ON_SCREEN = 12; // Maximum number of comets at once

// Planet Settings (Large comets)
export const PLANET_MIN_SIZE = 200;
export const PLANET_MAX_SIZE = 350;
export const PLANET_SPAWN_CHANCE = 0.08; // 8% chance a spawn is a planet
export const PLANET_MIN_VELOCITY = 0.5; // Slower than regular comets
export const PLANET_MAX_VELOCITY = 1.5;
export const COMET_COLOR = 0x94a3b8;
export const COMET_STROKE_COLOR = 0x64748b;
export const COMET_REMOVAL_BUFFER = 400; // Distance off-screen before removal

// Depth System (for visual layering)
export const DEPTH_NEAR = 1.0;  // Closest layer (bigger, brighter)
export const DEPTH_MID = 0.7;   // Middle layer
export const DEPTH_FAR = 0.4;   // Farthest layer (smaller, dimmer)
export const SHADOW_OFFSET_X = 5; // Shadow offset for near objects
export const SHADOW_OFFSET_Y = 5;
export const SHADOW_ALPHA = 0.3; // Shadow opacity
export const SHADOW_BLUR = 10;   // Shadow blur radius

// Gravity Well Settings
export const GRAVITY_WELL_MULTIPLIER = 2.5; // Radius multiplier from comet size
export const GRAVITY_STRENGTH = 0.0003; // Force strength per distance unit (increased from 0.00008)
export const GRAVITY_MIN_DISTANCE = 10; // Minimum distance for gravity calc

// Docking Settings
export const DOCK_MAX_VELOCITY = 5; // Max relative velocity to successfully dock
export const DOCK_DISTANCE = 80; // Distance to comet center to dock
export const AUTO_DOCK_VELOCITY = 2; // Auto-dock when moving this slow near comet

// UI Settings
export const UI_FONT_FAMILY = 'Segoe UI, Arial, sans-serif';
export const UI_FONT_SIZE = 16;
export const UI_FONT_COLOR = '#4ade80';
export const UI_PADDING = 20;

// Particle Effects
export const EXPLOSION_PARTICLE_COUNT = 20;
export const THRUST_PARTICLE_COUNT = 2;
export const PARTICLE_LIFETIME = 60; // Frames

// Score Settings
export const COMET_DODGE_SCORE = 10; // Points for dodging a comet

// Input Actions (for InputManager)
export const INPUT_ACTIONS = {
    THRUST: 'thrust',
    ROTATE_LEFT: 'rotateLeft',
    ROTATE_RIGHT: 'rotateRight',
    DOCK: 'dock',
    BRAKE: 'brake'
};

// Collision Categories (Matter.js bit flags)
export const COLLISION_CATEGORIES = {
    SHIP: 0x0001,
    COMET: 0x0002,
    SENSOR: 0x0004,
    PROJECTILE: 0x0008,
    ALIEN: 0x0010,
    ALIEN_PROJECTILE: 0x0020
};

// Comet Physics
export const COMET_COLLISION_RESTITUTION = 0.6; // Bounciness when comets collide
export const COMET_COLLISION_FRICTION = 0.1;     // Friction during collision

// Player Combat Settings
export const SHIP_MAX_HEALTH = 100;
export const SHIP_START_HEALTH = 100;
export const LASER_DAMAGE = 15; // Damage per laser hit
export const LASER_CHARGE_TIME = 120; // Frames to fully charge (2 seconds at 60fps)
export const LASER_SPEED = 15;
export const LASER_LIFETIME = 120; // Frames before projectile expires
export const LASER_COLOR = 0x00ffff;
export const LASER_CHARGE_COST = 100; // Percentage of charge consumed per shot

// Alien Settings
export const ALIEN_SIZE = 18;
export const ALIEN_MASS = 0.8;
export const ALIEN_FRICTION = 0;
export const ALIEN_FRICTIONAIR = 0.015;
export const ALIEN_RESTITUTION = 0.3;
export const ALIEN_MAX_VELOCITY = 8;
export const ALIEN_THRUST_FORCE = 0.0012;
export const ALIEN_ROTATION_SPEED = 0.06;
export const ALIEN_MAX_HEALTH = 45; // Takes 3 laser hits to kill
export const ALIEN_COLOR = 0xff3366;
export const ALIEN_STROKE_COLOR = 0xcc0033;
export const ALIEN_SPAWN_INTERVAL = 300; // Frames between alien spawns (5 seconds)
export const ALIEN_SPAWN_VARIANCE = 120; // Random variance in spawn time
export const MAX_ALIENS = 5; // Maximum aliens on screen

// Alien AI Settings
export const ALIEN_ATTACK_RANGE = 400; // Distance to start attacking player
export const ALIEN_FLEE_HEALTH = 15; // Health threshold to flee to comets
export const ALIEN_SHOOT_COOLDOWN = 90; // Frames between shots
export const ALIEN_SHOOT_ACCURACY = 0.15; // Radians of inaccuracy
export const ALIEN_DOCK_PROBABILITY = 0.3; // Chance to dock when near comet

// Alien Projectile Settings
export const ALIEN_PROJECTILE_DAMAGE = 10;
export const ALIEN_PROJECTILE_SPEED = 12;
export const ALIEN_PROJECTILE_COLOR = 0xff6600;
export const ALIEN_PROJECTILE_LIFETIME = 100;
