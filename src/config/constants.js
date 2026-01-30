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
export const COMET_BASE_SPAWN_RATE = 0.02; // Probability per frame - reduced for better spacing
export const COMET_SPAWN_INCREASE_RATE = 0.00005; // Increase per score point
export const COMET_COLOR = 0x94a3b8;
export const COMET_STROKE_COLOR = 0x64748b;
export const COMET_REMOVAL_BUFFER = 400; // Distance off-screen before removal

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
    PROJECTILE: 0x0008
};
