import * as C from '../config/constants.js';
import Projectile from './Projectile.js';

/**
 * Alien Entity - Enemy ship with AI
 * Can fly around, dock to comets, and shoot at player
 */
export default class Alien {
    constructor(scene, x, y, ownerId = null) {
        this.scene = scene;
        
        // Generate unique ID for network sync
        this.id = `alien_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Track which player spawned this alien (for distributed spawning)
        this.ownerId = ownerId;
        
        // Create alien body with Matter.js
        this.body = scene.matter.add.circle(x, y, C.ALIEN_SIZE, {
            friction: C.ALIEN_FRICTION,
            frictionAir: C.ALIEN_FRICTIONAIR,
            restitution: C.ALIEN_RESTITUTION,
            mass: C.ALIEN_MASS,
            collisionFilter: {
                category: C.COLLISION_CATEGORIES.ALIEN,
                mask: C.COLLISION_CATEGORIES.COMET | C.COLLISION_CATEGORIES.PROJECTILE
            }
        });
        
        // Store reference on body
        this.body.alienRef = this;
        
        // Visual
        this.graphics = scene.add.graphics();
        
        // Alien state
        this.health = C.ALIEN_MAX_HEALTH;
        this.maxHealth = C.ALIEN_MAX_HEALTH;
        this.alive = true;
        this.isDocked = false;
        this.dockedComet = null;
        
        // AI state
        this.aiState = 'patrol'; // 'patrol', 'attack', 'flee', 'dock'
        this.target = null;
        this.shootCooldown = 0;
        this.stateTimer = 0;
        
        // Docking data (same as Ship)
        this.dockOffsetX = 0;
        this.dockOffsetY = 0;
        this.dockDistance = 0;
        this.dockAngle = 0;
        this.initialCometRotation = 0;
    }
    
    /**
     * Take damage
     */
    takeDamage(amount) {
        if (!this.alive) return;
        
        this.health -= amount;
        
        // Flash red when hit
        this.flashTimer = C.ALIEN_FLASH_TIME;
        
        if (this.health <= 0) {
            this.destroy();
        } else if (this.health <= C.ALIEN_FLEE_HEALTH) {
            // Low health - switch to flee mode
            this.aiState = 'flee';
        }
    }
    
    /**
     * AI decision making
     */
    updateAI(player, comets) {
        if (!this.alive || this.isDocked) return;
        
        this.stateTimer++;
        
        // Decrease shoot cooldown
        if (this.shootCooldown > 0) {
            this.shootCooldown--;
        }
        
        // Get distance to player
        const dx = player.body.position.x - this.body.position.x;
        const dy = player.body.position.y - this.body.position.y;
        const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
        
        // State machine
        switch(this.aiState) {
            case 'patrol':
                this.patrolBehavior(player, comets, distanceToPlayer);
                break;
            case 'attack':
                this.attackBehavior(player, distanceToPlayer);
                break;
            case 'flee':
                this.fleeBehavior(player, comets);
                break;
            case 'dock':
                // Already docked, handled separately
                break;
        }
    }
    
    /**
     * Patrol behavior - wander and look for player
     */
    patrolBehavior(player, comets, distanceToPlayer) {
        // If player is close, switch to attack
        if (distanceToPlayer < C.ALIEN_ATTACK_RANGE && player.alive) {
            this.aiState = 'attack';
            return;
        }
        
        // Wander randomly
        if (this.stateTimer % C.ALIEN_WANDER_INTERVAL === 0) {
            // Change direction occasionally
            const randomAngle = Math.random() * Math.PI * 2;
            this.targetAngle = randomAngle;
        }
        
        // Move toward target angle
        this.rotateTowardAngle(this.targetAngle);
        
        // Thrust occasionally
        if (Math.random() < 0.3) {
            this.thrust();
        }
        
        // Occasionally try to dock if near a comet
        if (Math.random() < 0.01) {
            const nearestComet = this.findNearestComet(comets);
            if (nearestComet) {
                const dist = this.getDistanceToComet(nearestComet);
                if (dist < 200 && Math.random() < C.ALIEN_DOCK_PROBABILITY) {
                    this.attemptDock(nearestComet);
                }
            }
        }
    }
    
    /**
     * Attack behavior - chase and shoot player
     */
    attackBehavior(player, distanceToPlayer) {
        if (!player.alive) {
            this.aiState = 'patrol';
            return;
        }
        
        // If player too far, return to patrol
        if (distanceToPlayer > C.ALIEN_ATTACK_RANGE * 1.5) {
            this.aiState = 'patrol';
            return;
        }
        
        // Calculate angle to player
        const dx = player.body.position.x - this.body.position.x;
        const dy = player.body.position.y - this.body.position.y;
        const angleToPlayer = Math.atan2(dy, dx);
        
        // Rotate toward player
        this.rotateTowardAngle(angleToPlayer);
        
        // Check if roughly facing player
        let angleDiff = angleToPlayer - this.body.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        // If facing player and in range, shoot
        if (Math.abs(angleDiff) < 0.3 && distanceToPlayer < C.ALIEN_ATTACK_RANGE) {
            if (this.shootCooldown === 0) {
                this.shoot();
                this.shootCooldown = C.ALIEN_SHOOT_COOLDOWN;
            }
        }
        
        // Maintain distance - thrust toward or away
        if (distanceToPlayer > 300) {
            // Too far, move closer
            if (Math.abs(angleDiff) < 0.5) {
                this.thrust();
            }
        } else if (distanceToPlayer < 200) {
            // Too close, back away
            // Rotate 180 and thrust
            const awayAngle = angleToPlayer + Math.PI;
            this.rotateTowardAngle(awayAngle);
            if (Math.abs(angleDiff) > 2.5) { // Roughly facing away
                this.thrust();
            }
        }
    }
    
    /**
     * Flee behavior - run to nearest comet and dock
     */
    fleeBehavior(player, comets) {
        const nearestComet = this.findNearestComet(comets);
        
        if (!nearestComet) {
            // No comet to flee to, just run away from player
            const dx = this.body.position.x - player.body.position.x;
            const dy = this.body.position.y - player.body.position.y;
            const fleeAngle = Math.atan2(dy, dx);
            
            this.rotateTowardAngle(fleeAngle);
            this.thrust();
            return;
        }
        
        // Fly toward nearest comet
        const dx = nearestComet.body.position.x - this.body.position.x;
        const dy = nearestComet.body.position.y - this.body.position.y;
        const angleToComet = Math.atan2(dy, dx);
        
        this.rotateTowardAngle(angleToComet);
        this.thrust();
        
        // Try to dock if close
        const dist = this.getDistanceToComet(nearestComet);
        if (dist < C.DOCK_DISTANCE * 1.5) {
            this.attemptDock(nearestComet);
        }
    }
    
    /**
     * Apply thrust
     */
    thrust() {
        if (!this.alive || this.isDocked) return;
        
        const angle = this.body.angle;
        const force = {
            x: Math.cos(angle) * C.ALIEN_THRUST_FORCE,
            y: Math.sin(angle) * C.ALIEN_THRUST_FORCE
        };
        
        this.scene.matter.body.applyForce(this.body, this.body.position, force);
        
        // Limit velocity
        this.limitVelocity();
    }
    
    /**
     * Limit velocity
     */
    limitVelocity() {
        const velocity = this.body.velocity;
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
        
        if (speed > C.ALIEN_MAX_VELOCITY) {
            const scale = C.ALIEN_MAX_VELOCITY / speed;
            this.scene.matter.body.setVelocity(this.body, {
                x: velocity.x * scale,
                y: velocity.y * scale
            });
        }
    }
    
    /**
     * Rotate toward angle
     */
    rotateTowardAngle(targetAngle) {
        let angleDiff = targetAngle - this.body.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        if (Math.abs(angleDiff) > 0.1) {
            if (angleDiff > 0) {
                this.scene.matter.body.setAngle(
                    this.body, 
                    this.body.angle + C.ALIEN_ROTATION_SPEED
                );
            } else {
                this.scene.matter.body.setAngle(
                    this.body, 
                    this.body.angle - C.ALIEN_ROTATION_SPEED
                );
            }
        }
    }
    
    /**
     * Shoot at player
     */
    shoot() {
        if (!this.alive || this.isDocked) return;
        
        // Add some inaccuracy
        const inaccuracy = (Math.random() - 0.5) * C.ALIEN_SHOOT_ACCURACY * 2;
        const shootAngle = this.body.angle + inaccuracy;
        
        // Create projectile slightly ahead of alien
        const spawnDist = C.ALIEN_SIZE + C.PROJECTILE_SPAWN_DISTANCE;
        const x = this.body.position.x + Math.cos(shootAngle) * spawnDist;
        const y = this.body.position.y + Math.sin(shootAngle) * spawnDist;
        
        const projectile = new Projectile(
            this.scene,
            x, y,
            shootAngle,
            {
                damage: C.ALIEN_PROJECTILE_DAMAGE,
                speed: C.ALIEN_PROJECTILE_SPEED,
                lifetime: C.ALIEN_PROJECTILE_LIFETIME,
                color: C.ALIEN_PROJECTILE_COLOR,
                owner: 'alien'
            }
        );
        
        // Add to scene's projectile list
        if (this.scene.projectiles) {
            this.scene.projectiles.push(projectile);
        }
        
        // Broadcast shoot event for multiplayer
        // Each player broadcasts shots from their owned aliens
        if (this.scene.multiplayerManager && this.scene.multiplayerManager.isMultiplayerActive()) {
            const { myPlayer } = window.Playroom;
            const me = myPlayer();
            
            // Only broadcast if this alien is owned by the local player
            if (me && this.ownerId === this.scene.multiplayerManager.localPlayerId) {
                // Get current alien shots from player state or initialize
                const currentShots = me.getState('alienShots') || [];
                
                // Add new shot event
                const shotEvent = {
                    alienId: this.id,
                    timestamp: Date.now(),
                    x: x,
                    y: y,
                    angle: shootAngle
                };
                
                // Keep only recent shots (last 10 shots to avoid memory buildup)
                const recentShots = [...currentShots, shotEvent].slice(-10);
                
                me.setState('alienShots', recentShots, false); // Use unreliable for fast updates
            }
        }
    }
    
    /**
     * Find nearest comet
     */
    findNearestComet(comets) {
        if (!comets || comets.length === 0) return null;
        
        let nearest = null;
        let minDist = Infinity;
        
        for (let comet of comets) {
            const dist = this.getDistanceToComet(comet);
            if (dist < minDist) {
                minDist = dist;
                nearest = comet;
            }
        }
        
        return nearest;
    }
    
    /**
     * Get distance to comet
     */
    getDistanceToComet(comet) {
        const dx = comet.body.position.x - this.body.position.x;
        const dy = comet.body.position.y - this.body.position.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Attempt to dock to comet
     */
    attemptDock(comet) {
        if (this.isDocked || !this.alive) return;
        
        const dx = comet.body.position.x - this.body.position.x;
        const dy = comet.body.position.y - this.body.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Check if close enough and moving slow enough relative to comet
        const relVelX = this.body.velocity.x - comet.body.velocity.x;
        const relVelY = this.body.velocity.y - comet.body.velocity.y;
        const relSpeed = Math.sqrt(relVelX * relVelX + relVelY * relVelY);
        
        // Use same logic as ship: account for comet radius
        const inDockRange = distance < C.DOCK_DISTANCE + comet.radius;
        
        if (inDockRange) {
            // Rotate alien to face away from comet center before docking
            const angleToComet = Math.atan2(dy, dx);
            const landingAngle = angleToComet + Math.PI; // Face outward
            this.scene.matter.body.setAngle(this.body, landingAngle);
            
            this.dock(comet);
        }
    }
    
    /**
     * Dock to comet
     */
    dock(comet) {
        this.isDocked = true;
        this.dockedComet = comet;
        this.aiState = 'dock';
        
        // Disable collision with docked comet to prevent physics glitches
        this.body.collisionFilter.mask = C.COLLISION_CATEGORIES.PROJECTILE;
        
        // Match comet velocity
        this.scene.matter.body.setVelocity(this.body, {
            x: comet.body.velocity.x,
            y: comet.body.velocity.y
        });
        
        // Store offset from comet center
        this.dockOffsetX = this.body.position.x - comet.body.position.x;
        this.dockOffsetY = this.body.position.y - comet.body.position.y;
        this.dockDistance = Math.sqrt(
            this.dockOffsetX * this.dockOffsetX + 
            this.dockOffsetY * this.dockOffsetY
        );
        this.dockAngle = Math.atan2(this.dockOffsetY, this.dockOffsetX);
        this.initialCometRotation = comet.rotation;
        
        // Face outward
        const angleToCenter = Math.atan2(
            comet.body.position.y - this.body.position.y,
            comet.body.position.x - this.body.position.x
        );
        this.scene.matter.body.setAngle(this.body, angleToCenter + Math.PI);
        
        // Heal while docked
        this.healTimer = 0;
        this.stateTimer = 0; // Reset timer to track docking duration
    }
    
    /**
     * Undock from comet
     */
    undock() {
        if (!this.isDocked) return;
        
        // Re-enable collision with comets
        this.body.collisionFilter.mask = C.COLLISION_CATEGORIES.COMET | C.COLLISION_CATEGORIES.PROJECTILE;
        
        // Push away
        const pushAngle = this.body.angle;
        this.scene.matter.body.setVelocity(this.body, {
            x: this.dockedComet.body.velocity.x + Math.cos(pushAngle) * 2,
            y: this.dockedComet.body.velocity.y + Math.sin(pushAngle) * 2
        });
        
        this.isDocked = false;
        this.dockedComet = null;
        this.aiState = 'attack'; // Return to attacking player after healing
        this.stateTimer = 0; // Reset timer for new state
    }
    
    /**
     * Update docking position
     */
    updateDocking() {
        if (!this.isDocked || !this.dockedComet) return;
        
        // Track time docked
        this.stateTimer++;
        
        // Heal slowly while docked
        this.healTimer = (this.healTimer || 0) + 1;
        if (this.healTimer >= C.ALIEN_HEAL_INTERVAL) {
            this.health = Math.min(this.maxHealth, this.health + C.ALIEN_HEAL_AMOUNT);
            this.healTimer = 0;
        }
        
        // Undock after healing to 80% or after 5 seconds docked
        if (this.health >= this.maxHealth * 0.8 || this.stateTimer > 300) {
            this.undock();
            return;
        }
        
        // Maintain position on comet (same logic as Ship)
        const comet = this.dockedComet;
        const rotationDelta = comet.rotation - this.initialCometRotation;
        const currentAngle = this.dockAngle + rotationDelta;
        
        const newX = comet.body.position.x + Math.cos(currentAngle) * this.dockDistance;
        const newY = comet.body.position.y + Math.sin(currentAngle) * this.dockDistance;
        
        this.scene.matter.body.setPosition(this.body, { x: newX, y: newY });
        this.scene.matter.body.setVelocity(this.body, {
            x: comet.body.velocity.x,
            y: comet.body.velocity.y
        });
        
        // Update rotation to face outward
        const angleToCenter = Math.atan2(
            comet.body.position.y - newY,
            comet.body.position.x - newX
        );
        this.scene.matter.body.setAngle(this.body, angleToCenter + Math.PI);
    }
    
    /**
     * Main update
     */
    update(player, comets) {
        if (!this.alive) return;
        
        // Only owner runs AI logic for their aliens, others just render
        const isLocallyOwned = this.scene.multiplayerManager && 
                              this.scene.multiplayerManager.isMultiplayerActive() &&
                              this.ownerId === this.scene.multiplayerManager.localPlayerId;
        
        // In single player, always run AI
        const shouldRunAI = !this.scene.multiplayerManager || 
                           !this.scene.multiplayerManager.isMultiplayerActive() || 
                           isLocallyOwned;
        
        if (shouldRunAI) {
            // Find nearest player to target
            let targetPlayer = player;
            
            if (this.scene.multiplayerManager && this.scene.multiplayerManager.isMultiplayerActive()) {
                const allShips = this.scene.multiplayerManager.getAllShips();
                if (allShips.length > 0) {
                    // Find nearest alive player
                    let nearestPlayer = null;
                    let minDistance = Infinity;
                    
                    for (const ship of allShips) {
                        if (ship.alive) {
                            const dx = ship.body.position.x - this.body.position.x;
                            const dy = ship.body.position.y - this.body.position.y;
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            
                            if (distance < minDistance) {
                                minDistance = distance;
                                nearestPlayer = ship;
                            }
                        }
                    }
                    
                    if (nearestPlayer) {
                        targetPlayer = nearestPlayer;
                    }
                }
            }
            
            if (this.isDocked) {
                this.updateDocking();
            } else {
                this.updateAI(targetPlayer, comets);
            }
        }
        
        this.draw();
    }
    
    /**
     * Draw alien
     */
    draw() {
        if (!this.alive) return;
        
        this.graphics.clear();
        
        const x = this.body.position.x;
        const y = this.body.position.y;
        const angle = this.body.angle;
        
        this.graphics.save();
        this.graphics.translateCanvas(x, y);
        this.graphics.rotateCanvas(angle);
        
        // Flash red when hit
        const color = (this.flashTimer && this.flashTimer > 0) ? 
            0xffffff : C.ALIEN_COLOR;
        if (this.flashTimer) this.flashTimer--;
        
        // Alien body (triangle shape)
        this.graphics.fillStyle(color, 1);
        this.graphics.lineStyle(2, C.ALIEN_STROKE_COLOR, 1);
        
        this.graphics.beginPath();
        this.graphics.moveTo(C.ALIEN_SIZE, 0); // Nose
        this.graphics.lineTo(-C.ALIEN_SIZE, -C.ALIEN_SIZE * 0.6); // Top wing
        this.graphics.lineTo(-C.ALIEN_SIZE * 0.5, 0); // Center back
        this.graphics.lineTo(-C.ALIEN_SIZE, C.ALIEN_SIZE * 0.6); // Bottom wing
        this.graphics.closePath();
        this.graphics.fillPath();
        this.graphics.strokePath();
        
        // Cockpit
        this.graphics.fillStyle(0xffaa00, 0.8);
        this.graphics.fillCircle(0, 0, C.ALIEN_SIZE * 0.3);
        
        this.graphics.restore();
        
        // Health bar above alien
        if (this.health < this.maxHealth) {
            const barWidth = C.ALIEN_HEALTH_BAR_WIDTH;
            const barHeight = C.ALIEN_HEALTH_BAR_HEIGHT;
            const barY = y - C.ALIEN_SIZE - C.ALIEN_HEALTH_BAR_OFFSET;
            
            // Background
            this.graphics.fillStyle(0x000000, 0.6);
            this.graphics.fillRect(x - barWidth / 2, barY, barWidth, barHeight);
            
            // Health
            const healthPercent = this.health / this.maxHealth;
            const healthColor = healthPercent > 0.5 ? 0x00ff00 : 
                               healthPercent > 0.25 ? 0xffff00 : 0xff0000;
            this.graphics.fillStyle(healthColor, 1);
            this.graphics.fillRect(
                x - barWidth / 2, 
                barY, 
                barWidth * healthPercent, 
                barHeight
            );
        }
    }
    
    /**
     * Destroy alien
     */
    destroy() {
        if (!this.alive) return;
        
        this.alive = false;
        
        // Broadcast alien kill to other players in multiplayer
        if (this.scene.multiplayerManager && this.scene.multiplayerManager.isMultiplayerActive()) {
            this.scene.multiplayerManager.broadcastAlienKill(this.id);
        }
        
        // Create explosion
        this.createExplosion();
        
        // Remove body
        if (this.body && this.scene.matter.world) {
            this.scene.matter.world.remove(this.body);
        }
        
        // Remove graphics
        if (this.graphics) {
            this.graphics.destroy();
        }
        
        // Award points
        if (this.scene.events) {
            this.scene.events.emit('alienDestroyed', C.ALIEN_KILL_SCORE);
        }
    }
    
    /**
     * Create explosion effect
     */
    createExplosion() {
        const x = this.body.position.x;
        const y = this.body.position.y;
        
        // Create explosion particles
        for (let i = 0; i < C.EXPLOSION_PARTICLE_COUNT; i++) {
            const angle = (Math.PI * 2 * i) / C.EXPLOSION_PARTICLE_COUNT;
            const speed = C.EXPLOSION_PARTICLE_SPEED_MIN + Math.random() * (C.EXPLOSION_PARTICLE_SPEED_MAX - C.EXPLOSION_PARTICLE_SPEED_MIN);
            
            const particle = this.scene.add.circle(
                x, y, C.EXPLOSION_PARTICLE_SIZE, C.ALIEN_COLOR, 1
            );
            
            this.scene.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * speed * C.EXPLOSION_PARTICLE_DISTANCE,
                y: y + Math.sin(angle) * speed * C.EXPLOSION_PARTICLE_DISTANCE,
                alpha: 0,
                scale: 0,
                duration: C.EXPLOSION_DURATION_MIN + Math.random() * (C.EXPLOSION_DURATION_MAX - C.EXPLOSION_DURATION_MIN),
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }
    }
}
