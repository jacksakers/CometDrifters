/**
 * AudioManager - Handles all game audio
 * Manages sound effects, background music, and mute state
 */
export default class AudioManager {
    constructor(scene) {
        this.scene = scene;
        this.sounds = {};
        this.backgroundMusic = null;
        this.isMuted = false;
        this.alienAlertSound = null;
        this.alienAlertPlaying = false;
        
        // Load mute preference from localStorage
        const savedMute = localStorage.getItem('audioMuted');
        if (savedMute !== null) {
            this.isMuted = savedMute === 'true';
        }
    }
    
    /**
     * Preload all sound files
     */
    preload() {
        // Laser sounds
        this.scene.load.audio('laser1', 'sounds/laser-gun-blast-1.mp3');
        this.scene.load.audio('laser2', 'sounds/laser-gun-blast-2.mp3');
        // this.scene.load.audio('laser3', 'sounds/laser-gun-blast-3.mp3');
        
        // Explosion sound
        this.scene.load.audio('explosion', 'sounds/medium-explosion.mp3');
        
        // Background music
        this.scene.load.audio('background', 'sounds/space-vessel-noise.mp3');
        
        // Alien alert
        this.scene.load.audio('alienAlert', 'sounds/alien-alert-noise.mp3');

        // Hit Marker
        this.scene.load.audio('hitMarker', 'sounds/hit-marker.mp3');
    }
    
    /**
     * Create all sound objects
     */
    create() {
        // Create laser sounds
        this.sounds.laser1 = this.scene.sound.add('laser1', { volume: 0.3 });
        this.sounds.laser2 = this.scene.sound.add('laser2', { volume: 0.3 });
        // this.sounds.laser3 = this.scene.sound.add('laser3', { volume: 0.3 });
        
        // Create explosion sound
        this.sounds.explosion = this.scene.sound.add('explosion', { volume: 0.4 });

        // Create hit marker sound
        this.sounds.hitMarker = this.scene.sound.add('hitMarker', { volume: 0.5 });
        
        // Create and start background music (loop)
        this.backgroundMusic = this.scene.sound.add('background', { 
            volume: 0.3, 
            loop: true 
        });
        
        // Create alien alert sound (loop)
        this.alienAlertSound = this.scene.sound.add('alienAlert', { 
            volume: 0.25, 
            loop: true 
        });
        
        // Apply initial mute state
        this.scene.sound.mute = this.isMuted;
        
        // Start background music if not muted
        if (!this.isMuted) {
            this.backgroundMusic.play();
        }
    }
    
    /**
     * Play a random laser sound
     */
    playLaserSound() {
        if (this.isMuted) return;
        
        // const laserSounds = [this.sounds.laser1, this.sounds.laser2, this.sounds.laser3];
        const laserSounds = [this.sounds.laser1, this.sounds.laser2];
        const randomLaser = laserSounds[Math.floor(Math.random() * laserSounds.length)];
        randomLaser.play();
    }
    
    /**
     * Play explosion sound
     */
    playExplosionSound() {
        if (this.isMuted) return;
        
        this.sounds.explosion.play();
    }

    /**
     * Play hit marker sound
     */
    playHitMarkerSound() {
        if (this.isMuted) return;
        
        this.sounds.hitMarker.play();
    }

    /** */
    
    /**
     * Start alien alert sound
     */
    startAlienAlert() {
        if (this.isMuted || this.alienAlertPlaying) return;
        
        this.alienAlertSound.play();
        this.alienAlertPlaying = true;
    }
    
    /**
     * Stop alien alert sound
     */
    stopAlienAlert() {
        if (!this.alienAlertPlaying) return;
        
        this.alienAlertSound.stop();
        this.alienAlertPlaying = false;
    }
    
    /**
     * Toggle mute state
     */
    toggleMute() {
        this.isMuted = !this.isMuted;
        this.scene.sound.mute = this.isMuted;
        
        // Save to localStorage
        localStorage.setItem('audioMuted', this.isMuted.toString());
        
        // Handle background music
        if (this.isMuted) {
            this.stopAlienAlert();
        } else {
            // Start background music if it's not already playing
            if (!this.backgroundMusic.isPlaying) {
                this.backgroundMusic.play();
            }
        }
        
        return this.isMuted;
    }
    
    /**
     * Get current mute state
     */
    isMutedState() {
        return this.isMuted;
    }
    
    /**
     * Update - check for nearby aliens
     */
    update(ship, aliens) {
        if (!ship || !ship.alive) {
            this.stopAlienAlert();
            return;
        }
        
        // Check if any aliens are within alert range
        const alertRange = 400;
        let alienNearby = false;
        
        if (aliens && aliens.length > 0) {
            for (let alien of aliens) {
                if (!alien.alive) continue;
                
                const dx = alien.body.position.x - ship.body.position.x;
                const dy = alien.body.position.y - ship.body.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < alertRange) {
                    alienNearby = true;
                    break;
                }
            }
        }
        
        // Start or stop alert sound based on proximity
        if (alienNearby) {
            this.startAlienAlert();
        } else {
            this.stopAlienAlert();
        }
    }
    
    /**
     * Cleanup
     */
    destroy() {
        if (this.backgroundMusic) {
            this.backgroundMusic.stop();
        }
        if (this.alienAlertSound) {
            this.alienAlertSound.stop();
        }
    }
}
