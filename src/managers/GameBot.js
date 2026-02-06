// Playroom Bot is loaded globally via UMD bundle in game.html
const { Bot } = window.Playroom;

/**
 * GameBot - Autonomous bot player that extends Playroom Bot
 * Two types: "nice" (cooperative - fights aliens) and "pvp" (competitive - fights everyone)
 */
export default class GameBot extends Bot {
    constructor(botParams) {
        super(botParams);
        
        if (!window.Playroom.isHost()) return;
        
        // Randomly choose bot type (50/50 chance)
        this.botType = Math.random() < 0.5 ? 'nice' : 'pvp';
        
        // Initialize bot state
        this.setState('botType', this.botType);
        this.setState('health', botParams.health || 100);
        this.setState('fuel', botParams.fuel || 100);
        this.setState('laserCharge', 0);
        this.setState('lastActionTime', 0);
        this.setState('targetId', null);
        this.setState('actionCooldown', 0);
        
        console.log(`[GameBot] Created ${this.botType} bot:`, this.id);
    }
    
    /**
     * Get bot type
     */
    getBotType() {
        return this.getState('botType') || 'nice';
    }
    
    /**
     * Determine action for bot to take
     */
    decideAction(gameState) {
        const botType = this.getBotType();
        const health = this.getState('health') || 100;
        
        // Check cooldown
        const cooldown = this.getState('actionCooldown') || 0;
        if (cooldown > 0) {
            return { type: 'move', direction: Math.random() * Math.PI * 2 };
        }
        
        // Low health - try to flee/hide
        if (health < 30) {
            return { type: 'dock' };
        }
        
        // Nice bots: focus on aliens
        if (botType === 'nice') {
            if (gameState && gameState.nearestAlien && gameState.distanceToAlien < 500) {
                return { 
                    type: 'attack', 
                    targetId: gameState.nearestAlien.id,
                    targetType: 'alien'
                };
            }
            return { type: 'patrol' };
        }
        
        // PvP bots: attack players and aliens
        if (botType === 'pvp') {
            // Prioritize aliens, but also attack other players
            if (gameState) {
                if (gameState.nearestAlien && gameState.distanceToAlien < 400) {
                    return { 
                        type: 'attack', 
                        targetId: gameState.nearestAlien.id,
                        targetType: 'alien'
                    };
                }
                if (gameState.nearestPlayer && gameState.distanceToPlayer < 600) {
                    return { 
                        type: 'attack', 
                        targetId: gameState.nearestPlayer.id,
                        targetType: 'player'
                    };
                }
            }
            return { type: 'patrol' };
        }
        
        return { type: 'patrol' };
    }
    
    /**
     * Thrust in a direction
     */
    thrust() {
        if (!this.alive || this.isDocked) return;
        
        if (this.fuel > 0) {
            const angle = this.body.angle;
            const force = {
                x: Math.cos(angle) * C.SHIP_THRUST_FORCE,
                y: Math.sin(angle) * C.SHIP_THRUST_FORCE
            };
            
            this.scene.matter.applyForce(this.body, force);
            
            const previousFuel = this.fuel;
            this.fuel = Math.max(0, this.fuel - C.SHIP_FUEL_CONSUMPTION);
            
            // If fuel just depleted, start the pause timer
            if (previousFuel > 0 && this.fuel === 0) {
                this.fuelDepletedTimer = C.SHIP_FUEL_DEPLETION_PAUSE;
            }
            
            // Create thrust particles (Phaser 3.60+ API)
            if (Math.random() < 0.3) { // Emit occasionally
                const emitter = this.scene.add.particles(this.body.position.x, this.body.position.y, 'particle', {
                    speed: { min: 50, max: 150 },
                    angle: { min: Phaser.Math.RadToDeg(angle) + 160, max: Phaser.Math.RadToDeg(angle) + 200 },
                    scale: { start: 0.4, end: 0 },
                    blendMode: 'ADD',
                    lifespan: 300,
                    quantity: 2,
                    tint: 0xf9cb28
                });
                // Stop and destroy the emitter after particles are emitted
                this.scene.time.delayedCall(350, () => {
                    emitter.destroy();
                });
            }
            
            return true; // Was thrusting
        }
        
        return false; // Not thrusting
    }
    
    /**
     * Rotate toward angle
     */
    rotate(angle) {
        this.setState('currentAngle', angle);
    }
    
    /**
     * Shoot laser
     */
    shoot() {
        const charge = this.getState('laserCharge') || 0;
        if (charge > 50) {
            this.setState('laserCharge', 0);
            this.setState('actionCooldown', 10); // Brief cooldown after shooting
            return true;
        }
        return false;
    }
    
    /**
     * Charge laser
     */
    chargeWeapon() {
        const charge = this.getState('laserCharge') || 0;
        this.setState('laserCharge', Math.min(100, charge + 10));
    }
    
    /**
     * Take damage
     */
    takeDamage(amount) {
        const currentHealth = this.getState('health') || 100;
        this.setState('health', Math.max(0, currentHealth - amount));
    }
    
    /**
     * Dock to comet
     */
    dock() {
        this.setState('isDocked', true);
    }
    
    /**
     * Undock from comet
     */
    undock() {
        this.setState('isDocked', false);
    }
    
    /**
     * Check if bot is alive
     */
    isAlive() {
        return (this.getState('health') || 100) > 0;
    }
    
    /**
     * Decrease action cooldown
     */
    updateCooldown() {
        const cooldown = this.getState('actionCooldown') || 0;
        if (cooldown > 0) {
            this.setState('actionCooldown', cooldown - 1);
        }
    }
}
