/**
 * Le Petit Explorateur - Jungle Adventure
 * Mobile Game Logic
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreElement = document.getElementById('final-score');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const menuButton = document.getElementById('menu-button');

// Game constants
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const GAME_SPEED = 5;
const PLAYER_X = 80;

// Assets
const images = {};
const assetSources = {
    hanaa: 'assets/character.png',
    hanaaRun1: 'assets/run1.png',
    hanaaRun2: 'assets/run2.png',
    chaimaa: 'assets/chaimaa.png',
    background: 'assets/arr.jpg',
    platform: 'assets/platform.png',
    relic: 'assets/relic.png',
    jungleMusic: 'assets/foret.mp3',
    jumpSound: 'assets/sauter.mp3',
    gameOverSound: 'assets/super.mp3'
};

// Character selection state
let selectedCharacter = 'hanaa';

// Game state
let isGameRunning = false;
let score = 0;
let animationId;
let platforms = [];
let relics = [];
let obstacles = [];
let gameTime = 0;
let bgX = 0;

// Audio objects
const jungleMusic = new Audio(assetSources.jungleMusic);
jungleMusic.loop = true;
const jumpSound = new Audio(assetSources.jumpSound);
const gameOverSound = new Audio(assetSources.gameOverSound);

class Player {
    constructor() {
        this.width = 70;
        this.height = 90;
        this.x = PLAYER_X;
        this.y = canvas.logicHeight / 2;
        this.vy = 0;
        this.isJumping = false;
        this.jumpCount = 0;
        this.rotation = 0;
        
        // Animation state
        this.animFrame = 0;
        this.animTimer = 0;
    }

    update() {
        this.vy += GRAVITY;
        this.y += this.vy;

        // Ground collision removed to allow falling in the void
        // No more auto-ground at the bottom

        // Platform collision
        platforms.forEach(platform => {
            if (this.x < platform.x + platform.width &&
                this.x + this.width > platform.x &&
                this.y + this.height > platform.y &&
                this.y + this.height < platform.y + 35 && // Increased threshold
                this.vy >= 0) {
                this.y = platform.y - this.height + 2; // +2 for "sticky" look
                this.vy = 0;
                this.isJumping = false;
                this.jumpCount = 0;
            }
        });

        // Animation update
        if (!this.isJumping) {
            this.animTimer++;
            if (this.animTimer >= 8) { // Speed of leg movement
                this.animFrame = (this.animFrame + 1) % 2;
                this.animTimer = 0;
            }
        }

        // Rotation effect when jumping
        if (this.isJumping) {
            this.rotation += 0.1;
        } else {
            this.rotation = 0;
        }
    }

    draw() {
        ctx.save();
        
        let offsetY = 0;
        let img;
        
        if (selectedCharacter === 'hanaa') {
            img = images.hanaa;
            if (!this.isJumping) {
                img = this.animFrame === 0 ? images.hanaaRun1 : images.hanaaRun2;
            }
        } else {
            img = images.chaimaa;
            // Bobbing effect when running to simulate animation
            if (!this.isJumping) {
                offsetY = this.animFrame === 0 ? 0 : 4;
            }
        }
        
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2 + offsetY);
        
        if (this.isJumping) {
            ctx.rotate(this.rotation);
        }
        
        ctx.drawImage(img, -this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();
    }

    jump() {
        if (this.jumpCount < 2) {
            this.vy = JUMP_FORCE;
            this.isJumping = true;
            this.jumpCount++;
            
            // Play jump sound
            jumpSound.currentTime = 0;
            jumpSound.play().catch(e => console.log("Audio play failed", e));
        }
    }
}

class Platform {
    constructor(x, y, width) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = 30;
    }

    update() {
        this.x -= GAME_SPEED;
    }

    draw() {
        // Draw stone texture
        ctx.drawImage(images.platform, this.x, this.y, this.width, this.height);
    }
}

class Relic {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 40;
        this.collected = false;
        this.floatY = 0;
    }

    update() {
        this.x -= GAME_SPEED;
        this.floatY = Math.sin(gameTime / 10) * 5;
    }

    draw() {
        if (!this.collected) {
            ctx.drawImage(images.relic, this.x, this.y + this.floatY, this.width, this.height);
        }
    }
}

let player;

function init() {
    resizeCanvas();
    player = new Player();
    platforms = [];
    relics = [];
    score = 0;
    gameTime = 0;
    scoreElement.innerText = score;
    
    // Initial platform (starting point)
    platforms.push(new Platform(0, canvas.logicHeight - 150, canvas.logicWidth));
}

function resizeCanvas() {
    const container = document.getElementById('game-container');
    if (!container) return;
    canvas.width = container.clientWidth * 2; // High DPI
    canvas.height = container.clientHeight * 2;
    ctx.scale(2, 2);
    
    // Adjust logic canvas size (not CSS size)
    canvas.logicWidth = container.clientWidth;
    canvas.logicHeight = container.clientHeight;
    
    if (!isGameRunning) {
        draw();
    }
}

function loadAssets() {
    let loadedCount = 0;
    const totalCount = Object.keys(assetSources).length;

    for (let key in assetSources) {
        images[key] = new Image();
        images[key].src = assetSources[key];
        images[key].onload = () => {
            loadedCount++;
            if (loadedCount === totalCount) {
                console.log('Assets loaded');
            }
        };
    }
}

function spawnEntities() {
    if (gameTime % 60 === 0) { // Frequency even higher for closer platforms
        // Platforms closer vertically
        const lastPlatformY = platforms.length > 0 ? platforms[platforms.length-1].y : canvas.logicHeight/2;
        const targetY = lastPlatformY + (Math.random() * 160 - 80);
        const y = Math.max(250, Math.min(canvas.logicHeight - 150, targetY));
        
        const w = 200 + Math.random() * 100;
        platforms.push(new Platform(canvas.logicWidth, y, w));
        
        // Spawn relic on top of platform
        if (Math.random() > 0.4) {
            relics.push(new Relic(canvas.logicWidth + w / 2 - 20, y - 50));
        }
    }
}

function handleCollisions() {
    relics.forEach(relic => {
        if (!relic.collected && 
            player.x < relic.x + relic.width &&
            player.x + player.width > relic.x &&
            player.y < relic.y + relic.height &&
            player.y + player.height > relic.y) {
            relic.collected = true;
            score += 10;
            scoreElement.innerText = score;
        }
    });

    // Check if player falls off screen
    if (player.y > canvas.logicHeight) {
        endGame();
    }
}

function drawBackground() {
    bgX -= GAME_SPEED * 0.5;
    if (bgX <= -canvas.logicWidth) bgX = 0;
    
    ctx.drawImage(images.background, bgX, 0, canvas.logicWidth, canvas.logicHeight);
    ctx.drawImage(images.background, bgX + canvas.logicWidth, 0, canvas.logicWidth, canvas.logicHeight);
}

function update() {
    if (!isGameRunning) return;

    gameTime++;
    spawnEntities();
    
    player.update();
    
    platforms = platforms.filter(p => p.x + p.width > 0);
    platforms.forEach(p => p.update());

    relics = relics.filter(r => r.x + r.width > 0 && !r.collected);
    relics.forEach(r => r.update());

    handleCollisions();
    
    draw();
    animationId = requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawBackground();
    
    platforms.forEach(p => p.draw());
    relics.forEach(r => r.draw());
    if (player) {
        player.draw();
    }
}

function startGame() {
    init();
    isGameRunning = true;
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    
    // Start music
    jungleMusic.play().catch(e => console.log("Music play failed", e));
    
    update();
}

function endGame() {
    isGameRunning = false;
    cancelAnimationFrame(animationId);
    finalScoreElement.innerText = score;
    gameOverScreen.classList.remove('hidden');
    
    // Stop background sound and play game over
    jungleMusic.pause();
    jungleMusic.currentTime = 0;
    
    gameOverSound.currentTime = 0;
    gameOverSound.play().catch(e => console.log("Audio play failed", e));
}

// Controls
function handleAction() {
    if (isGameRunning) {
        player.jump();
    }
}

window.addEventListener('touchstart', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.closest('.character-card')) {
        return;
    }
    if (isGameRunning) {
        e.preventDefault();
    }
    handleAction();
}, { passive: false });

window.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.closest('.character-card')) {
        return;
    }
    handleAction();
});

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') handleAction();
});

startButton.addEventListener('click', startGame);
startButton.addEventListener('touchstart', (e) => { e.preventDefault(); startGame(); }, { passive: false });
restartButton.addEventListener('click', startGame);
restartButton.addEventListener('touchstart', (e) => { e.preventDefault(); startGame(); }, { passive: false });

// Character selection cards interactivity
const cards = document.querySelectorAll('.character-card');
cards.forEach(card => {
    const selectHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        cards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        selectedCharacter = card.getAttribute('data-char');
    };
    
    card.addEventListener('click', selectHandler);
    card.addEventListener('touchstart', selectHandler, { passive: false });
});

// Menu button interactivity
function showMenu() {
    gameOverScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
}

menuButton.addEventListener('click', showMenu);
menuButton.addEventListener('touchstart', (e) => { e.preventDefault(); showMenu(); }, { passive: false });

window.addEventListener('resize', resizeCanvas);

// Init
window.addEventListener('load', () => {
    loadAssets();
    init();
    setTimeout(draw, 100); // Initial draw for background
});
