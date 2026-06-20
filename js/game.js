// ─── Constants ───────────────────────────────────────────────────────────────
const CANVAS_W = 800;
const CANVAS_H = 600;
const GROUND_Y = CANVAS_H - 90;
const PLAYER_X = 160;
const GRAVITY = 0.45;
const THRUST = -0.9;
const SCROLL_SPEED_BASE = 4;

// ─── Canvas Setup ─────────────────────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;

// ─── Soundtrack ───────────────────────────────────────────────────────────────
const bgMusic = new Audio('soundtrack.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.35;

let musicStatus = 'loading'; // 'loading' | 'blocked' | 'playing' | 'error'
let musicStartPending = false;

bgMusic.addEventListener('error', () => { musicStatus = 'error'; });
bgMusic.addEventListener('canplaythrough', () => {
    if (musicStatus === 'loading') {
        musicStatus = 'blocked';
        if (musicStartPending) tryStartMusic();
    }
});

function tryStartMusic() {
    if (musicStatus === 'playing' || musicStatus === 'error') return;
    if (musicStatus === 'loading') { musicStartPending = true; return; }
    bgMusic.play().then(() => {
        musicStatus = 'playing';
        musicStartPending = false;
    }).catch(() => {
        musicStatus = 'blocked';
    });
}

function drawMusicPrompt() {
    if (musicStatus === 'playing') return;
    ctx.save();
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    if (musicStatus === 'error') {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(CANVAS_W / 2 - 180, CANVAS_H - 44, 360, 32);
        ctx.fillStyle = '#FF4444';
        ctx.fillText('soundtrack.mp3 not found — place it next to index.html', CANVAS_W / 2, CANVAS_H - 24);
    } else if (musicStatus === 'blocked') {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(CANVAS_W / 2 - 150, CANVAS_H - 44, 300, 32);
        ctx.fillStyle = '#FFD700';
        ctx.fillText('🔊 Click or press any key to enable music', CANVAS_W / 2, CANVAS_H - 24);
    }
    ctx.restore();
}

window.addEventListener('keydown', tryStartMusic);
canvas.addEventListener('mousedown', tryStartMusic);
canvas.addEventListener('touchstart', tryStartMusic);

// ─── Fire Sound ───────────────────────────────────────────────────────────────
const fireSound = new Audio('fire.mp3');
fireSound.loop = true;
fireSound.volume = 1.0;

function startFireSound() {
    if (fireSound.paused) fireSound.play().catch(() => {});
}

function stopFireSound() {
    if (!fireSound.paused) { fireSound.pause(); fireSound.currentTime = 0; }
}

// ─── Crunch Sound ─────────────────────────────────────────────────────────────
const crunchSound = new Audio('crunch.mp3');
crunchSound.volume = 1.0;

function playCrunchSound() {
    const sfx = crunchSound.cloneNode();
    sfx.volume = 1.0;
    sfx.play().catch(() => {});
}

// ─── Death Sound ──────────────────────────────────────────────────────────────
const deathSound = new Audio('death.mp3');
deathSound.volume = 1.0;

function playDeathSound() {
    const sfx = deathSound.cloneNode();
    sfx.volume = 1.0;
    sfx.play().catch(() => {});
}

// ─── Coin Sound ───────────────────────────────────────────────────────────────
const coinSound = new Audio('coin.mp3');
coinSound.volume = 0.25;

function playCoinSound() {
    const sfx = coinSound.cloneNode();
    sfx.volume = 1.0;
    sfx.play().catch(() => {});
}

// ─── Game State ───────────────────────────────────────────────────────────────
const STATE = { MENU: 0, INTRO: 1, PLAYING: 2, DEAD: 3 };
let gameState = STATE.MENU;
let playerCount = 1;
let menuSelection = 0; // 0=1P, 1=2P
let menuScrollOffset = 0;
let introFrame = 0;
let scrollOffset = 0;
let scrollSpeed = SCROLL_SPEED_BASE;
let distanceScore = 0;
let frameCount = 0;
let nextObstacleIn = 120;
let nextRamenIn = 180;
let ramens = [];
let nextSauceIn = 600;
let peppers = [];
let nextPepperIn = 900;
let sauces = [];
let deadTimer = 0;
let hudPromptAlpha = 1;
let introParticles = [];
let adminMode = false;

// ─── Input ────────────────────────────────────────────────────────────────────
let p1Thrusting = false;
let p2Thrusting = false;

function updateFireSound() {
    if (p1Thrusting || (playerCount === 2 && p2Thrusting)) startFireSound();
    else stopFireSound();
}

window.addEventListener('keydown', e => {
    if (gameState === STATE.MENU) {
        e.preventDefault();
        if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' ||
            e.code === 'ArrowUp' || e.code === 'ArrowDown') {
            menuSelection = menuSelection === 0 ? 1 : 0;
        }
        if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyW') {
            confirmMenu();
        }
        return;
    }
    if (e.code === 'KeyW') {
        e.preventDefault();
        if (gameState === STATE.PLAYING) { p1Thrusting = true; updateFireSound(); }
        if (gameState === STATE.DEAD && deadTimer > 90) resetGame();
    }
    if (e.code === 'ArrowUp') {
        e.preventDefault();
        if (gameState === STATE.PLAYING && playerCount === 2) { p2Thrusting = true; updateFireSound(); }
        if (gameState === STATE.DEAD && deadTimer > 90) resetGame();
    }
    if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (gameState === STATE.INTRO) startGame();
        if (gameState === STATE.DEAD && deadTimer > 90) resetGame();
    }
    if (e.code === 'KeyF' && gameState === STATE.PLAYING) {
        adminMode = !adminMode;
    }
    if (adminMode && gameState === STATE.PLAYING) {
        const spawnX = player.x + 120;
        const spawnY = player.y + player.height / 2;
        if (e.code === 'Digit1') {
            ramens.push({ x: spawnX, y: spawnY, collected: false, bobOffset: Math.random() * Math.PI * 2 });
        }
        if (e.code === 'Digit2') {
            sauces.push({ x: spawnX, y: spawnY, collected: false, bobOffset: Math.random() * Math.PI * 2 });
        }
        if (e.code === 'Digit3') {
            peppers.push({ x: spawnX, y: spawnY, collected: false, bobOffset: Math.random() * Math.PI * 2 });
        }
    }
});
window.addEventListener('keyup', e => {
    if (e.code === 'KeyW') { p1Thrusting = false; updateFireSound(); }
    if (e.code === 'ArrowUp') { p2Thrusting = false; updateFireSound(); }
});
canvas.addEventListener('click', e => {
    if (gameState === STATE.MENU) {
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (CANVAS_W / rect.width);
        const my = (e.clientY - rect.top) * (CANVAS_H / rect.height);
        if (mx >= CANVAS_W / 2 - 160 && mx <= CANVAS_W / 2 - 20 && my >= 300 && my <= 370) {
            menuSelection = 0; confirmMenu();
        } else if (mx >= CANVAS_W / 2 + 20 && mx <= CANVAS_W / 2 + 160 && my >= 300 && my <= 370) {
            menuSelection = 1; confirmMenu();
        }
    }
});
canvas.addEventListener('mousedown', e => {
    if (gameState === STATE.PLAYING) { p1Thrusting = true; updateFireSound(); }
    if (gameState === STATE.DEAD && deadTimer > 90) resetGame();
});
canvas.addEventListener('mouseup', () => { p1Thrusting = false; updateFireSound(); });
canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    if (gameState === STATE.MENU) {
        menuSelection = menuSelection === 0 ? 1 : 0;
        return;
    }
    if (gameState === STATE.PLAYING) { p1Thrusting = true; updateFireSound(); }
    if (gameState === STATE.DEAD && deadTimer > 90) resetGame();
}, { passive: false });
canvas.addEventListener('touchend', () => { p1Thrusting = false; updateFireSound(); });

// ─── Particle Class ───────────────────────────────────────────────────────────
class Particle {
    constructor(x, y, vx, vy, radius, color, life) {
        this.x = x; this.y = y;
        this.vx = vx; this.vy = vy;
        this.radius = radius;
        this.startRadius = radius;
        this.color = color;
        this.life = life;
        this.maxLife = life;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.05;
        this.life--;
        this.radius = this.startRadius * (this.life / this.maxLife);
    }
    draw() {
        const alpha = this.life / this.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(0.5, this.radius), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    get dead() { return this.life <= 0; }
}

let particles = [];

// ─── Ground Fire Trail ────────────────────────────────────────────────────────
let groundFireTrail = [];

function updateGroundFire() {
    const activePlayers = playerCount === 2
        ? [[player, p1Thrusting], [player2, p2Thrusting]]
        : [[player, p1Thrusting]];
    for (const [pl, isThrust] of activePlayers) {
        const onGround = pl.y >= GROUND_Y - pl.height - 2;
        if (isThrust && pl.alive && !onGround && frameCount % 6 === 0) {
            groundFireTrail.push({ x: pl.x + pl.width / 2, life: 90 });
        }
    }
    const fireColors = ['#FF2200', '#FF5500', '#FF8800', '#FFBB00', '#FF3300'];
    for (let i = groundFireTrail.length - 1; i >= 0; i--) {
        const gf = groundFireTrail[i];
        gf.x -= scrollSpeed;
        gf.life--;
        if (frameCount % 2 === 0) {
            particles.push(new Particle(
                gf.x + (Math.random() - 0.5) * 24,
                GROUND_Y - 2,
                (Math.random() - 0.5) * 1.2,
                -(1.5 + Math.random() * 3.5),
                5 + Math.random() * 9,
                fireColors[Math.floor(Math.random() * fireColors.length)],
                18 + Math.random() * 22
            ));
        }
        if (gf.life <= 0 || gf.x < -40) groundFireTrail.splice(i, 1);
    }
}

function drawGroundFire() {
    groundFireTrail.forEach(gf => {
        const alpha = gf.life / 90;
        ctx.save();
        ctx.globalAlpha = alpha * 0.6;
        ctx.fillStyle = '#FF4400';
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#FF6600';
        ctx.beginPath();
        ctx.ellipse(gf.x, GROUND_Y + 4, 18, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

function spawnButtFire(px, py) {
    const colors = ['#FF2200', '#FF6600', '#FF9900', '#FFCC00', '#FF4400'];
    for (let i = 0; i < 7; i++) {
        const angle = Math.PI + (Math.random() - 0.5) * 1.2;
        const speed = 2 + Math.random() * 4;
        particles.push(new Particle(
            px, py,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed - 1,
            4 + Math.random() * 5,
            colors[Math.floor(Math.random() * colors.length)],
            15 + Math.random() * 10
        ));
    }
}

function spawnExplosion(px, py) {
    const colors = ['#FF2200', '#FF6600', '#FFCC00', '#FF0000', '#FFF'];
    for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 7;
        particles.push(new Particle(
            px, py,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed - 2,
            3 + Math.random() * 7,
            colors[Math.floor(Math.random() * colors.length)],
            30 + Math.random() * 30
        ));
    }
}

// ─── Player ───────────────────────────────────────────────────────────────────
const player = {
    x: PLAYER_X,
    y: GROUND_Y - 60,
    vy: 0,
    width: 36,
    height: 54,
    alive: true,
    legAngle: 0,
    headRed: 0,
    crumpled: false,
    spice: 100,
    coinScore: 0,
    shirtColor: '#3355CC',
    pepperTimer: 0,
    lives: 3,
    respawnTimer: 0,
};

const player2 = {
    x: PLAYER_X,
    y: GROUND_Y - 60,
    vy: 0,
    width: 36,
    height: 54,
    alive: true,
    legAngle: 0,
    headRed: 0,
    crumpled: false,
    spice: 100,
    coinScore: 0,
    shirtColor: '#CC3333',
    pepperTimer: 0,
    lives: 3,
    respawnTimer: 0,
};

function resetPlayerObj(pl, shirtColor, startX) {
    pl.x = startX;
    pl.y = GROUND_Y - pl.height;
    pl.vy = 0;
    pl.alive = true;
    pl.legAngle = 0;
    pl.headRed = 0;
    pl.crumpled = false;
    pl.spice = 100;
    pl.coinScore = 0;
    pl.shirtColor = shirtColor;
    pl.pepperTimer = 0;
    pl.lives = 3;
    pl.respawnTimer = 0;
}

function respawnPlayerObj(pl) {
    pl.y = GROUND_Y - pl.height;
    pl.vy = -4;
    pl.alive = true;
    pl.crumpled = false;
    pl.legAngle = 0;
    pl.headRed = 0;
    pl.pepperTimer = 0;
    pl.spice = 100;
    pl.respawnTimer = 0;
}

function resetPlayer() {
    resetPlayerObj(player, '#3355CC', PLAYER_X);
    resetPlayerObj(player2, '#CC3333', PLAYER_X);
}

function updatePlayer(pl, isThrust) {
    if (!pl.alive) return;
    const canThrust = isThrust && pl.spice > 0;
    if (canThrust) {
        pl.vy += THRUST;
        pl.spice = Math.max(0, pl.spice - 0.18);
    } else {
        pl.spice = Math.max(0, pl.spice - 0.04);
    }
    if (pl.spice <= 0) { killPlayerObj(pl); return; }
    pl.vy += GRAVITY;
    pl.vy = Math.max(pl.vy, -12);
    pl.y += pl.vy;
    const groundLimit = GROUND_Y - pl.height;
    if (pl.y >= groundLimit) {
        pl.y = groundLimit;
        pl.vy = 0;
    }
    if (pl.y < 10) {
        pl.y = 10;
        pl.vy = 0;
    }
    pl.legAngle = Math.sin(frameCount * 0.25) * 0.5;
    if (canThrust) spawnButtFire(pl.x + 2, pl.y + pl.height - 8);

    if (pl.pepperTimer > 0) {
        pl.pepperTimer--;
        if (frameCount % 2 === 0) {
            const ang = Math.random() * Math.PI * 2;
            const rad = 22 + Math.random() * 10;
            particles.push(new Particle(
                pl.x + pl.width / 2 + Math.cos(ang) * rad,
                pl.y + pl.height / 2 + Math.sin(ang) * rad,
                Math.cos(ang) * 1.5, Math.sin(ang) * 1.5 - 1,
                3 + Math.random() * 4,
                ['#FF2200', '#FF6600', '#FFCC00'][Math.floor(Math.random() * 3)],
                14
            ));
        }
    }
}

function drawCharacter(pl, isThrust, introState) {
    ctx.save();
    const cx = pl.x + pl.width / 2;
    const bodyTop = pl.y;
    const bodyH = pl.height * 0.55;
    const headR = 16;
    const onFire = pl.pepperTimer > 0;

    // body
    const skinColor = onFire
        ? `rgb(255,${Math.max(70, 120 + Math.round(Math.sin(frameCount * 0.12) * 25))},40)`
        : pl.headRed > 0
            ? `rgb(${Math.min(255, 220 + pl.headRed * 35)},${Math.max(60, 160 - pl.headRed * 50)},${Math.max(60, 130 - pl.headRed * 40)})`
            : '#F0C080';
    ctx.fillStyle = skinColor;
    roundRect(ctx, pl.x, bodyTop + headR, pl.width, bodyH, 8);
    ctx.fill();

    // shirt
    if (onFire) {
        const fs = ctx.createLinearGradient(pl.x + 4, bodyTop + headR + bodyH * 0.3, pl.x + 4, bodyTop + headR + bodyH * 0.85);
        fs.addColorStop(0, '#FF5500');
        fs.addColorStop(0.5, '#CC2200');
        fs.addColorStop(1, '#FF3300');
        ctx.fillStyle = fs;
    } else {
        ctx.fillStyle = pl.shirtColor || '#3355CC';
    }
    roundRect(ctx, pl.x + 4, bodyTop + headR + bodyH * 0.3, pl.width - 8, bodyH * 0.55, 5);
    ctx.fill();

    // legs
    if (!pl.crumpled) {
        const legTop = bodyTop + headR + bodyH - 4;
        const legLen = pl.height * 0.35;
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        // left leg
        ctx.save();
        ctx.translate(cx - 7, legTop);
        ctx.rotate(isThrust ? 0.3 : pl.legAngle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, legLen);
        ctx.stroke();
        ctx.restore();
        // right leg
        ctx.save();
        ctx.translate(cx + 7, legTop);
        ctx.rotate(isThrust ? -0.3 : -pl.legAngle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, legLen);
        ctx.stroke();
        ctx.restore();
    } else {
        // crumpled legs
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - 7, bodyTop + headR + bodyH);
        ctx.lineTo(cx - 15, bodyTop + headR + bodyH + 20);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + 7, bodyTop + headR + bodyH);
        ctx.lineTo(cx + 15, bodyTop + headR + bodyH + 20);
        ctx.stroke();
    }

    // arm (right arm)
    ctx.strokeStyle = skinColor;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    if (introState === 'reaching') {
        ctx.beginPath();
        ctx.moveTo(pl.x + pl.width, bodyTop + headR + 10);
        ctx.lineTo(pl.x + pl.width + 28, bodyTop + headR + 20);
        ctx.stroke();
    } else if (introState === 'eating') {
        ctx.beginPath();
        ctx.moveTo(pl.x + pl.width, bodyTop + headR + 10);
        ctx.lineTo(pl.x + pl.width + 14, bodyTop);
        ctx.stroke();
    } else {
        ctx.beginPath();
        ctx.moveTo(pl.x + pl.width, bodyTop + headR + 10);
        ctx.lineTo(pl.x + pl.width + 16, bodyTop + headR + 28);
        ctx.stroke();
    }
    // left arm
    ctx.beginPath();
    ctx.moveTo(pl.x, bodyTop + headR + 10);
    ctx.lineTo(pl.x - 14, bodyTop + headR + 28);
    ctx.stroke();

    // head
    const hx = cx;
    const hy = bodyTop + headR;
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(hx, hy, headR, 0, Math.PI * 2);
    ctx.fill();

    // hair
    ctx.fillStyle = '#3A2010';
    ctx.beginPath();
    ctx.arc(hx, hy - 4, headR - 2, Math.PI, 0);
    ctx.fill();

    // eyes
    if (onFire) {
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.ellipse(hx - 5, hy - 1, 4, 5.5, 0, 0, Math.PI * 2);
        ctx.ellipse(hx + 5, hy - 1, 4, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#110000';
        ctx.beginPath();
        ctx.arc(hx - 5 + Math.sin(frameCount * 0.15) * 1.5, hy - 1, 2, 0, Math.PI * 2);
        ctx.arc(hx + 5 + Math.sin(frameCount * 0.15) * 1.5, hy - 1, 2, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(hx - 5, hy - 1, 2.5, 0, Math.PI * 2);
        ctx.arc(hx + 5, hy - 1, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }

    // mouth
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    if (onFire && !pl.crumpled) {
        ctx.fillStyle = '#1A0000';
        ctx.beginPath();
        ctx.ellipse(hx, hy + 6, 5, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FF2200';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    } else if (introState === 'eating') {
        ctx.strokeStyle = '#553300';
        ctx.beginPath();
        ctx.arc(hx, hy + 5, 6, 0, Math.PI);
        ctx.stroke();
    } else if (pl.crumpled) {
        ctx.strokeStyle = '#CC0000';
        ctx.beginPath();
        ctx.moveTo(hx - 5, hy + 8);
        ctx.lineTo(hx, hy + 6);
        ctx.lineTo(hx + 5, hy + 8);
        ctx.stroke();
    } else {
        ctx.strokeStyle = pl.headRed > 0.5 ? '#CC0000' : '#553300';
        ctx.beginPath();
        ctx.moveTo(hx - 5, hy + 7);
        ctx.quadraticCurveTo(hx, hy + 10, hx + 5, hy + 7);
        ctx.stroke();
    }

    if (onFire) {
        // fire sparks bursting from head
        for (let i = 0; i < 4; i++) {
            const sx = hx - 14 + i * 10 + Math.sin(frameCount * 0.2 + i) * 3;
            const sy = hy - headR - 4 + Math.sin(frameCount * 0.15 + i * 2) * 4;
            ctx.fillStyle = ['#FF2200', '#FF6600', '#FFCC00'][i % 3];
            ctx.globalAlpha = 0.7 + Math.sin(frameCount * 0.3 + i) * 0.25;
            ctx.beginPath();
            ctx.arc(sx, sy, 2.5 + Math.sin(frameCount * 0.2 + i), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    } else {
        // sweat drops when hot
        if (pl.headRed > 0.3) {
            ctx.fillStyle = 'rgba(100,180,255,0.8)';
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.arc(hx - 18 + i * 14, hy - 8 + Math.sin(frameCount * 0.1 + i) * 3, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        // steam lines when hot
        if (pl.headRed > 0.6) {
            ctx.strokeStyle = 'rgba(255,200,150,0.7)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                const sx = hx - 12 + i * 12;
                const sy = hy - headR;
                const wave = Math.sin(frameCount * 0.15 + i * 2) * 4;
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.quadraticCurveTo(sx + wave, sy - 10, sx, sy - 20);
                ctx.stroke();
            }
        }
    }

    ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// ─── Ramen Bowl ───────────────────────────────────────────────────────────────
let bowl = { x: 700, y: GROUND_Y - 60, visible: false, grabbed: false };

function drawRamenBowl(bx, by) {
    ctx.save();
    // bowl body
    ctx.fillStyle = '#CC0000';
    ctx.beginPath();
    ctx.ellipse(bx, by + 20, 28, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#AA0000';
    ctx.beginPath();
    ctx.moveTo(bx - 28, by + 20);
    ctx.quadraticCurveTo(bx, by + 50, bx + 28, by + 20);
    ctx.fill();
    // broth
    ctx.fillStyle = '#FF6600';
    ctx.beginPath();
    ctx.ellipse(bx, by + 14, 24, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    // noodles — wavy strands piled in the bowl
    ctx.lineCap = 'round';
    const nColors = ['#FFE0A0', '#FFD070', '#FFC860', '#FFEBA8'];
    const wave = frameCount * 0.04;
    for (let n = 0; n < 8; n++) {
        ctx.strokeStyle = nColors[n % nColors.length];
        ctx.lineWidth = 2.2 + (n % 2) * 0.8;
        ctx.beginPath();
        const ny = by + 14 - n * 1.5;
        const nx0 = bx - 18 + (n % 3) * 2;
        ctx.moveTo(nx0, ny);
        for (let seg = 0; seg < 7; seg++) {
            const cx1 = nx0 + seg * 6 + 3;
            const cy1 = ny + (seg % 2 === 0 ? -1 : 1) * (5 + Math.sin(wave + n * 0.7) * 2);
            const ex = nx0 + (seg + 1) * 6;
            ctx.quadraticCurveTo(cx1, cy1, ex, ny + Math.sin(wave * 0.5 + n) * 1.5);
        }
        ctx.stroke();
    }
    // flame icon
    ctx.fillStyle = '#FF4400';
    const fx = bx + 14, fy = by - 5;
    ctx.beginPath();
    ctx.moveTo(fx, fy - 12);
    ctx.quadraticCurveTo(fx + 8, fy - 8, fx + 6, fy);
    ctx.quadraticCurveTo(fx + 10, fy - 4, fx + 4, fy + 4);
    ctx.quadraticCurveTo(fx + 2, fy - 2, fx - 4, fy + 4);
    ctx.quadraticCurveTo(fx - 8, fy - 4, fx - 6, fy);
    ctx.quadraticCurveTo(fx - 8, fy - 8, fx, fy - 12);
    ctx.fill();
    ctx.restore();
}

// ─── Background ───────────────────────────────────────────────────────────────
function drawBackground() {
    // Base fill
    ctx.fillStyle = '#07071A';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Ceiling metal plate
    ctx.fillStyle = '#10102A';
    ctx.fillRect(0, 0, CANVAS_W, 58);
    ctx.strokeStyle = '#1C1C38';
    ctx.lineWidth = 1;
    const ceilOff = scrollOffset % 100;
    for (let i = -1; i < CANVAS_W / 100 + 2; i++) {
        ctx.strokeRect(i * 100 - ceilOff, 0, 100, 58);
    }

    // Ceiling lights with glow cones
    const lightOff = (scrollOffset * 0.6) % 180;
    for (let i = -1; i < CANVAS_W / 180 + 2; i++) {
        const lx = i * 180 - lightOff + 90;
        ctx.fillStyle = '#232342';
        ctx.fillRect(lx - 26, 8, 52, 24);
        ctx.fillStyle = '#FFDD55';
        ctx.fillRect(lx - 20, 13, 40, 14);
        const cone = ctx.createLinearGradient(0, 32, 0, 160);
        cone.addColorStop(0, 'rgba(255,220,60,0.13)');
        cone.addColorStop(1, 'rgba(255,220,60,0)');
        ctx.fillStyle = cone;
        ctx.beginPath();
        ctx.moveTo(lx - 20, 32);
        ctx.lineTo(lx + 20, 32);
        ctx.lineTo(lx + 65, 160);
        ctx.lineTo(lx - 65, 160);
        ctx.closePath();
        ctx.fill();
    }

    // Back wall panels (slow parallax)
    const wallOff = (scrollOffset * 0.35) % 200;
    for (let i = -1; i < CANVAS_W / 200 + 2; i++) {
        const wx = i * 200 - wallOff;
        ctx.fillStyle = '#0C0C22';
        ctx.fillRect(wx, 58, 200, GROUND_Y - 58);
        ctx.strokeStyle = '#181830';
        ctx.lineWidth = 1;
        ctx.strokeRect(wx, 58, 200, GROUND_Y - 58);
        ctx.fillStyle = '#001833';
        ctx.fillRect(wx + 48, GROUND_Y - 170, 84, 58);
        ctx.fillStyle = 'rgba(0,110,240,0.45)';
        ctx.fillRect(wx + 51, GROUND_Y - 167, 78, 52);
        ctx.strokeStyle = 'rgba(0,180,255,0.55)';
        for (let row = 0; row < 4; row++) {
            const lw = 20 + Math.abs(Math.sin(scrollOffset * 0.018 + i + row * 1.3)) * 40;
            ctx.beginPath();
            ctx.moveTo(wx + 54, GROUND_Y - 160 + row * 11);
            ctx.lineTo(wx + 54 + lw, GROUND_Y - 160 + row * 11);
            ctx.stroke();
        }
    }

    // Lab tables (mid parallax)
    const tableOff = (scrollOffset * 0.65) % 280;
    for (let i = -1; i < CANVAS_W / 280 + 2; i++) {
        const tx = i * 280 - tableOff;
        ctx.fillStyle = '#141428';
        ctx.fillRect(tx, GROUND_Y - 112, 170, 8);
        ctx.fillRect(tx + 6, GROUND_Y - 104, 12, 104);
        ctx.fillRect(tx + 152, GROUND_Y - 104, 12, 104);
        ctx.fillStyle = '#0A2035';
        ctx.fillRect(tx + 62, GROUND_Y - 142, 20, 30);
        ctx.fillStyle = 'rgba(180,40,40,0.45)';
        ctx.fillRect(tx + 64, GROUND_Y - 125, 16, 13);
        ctx.fillStyle = '#0A2035';
        ctx.beginPath();
        ctx.arc(tx + 28, GROUND_Y - 122, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(tx + 25, GROUND_Y - 139, 6, 17);
        ctx.fillStyle = 'rgba(0,200,100,0.35)';
        ctx.beginPath();
        ctx.arc(tx + 28, GROUND_Y - 122, 9, 0, Math.PI * 2);
        ctx.fill();
    }

    // Floor
    const floorGrad = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_H);
    floorGrad.addColorStop(0, '#10101E');
    floorGrad.addColorStop(1, '#080812');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);

    // Conveyor belt
    ctx.fillStyle = '#18182E';
    ctx.fillRect(0, GROUND_Y, CANVAS_W, 20);
    const beltOff = scrollOffset % 28;
    for (let i = -1; i < CANVAS_W / 28 + 2; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#202038' : '#18182E';
        ctx.fillRect(i * 28 - beltOff, GROUND_Y, 14, 20);
    }
    ctx.fillStyle = '#2A2A48';
    const arrowOff = scrollOffset % 56;
    for (let i = -1; i < CANVAS_W / 56 + 2; i++) {
        const ax = i * 56 - arrowOff + 8;
        ctx.beginPath();
        ctx.moveTo(ax, GROUND_Y + 5);
        ctx.lineTo(ax + 10, GROUND_Y + 10);
        ctx.lineTo(ax, GROUND_Y + 15);
        ctx.closePath();
        ctx.fill();
    }

    // Hazard stripes
    const hazOff = scrollOffset % 36;
    for (let i = -1; i < CANVAS_W / 36 + 2; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#281600' : '#141000';
        ctx.fillRect(i * 36 - hazOff, GROUND_Y + 20, 18, 8);
    }

    // Floor tile grid
    ctx.strokeStyle = '#141422';
    ctx.lineWidth = 1;
    const ftOff = scrollOffset % 80;
    for (let i = -1; i < CANVAS_W / 80 + 2; i++) {
        ctx.strokeRect(i * 80 - ftOff, GROUND_Y + 28, 80, 28);
    }

    // Ground edge glow
    ctx.fillStyle = '#FF6600';
    ctx.globalAlpha = 0.2;
    ctx.fillRect(0, GROUND_Y, CANVAS_W, 3);
    ctx.globalAlpha = 1;
}

// ─── Obstacles ────────────────────────────────────────────────────────────────
let obstacles = [];

function spawnObstacle() {
    const type = Math.random();
    if (type < 0.4) {
        // laser wall with vertical gap
        const gapH = Math.max(160, 220 - distanceScore * 0.3);
        const gapTop = 60 + Math.random() * (GROUND_Y - gapH - 80);
        obstacles.push({
            type: 'laser', x: CANVAS_W + 20,
            gapTop, gapH,
            pulse: 0
        });
    } else if (type < 0.7) {
        // missile
        const my = 80 + Math.random() * (GROUND_Y - 150);
        obstacles.push({
            type: 'missile', x: CANVAS_W + 60, y: my,
            vx: -(7 + scrollSpeed * 0.5),
            warningShown: false, smokeTimer: 0
        });
    } else {
        // bucket
        obstacles.push({
            type: 'bucket', x: CANVAS_W + 20,
            y: 40 + Math.random() * (GROUND_Y - 180),
            timer: 0
        });
    }
}

function updateObstacles() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const ob = obstacles[i];
        if (ob.type === 'laser') {
            ob.x -= scrollSpeed;
            ob.pulse = (ob.pulse + 0.1) % (Math.PI * 2);
        } else if (ob.type === 'missile') {
            ob.x += ob.vx;
            ob.smokeTimer++;
            if (ob.smokeTimer % 3 === 0) {
                particles.push(new Particle(
                    ob.x + 30, ob.y,
                    1 + Math.random() * 2, (Math.random() - 0.5) * 1.5,
                    3 + Math.random() * 4, '#888', 20
                ));
            }
        } else if (ob.type === 'bucket') {
            ob.x -= scrollSpeed;
            ob.timer++;
            if (ob.timer % 4 === 0) {
                particles.push(new Particle(
                    ob.x + (Math.random() - 0.5) * 28,
                    GROUND_Y,
                    (Math.random() - 0.5) * 3,
                    -2 - Math.random() * 3,
                    3 + Math.random() * 2,
                    '#55AAFF', 25
                ));
            }
        }
        if (ob.x < -100) obstacles.splice(i, 1);
    }
}

function drawObstacles() {
    obstacles.forEach(ob => {
        if (ob.type === 'laser') drawLaser(ob);
        else if (ob.type === 'missile') drawMissile(ob);
        else if (ob.type === 'bucket') drawBucket(ob);
    });
}

function drawLaser(ob) {
    const t = ob.pulse;
    const cx = ob.x;
    const topH = ob.gapTop;
    const botY = ob.gapTop + ob.gapH;
    const botH = GROUND_Y - botY;
    const W = 52; // cave wall width

    ctx.save();

    // ── Top cave wall ──────────────────────────────────────────────
    ctx.fillStyle = '#1A1A2E';
    ctx.fillRect(cx - W / 2, 0, W, topH);
    // rock texture streaks
    ctx.strokeStyle = '#141422';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(cx - W / 2 + 8 + i * 11, 0);
        ctx.lineTo(cx - W / 2 + 6 + i * 11, topH);
        ctx.stroke();
    }

    // ── Bottom cave wall ───────────────────────────────────────────
    ctx.fillStyle = '#1A1A2E';
    ctx.fillRect(cx - W / 2, botY, W, botH);
    ctx.strokeStyle = '#141422';
    for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(cx - W / 2 + 8 + i * 11, botY);
        ctx.lineTo(cx - W / 2 + 6 + i * 11, botY + botH);
        ctx.stroke();
    }

    // ── Waterfall on top wall (same style as bucket stream) ───────
    const streamW = 28;
    const wg = ctx.createLinearGradient(cx - streamW / 2, 0, cx + streamW / 2, 0);
    wg.addColorStop(0, 'rgba(30,100,220,0.65)');
    wg.addColorStop(0.45, 'rgba(120,190,255,0.9)');
    wg.addColorStop(0.55, 'rgba(120,190,255,0.9)');
    wg.addColorStop(1, 'rgba(30,100,220,0.65)');
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.moveTo(cx - streamW / 2, 0);
    for (let y = 0; y <= topH; y += 8) {
        ctx.lineTo(cx - streamW / 2 + Math.sin((y + t * 3) * 0.15) * 4, y);
    }
    ctx.lineTo(cx - streamW / 2 + Math.sin((topH + t * 3) * 0.15) * 4, topH);
    ctx.lineTo(cx + streamW / 2 + Math.sin((topH + t * 3 + 2) * 0.15) * 4, topH);
    for (let y = topH; y >= 0; y -= 8) {
        ctx.lineTo(cx + streamW / 2 + Math.sin((y + t * 3 + 2) * 0.15) * 4, y);
    }
    ctx.lineTo(cx + streamW / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(180,230,255,0.5)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
        const lx = cx - 7 + i * 7;
        ctx.beginPath();
        ctx.moveTo(lx, 0);
        for (let y = 0; y <= topH; y += 12) {
            ctx.lineTo(lx + Math.sin((y + t * 4 + i * 30) * 0.2) * 3, y);
        }
        ctx.stroke();
    }

    // ── Waterfall on bottom wall ───────────────────────────────────
    const wg2 = ctx.createLinearGradient(cx - streamW / 2, 0, cx + streamW / 2, 0);
    wg2.addColorStop(0, 'rgba(30,100,220,0.65)');
    wg2.addColorStop(0.45, 'rgba(120,190,255,0.9)');
    wg2.addColorStop(0.55, 'rgba(120,190,255,0.9)');
    wg2.addColorStop(1, 'rgba(30,100,220,0.65)');
    ctx.fillStyle = wg2;
    ctx.beginPath();
    ctx.moveTo(cx - streamW / 2, botY);
    for (let y = botY; y <= botY + botH; y += 8) {
        ctx.lineTo(cx - streamW / 2 + Math.sin((y + t * 3) * 0.15) * 4, y);
    }
    ctx.lineTo(cx - streamW / 2 + Math.sin((botY + botH + t * 3) * 0.15) * 4, botY + botH);
    ctx.lineTo(cx + streamW / 2 + Math.sin((botY + botH + t * 3 + 2) * 0.15) * 4, botY + botH);
    for (let y = botY + botH; y >= botY; y -= 8) {
        ctx.lineTo(cx + streamW / 2 + Math.sin((y + t * 3 + 2) * 0.15) * 4, y);
    }
    ctx.lineTo(cx + streamW / 2, botY);
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 3; i++) {
        const lx = cx - 7 + i * 7;
        ctx.beginPath();
        ctx.moveTo(lx, botY);
        for (let y = botY; y <= botY + botH; y += 12) {
            ctx.lineTo(lx + Math.sin((y + t * 4 + i * 30) * 0.2) * 3, y);
        }
        ctx.stroke();
    }

    // ── Mist / spray at cave mouth ─────────────────────────────────
    const mistAlpha = 0.15 + Math.sin(t * 0.5) * 0.08;
    const mistGrad = ctx.createRadialGradient(cx, ob.gapTop, 0, cx, ob.gapTop, 40);
    mistGrad.addColorStop(0, `rgba(200,230,255,${mistAlpha * 2})`);
    mistGrad.addColorStop(1, 'rgba(200,230,255,0)');
    ctx.fillStyle = mistGrad;
    ctx.fillRect(cx - 40, ob.gapTop - 20, 80, 40);

    const mistGrad2 = ctx.createRadialGradient(cx, botY, 0, cx, botY, 40);
    mistGrad2.addColorStop(0, `rgba(200,230,255,${mistAlpha * 2})`);
    mistGrad2.addColorStop(1, 'rgba(200,230,255,0)');
    ctx.fillStyle = mistGrad2;
    ctx.fillRect(cx - 40, botY - 20, 80, 40);

    // ── Cave opening glow ──────────────────────────────────────────
    ctx.fillStyle = 'rgba(100,200,255,0.06)';
    ctx.fillRect(cx - W / 2, ob.gapTop, W, ob.gapH);

    ctx.restore();
}

function drawMissile(ob) {
    // warning when entering screen
    if (ob.x > CANVAS_W - 80) {
        ctx.save();
        ctx.fillStyle = '#22AAFF';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'right';
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(frameCount * 0.3);
        ctx.fillText('>> EXTINGUISHER <<', CANVAS_W - 10, ob.y);
        ctx.restore();
        return;
    }

    ctx.save();
    ctx.translate(ob.x, ob.y);

    // foam spray out of nozzle (left side)
    for (let i = 0; i < 5; i++) {
        ctx.fillStyle = `rgba(220,240,255,${0.3 + Math.random() * 0.4})`;
        ctx.beginPath();
        ctx.ellipse(
            -38 - i * 10 + (Math.random() - 0.5) * 6,
            (Math.random() - 0.5) * 14,
            6 + Math.random() * 6, 5 + Math.random() * 5, 0, 0, Math.PI * 2
        );
        ctx.fill();
    }

    // body
    const bodyGrad = ctx.createLinearGradient(0, -14, 0, 14);
    bodyGrad.addColorStop(0, '#FF4444');
    bodyGrad.addColorStop(0.5, '#CC0000');
    bodyGrad.addColorStop(1, '#881111');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 32, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // body shine
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.ellipse(4, -6, 18, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // label band
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-14, -7, 28, 14);
    ctx.fillStyle = '#CC0000';
    ctx.font = 'bold 7px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('FIRE', 0, -1);
    ctx.fillText('EXT', 0, 7);

    // pressure gauge
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(18, -4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#88FF88';
    ctx.beginPath();
    ctx.arc(18, -4, 3, 0, Math.PI * 2);
    ctx.fill();

    // nozzle (left)
    ctx.fillStyle = '#444';
    ctx.fillRect(-42, -4, 12, 8);
    ctx.fillStyle = '#222';
    ctx.fillRect(-50, -6, 10, 12);

    // handle on top
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-8, -14);
    ctx.lineTo(-8, -22);
    ctx.lineTo(8, -22);
    ctx.lineTo(8, -14);
    ctx.stroke();

    // pin
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(0, -28);
    ctx.stroke();

    ctx.restore();
}

function drawBucket(ob) {
    ctx.save();
    const bx = ob.x;
    const by = ob.y;
    const t = ob.timer;
    const streamTop = by + 32;
    const streamW = 28;

    // Water stream
    const wg = ctx.createLinearGradient(bx - streamW / 2, 0, bx + streamW / 2, 0);
    wg.addColorStop(0, 'rgba(30,100,220,0.65)');
    wg.addColorStop(0.45, 'rgba(120,190,255,0.9)');
    wg.addColorStop(0.55, 'rgba(120,190,255,0.9)');
    wg.addColorStop(1, 'rgba(30,100,220,0.65)');
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.moveTo(bx - streamW / 2, streamTop);
    for (let y = streamTop; y <= GROUND_Y; y += 8) {
        ctx.lineTo(bx - streamW / 2 + Math.sin((y + t * 3) * 0.15) * 4, y);
    }
    ctx.lineTo(bx - streamW / 2 + Math.sin((GROUND_Y + t * 3) * 0.15) * 4, GROUND_Y);
    ctx.lineTo(bx + streamW / 2 + Math.sin((GROUND_Y + t * 3 + 2) * 0.15) * 4, GROUND_Y);
    for (let y = GROUND_Y; y >= streamTop; y -= 8) {
        ctx.lineTo(bx + streamW / 2 + Math.sin((y + t * 3 + 2) * 0.15) * 4, y);
    }
    ctx.lineTo(bx + streamW / 2, streamTop);
    ctx.closePath();
    ctx.fill();

    // Shimmer lines inside stream
    ctx.strokeStyle = 'rgba(180,230,255,0.5)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
        const lx = bx - 7 + i * 7;
        ctx.beginPath();
        ctx.moveTo(lx, streamTop);
        for (let y = streamTop; y <= GROUND_Y; y += 12) {
            ctx.lineTo(lx + Math.sin((y + t * 4 + i * 30) * 0.2) * 3, y);
        }
        ctx.stroke();
    }

    // Splash pool at bottom
    ctx.fillStyle = 'rgba(80,160,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(bx, GROUND_Y + 3, 22 + Math.sin(t * 0.25) * 3, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bucket body (tilted trapezoid)
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(-0.3);
    const bW = 44, bH = 32;
    // body
    ctx.fillStyle = '#909090';
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-bW / 2, 0);
    ctx.lineTo(bW / 2, 0);
    ctx.lineTo(bW / 2 - 6, bH);
    ctx.lineTo(-bW / 2 + 6, bH);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // rim
    ctx.fillStyle = '#BBBBBB';
    ctx.fillRect(-bW / 2 - 2, -4, bW + 4, 6);
    // handle arc
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -4, 16, Math.PI, 0);
    ctx.stroke();
    // water inside
    ctx.fillStyle = 'rgba(50,130,220,0.8)';
    ctx.beginPath();
    ctx.moveTo(-bW / 2 + 2, 2);
    ctx.lineTo(bW / 2 - 2, 2);
    ctx.lineTo(bW / 2 - 5, 14);
    ctx.lineTo(-bW / 2 + 5, 14);
    ctx.closePath();
    ctx.fill();
    // shine
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(-bW / 2 + 4, 2, 8, bH - 4);
    ctx.restore();

    ctx.restore();
}

// ─── Coins ────────────────────────────────────────────────────────────────────
let coins = [];

function spawnCoins() {
    const type = Math.floor(Math.random() * 3);
    const baseY = 100 + Math.random() * (GROUND_Y - 200);
    if (type === 0) {
        // horizontal line
        for (let i = 0; i < 6; i++) {
            coins.push({ x: CANVAS_W + i * 40, y: baseY, collected: false });
        }
    } else if (type === 1) {
        // arc
        for (let i = 0; i < 7; i++) {
            const angle = (i / 6) * Math.PI;
            coins.push({
                x: CANVAS_W + 30 + i * 35,
                y: baseY + Math.sin(angle) * -80,
                collected: false
            });
        }
    } else {
        // zigzag
        for (let i = 0; i < 8; i++) {
            coins.push({
                x: CANVAS_W + i * 40,
                y: baseY + (i % 2 === 0 ? 0 : -50),
                collected: false
            });
        }
    }
}

function updateCoins() {
    for (let i = coins.length - 1; i >= 0; i--) {
        coins[i].x -= scrollSpeed;
        if (coins[i].x < -20) { coins.splice(i, 1); continue; }
        if (!coins[i].collected) {
            for (const pl of [player, player2]) {
                if (!pl.alive) continue;
                const dx = coins[i].x - (pl.x + pl.width / 2);
                const dy = coins[i].y - (pl.y + pl.height / 2);
                if (Math.sqrt(dx * dx + dy * dy) < 24) {
                    coins[i].collected = true;
                    pl.coinScore++;
                    playCoinSound();
                    for (let s = 0; s < 6; s++) {
                        const ang = Math.random() * Math.PI * 2;
                        particles.push(new Particle(
                            coins[i].x, coins[i].y,
                            Math.cos(ang) * 3, Math.sin(ang) * 3,
                            3, '#FFD700', 20
                        ));
                    }
                    break;
                }
            }
        }
    }
}

function drawCoins() {
    coins.forEach(coin => {
        if (coin.collected) return;
        ctx.save();
        ctx.fillStyle = '#FFD700';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#FFD700';
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFF8AA';
        ctx.beginPath();
        ctx.arc(coin.x - 2, coin.y - 2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

// ─── Ramen Collectibles ───────────────────────────────────────────────────────
function spawnRamen() {
    ramens.push({
        x: CANVAS_W + 20,
        y: 100 + Math.random() * (GROUND_Y - 180),
        collected: false,
        bobOffset: Math.random() * Math.PI * 2
    });
}

function updateRamens() {
    for (let i = ramens.length - 1; i >= 0; i--) {
        const r = ramens[i];
        r.x -= scrollSpeed;
        if (r.x < -60) { ramens.splice(i, 1); continue; }
        if (!r.collected) {
            for (const pl of [player, player2]) {
                if (!pl.alive) continue;
                const dx = r.x - (pl.x + pl.width / 2);
                const dy = r.y - (pl.y + pl.height / 2);
                if (Math.sqrt(dx * dx + dy * dy) < 36) {
                    r.collected = true;
                    playCrunchSound();
                    pl.spice = Math.min(100, pl.spice + 35);
                    for (let s = 0; s < 12; s++) {
                        const ang = Math.random() * Math.PI * 2;
                        particles.push(new Particle(
                            r.x, r.y,
                            Math.cos(ang) * 4, Math.sin(ang) * 4,
                            4, ['#FF4400','#FF8800','#FFCC00'][Math.floor(Math.random()*3)], 25
                        ));
                    }
                    break;
                }
            }
        }
    }
}

function drawRamens() {
    ramens.forEach(r => {
        if (r.collected) return;
        const bob = Math.sin(frameCount * 0.05 + r.bobOffset) * 5;
        const bx = r.x, by = r.y + bob;
        ctx.save();
        // glow
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#FF4400';
        // bowl
        ctx.fillStyle = '#CC0000';
        ctx.beginPath();
        ctx.ellipse(bx, by + 12, 20, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#AA0000';
        ctx.beginPath();
        ctx.moveTo(bx - 20, by + 12);
        ctx.quadraticCurveTo(bx, by + 32, bx + 20, by + 12);
        ctx.fill();
        // broth
        ctx.fillStyle = '#FF5500';
        ctx.beginPath();
        ctx.ellipse(bx, by + 8, 16, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        // noodles — wavy strands piled in the bowl
        ctx.shadowBlur = 0;
        ctx.lineCap = 'round';
        const nColors = ['#FFE0A0', '#FFD070', '#FFC860', '#FFEBA8'];
        const wave = frameCount * 0.04 + r.bobOffset;
        for (let n = 0; n < 8; n++) {
            ctx.strokeStyle = nColors[n % nColors.length];
            ctx.lineWidth = 2 + (n % 2) * 0.8;
            ctx.beginPath();
            const ny = by + 9 - n * 1.4;
            const nx0 = bx - 14 + (n % 3) * 2;
            ctx.moveTo(nx0, ny);
            for (let seg = 0; seg < 6; seg++) {
                const cx1 = nx0 + seg * 5 + 2.5;
                const cy1 = ny + (seg % 2 === 0 ? -1 : 1) * (4 + Math.sin(wave + n * 0.7) * 2);
                const ex = nx0 + (seg + 1) * 5;
                ctx.quadraticCurveTo(cx1, cy1, ex, ny + Math.sin(wave * 0.5 + n) * 1.5);
            }
            ctx.stroke();
        }
        // flame icon above bowl
        ctx.fillStyle = '#FF4400';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#FF6600';
        ctx.beginPath();
        ctx.moveTo(bx, by - 8);
        ctx.quadraticCurveTo(bx + 7, by - 4, bx + 5, by + 2);
        ctx.quadraticCurveTo(bx + 8, by - 2, bx + 3, by + 5);
        ctx.quadraticCurveTo(bx, by, bx - 3, by + 5);
        ctx.quadraticCurveTo(bx - 8, by - 2, bx - 5, by + 2);
        ctx.quadraticCurveTo(bx - 7, by - 4, bx, by - 8);
        ctx.fill();
        ctx.restore();
    });
}

// ─── Spicy Sauce Collectibles ─────────────────────────────────────────────────
function spawnSauce() {
    sauces.push({
        x: CANVAS_W + 20,
        y: 80 + Math.random() * (GROUND_Y - 180),
        collected: false,
        bobOffset: Math.random() * Math.PI * 2
    });
}

function updateSauces() {
    for (let i = sauces.length - 1; i >= 0; i--) {
        const s = sauces[i];
        s.x -= scrollSpeed;
        if (s.x < -60) { sauces.splice(i, 1); continue; }
        if (!s.collected) {
            for (const pl of [player, player2]) {
                if (!pl.alive) continue;
                const dx = s.x - (pl.x + pl.width / 2);
                const dy = s.y - (pl.y + pl.height / 2);
                if (Math.sqrt(dx * dx + dy * dy) < 36) {
                    s.collected = true;
                    pl.spice = 100;
                    playCrunchSound();
                    // big burst
                    for (let p = 0; p < 24; p++) {
                        const ang = Math.random() * Math.PI * 2;
                        const spd = 2 + Math.random() * 8;
                        particles.push(new Particle(
                            s.x, s.y,
                            Math.cos(ang) * spd, Math.sin(ang) * spd - 2,
                            5 + Math.random() * 8,
                            ['#FF0000','#FF4400','#FF8800','#FFCC00','#FFF'][Math.floor(Math.random()*5)],
                            35 + Math.random() * 25
                        ));
                    }
                    break;
                }
            }
        }
    }
}

function drawSauces() {
    sauces.forEach(s => {
        if (s.collected) return;
        const bob = Math.sin(frameCount * 0.07 + s.bobOffset) * 6;
        const bx = s.x, by = s.y + bob;
        ctx.save();
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#FF0000';

        // bottle body
        ctx.fillStyle = '#CC0000';
        roundRect(ctx, bx - 10, by - 20, 20, 36, 4);
        ctx.fill();

        // label
        ctx.fillStyle = '#FF2200';
        roundRect(ctx, bx - 8, by - 10, 16, 18, 3);
        ctx.fill();
        ctx.fillStyle = '#FFE000';
        ctx.font = 'bold 7px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('HOT', bx, by - 1);
        ctx.fillText('SAUCE', bx, by + 7);

        // bottle neck
        ctx.fillStyle = '#AA0000';
        ctx.fillRect(bx - 5, by - 30, 10, 12);

        // cap
        ctx.fillStyle = '#FF6600';
        ctx.fillRect(bx - 6, by - 36, 12, 8);

        // drip
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(bx + 4, by + 16, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    });
}

// ─── Hot Pepper Collectibles ──────────────────────────────────────────────────
function spawnPepper() {
    peppers.push({
        x: CANVAS_W + 20,
        y: 80 + Math.random() * (GROUND_Y - 180),
        collected: false,
        bobOffset: Math.random() * Math.PI * 2
    });
}

function updatePeppers() {
    for (let i = peppers.length - 1; i >= 0; i--) {
        const p = peppers[i];
        p.x -= scrollSpeed;
        if (p.x < -60) { peppers.splice(i, 1); continue; }
        if (!p.collected) {
            for (const pl of [player, player2]) {
                if (!pl.alive) continue;
                if (playerCount === 1 && pl === player2) continue;
                const dx = p.x - (pl.x + pl.width / 2);
                const dy = p.y - (pl.y + pl.height / 2);
                if (Math.sqrt(dx * dx + dy * dy) < 30) {
                    p.collected = true;
                    pl.pepperTimer = 300;
                    pl.spice = 100;
                    playCrunchSound();
                    for (let s = 0; s < 30; s++) {
                        const ang = Math.random() * Math.PI * 2;
                        const spd = 3 + Math.random() * 9;
                        particles.push(new Particle(
                            p.x, p.y,
                            Math.cos(ang) * spd, Math.sin(ang) * spd - 2,
                            4 + Math.random() * 7,
                            ['#FF2200','#FF6600','#FFCC00','#FF0000'][Math.floor(Math.random()*4)],
                            30 + Math.random() * 20
                        ));
                    }
                    break;
                }
            }
        }
    }
}

function drawPeppers() {
    peppers.forEach(p => {
        if (p.collected) return;
        const bob = Math.sin(frameCount * 0.06 + p.bobOffset) * 6;
        const bx = p.x, by = p.y + bob;
        ctx.save();
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#FF4400';

        // pepper body (curved chili shape)
        ctx.fillStyle = '#DD0000';
        ctx.beginPath();
        ctx.moveTo(bx, by - 18);
        ctx.bezierCurveTo(bx + 14, by - 14, bx + 16, by + 4, bx + 6, by + 18);
        ctx.bezierCurveTo(bx + 2, by + 24, bx - 2, by + 24, bx - 6, by + 18);
        ctx.bezierCurveTo(bx - 16, by + 4, bx - 14, by - 14, bx, by - 18);
        ctx.fill();

        // highlight on pepper
        ctx.fillStyle = 'rgba(255,100,100,0.4)';
        ctx.beginPath();
        ctx.ellipse(bx - 4, by - 6, 4, 10, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // green stem
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#228B22';
        ctx.beginPath();
        ctx.moveTo(bx - 4, by - 18);
        ctx.bezierCurveTo(bx - 6, by - 28, bx + 2, by - 30, bx + 4, by - 22);
        ctx.lineTo(bx, by - 18);
        ctx.closePath();
        ctx.fill();

        // flame sparkles around pepper
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#FF6600';
        ctx.fillStyle = '#FF6600';
        const t = frameCount * 0.12 + p.bobOffset;
        for (let s = 0; s < 4; s++) {
            const ang = t + s * Math.PI / 2;
            const r = 18 + Math.sin(t * 2 + s) * 4;
            ctx.beginPath();
            ctx.arc(bx + Math.cos(ang) * r, by + Math.sin(ang) * r, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    });
}

function _fireFlameShape(cx, baseY, h, w, wobbleIdx) {
    const t = frameCount * 0.07;
    const wob = Math.sin(t * 1.9 + wobbleIdx) * w * 0.35;
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, baseY);
    ctx.bezierCurveTo(cx - w / 2, baseY - h * 0.4, cx + wob - w * 0.3, baseY - h * 0.7, cx + wob, baseY - h);
    ctx.bezierCurveTo(cx + wob + w * 0.3, baseY - h * 0.7, cx + w / 2, baseY - h * 0.4, cx + w / 2, baseY);
    ctx.closePath();
}

function drawPepperFlamesBehind(pl) {
    if (pl.pepperTimer <= 0) return;
    const t = frameCount * 0.07;
    ctx.save();
    // Large red flames rising from below, behind the character
    for (let i = 0; i < 8; i++) {
        const bx = pl.x - 6 + (i / 7) * (pl.width + 12);
        const h = 60 + Math.sin(t * 1.1 + i * 0.9) * 22;
        const w = 15 + Math.sin(t + i) * 4;
        _fireFlameShape(bx, pl.y + pl.height + 4, h, w, i * 1.3);
        const g = ctx.createLinearGradient(bx, pl.y + pl.height + 4, bx, pl.y + pl.height + 4 - h);
        g.addColorStop(0, '#BB0000');
        g.addColorStop(0.45, '#FF4400');
        g.addColorStop(1, 'rgba(255,130,0,0)');
        ctx.fillStyle = g;
        ctx.globalAlpha = 0.85;
        ctx.fill();
    }
    ctx.restore();
}

function drawPepperAura(pl) {
    if (pl.pepperTimer <= 0) return;
    const cx = pl.x + pl.width / 2;
    const t = frameCount * 0.07;
    ctx.save();

    // Left side flames
    ctx.globalAlpha = 0.8;
    for (let i = 0; i < 4; i++) {
        const by = pl.y + pl.height * 0.15 + (i / 3) * pl.height * 0.85;
        const h = 30 + Math.sin(t * 2 + i * 0.8) * 11;
        _fireFlameShape(pl.x - 7, by, h, 12, i * 1.5);
        const g = ctx.createLinearGradient(pl.x - 7, by, pl.x - 7, by - h);
        g.addColorStop(0, '#FF2200'); g.addColorStop(0.5, '#FF7700'); g.addColorStop(1, 'rgba(255,200,0,0)');
        ctx.fillStyle = g; ctx.fill();
    }
    // Right side flames
    for (let i = 0; i < 4; i++) {
        const by = pl.y + pl.height * 0.15 + (i / 3) * pl.height * 0.85;
        const h = 30 + Math.sin(t * 2 + i * 0.8 + 2.5) * 11;
        _fireFlameShape(pl.x + pl.width + 7, by, h, 12, i * 1.5 + 2);
        const g = ctx.createLinearGradient(pl.x + pl.width + 7, by, pl.x + pl.width + 7, by - h);
        g.addColorStop(0, '#FF2200'); g.addColorStop(0.5, '#FF7700'); g.addColorStop(1, 'rgba(255,200,0,0)');
        ctx.fillStyle = g; ctx.fill();
    }
    // Top head flames — tallest
    for (let i = 0; i < 7; i++) {
        const bx = pl.x + 1 + (i / 6) * (pl.width - 2);
        const h = 50 + Math.sin(t * 1.4 + i * 0.7) * 20;
        const w = 13 + Math.sin(t * 2 + i) * 3;
        _fireFlameShape(bx, pl.y + 12, h, w, i * 1.1 + 0.5);
        const g = ctx.createLinearGradient(bx, pl.y + 12, bx, pl.y + 12 - h);
        g.addColorStop(0, '#FF1100'); g.addColorStop(0.4, '#FF7700'); g.addColorStop(0.75, '#FFCC00'); g.addColorStop(1, 'rgba(255,230,0,0)');
        ctx.fillStyle = g; ctx.fill();
    }
    // Pulsing orange-red glow over whole body
    ctx.globalAlpha = 0.16 + Math.sin(t * 3) * 0.07;
    const glow = ctx.createRadialGradient(cx, pl.y + pl.height / 2, 0, cx, pl.y + pl.height / 2, pl.width + 18);
    glow.addColorStop(0, '#FFAA00'); glow.addColorStop(0.6, '#FF4400'); glow.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(pl.x - 28, pl.y - 55, pl.width + 56, pl.height + 65);

    // Timer bar
    ctx.globalAlpha = 0.92;
    const frac = pl.pepperTimer / 300;
    ctx.fillStyle = '#111';
    ctx.fillRect(pl.x - 2, pl.y - 18, pl.width + 4, 7);
    ctx.fillStyle = `hsl(${frac * 30}, 100%, 55%)`;
    ctx.fillRect(pl.x - 2, pl.y - 18, (pl.width + 4) * frac, 7);
    ctx.restore();
}

// ─── Collision Detection ──────────────────────────────────────────────────────
function checkPlayerCollisions(pl) {
    if (!pl.alive) return;
    if (pl.pepperTimer > 0) return;
    const px = pl.x + 6;
    const py = pl.y + 6;
    const pw = pl.width - 12;
    const ph = pl.height - 12;

    for (const ob of obstacles) {
        let hit = false;
        if (ob.type === 'laser') {
            const inX = px < ob.x + 6 && px + pw > ob.x - 6;
            const inTopBeam = py < ob.gapTop;
            const inBotBeam = py + ph > ob.gapTop + ob.gapH;
            if (inX && (inTopBeam || inBotBeam)) hit = true;
        } else if (ob.type === 'missile') {
            if (px < ob.x + 50 && px + pw > ob.x - 30 &&
                py < ob.y + 12 && py + ph > ob.y - 12) hit = true;
        } else if (ob.type === 'bucket') {
            const streamW = 28;
            const streamTop = ob.y + 32;
            if (px < ob.x + streamW / 2 && px + pw > ob.x - streamW / 2 &&
                py + ph > streamTop && py < GROUND_Y) hit = true;
        }
        if (hit) {
            killPlayerObj(pl);
            return;
        }
    }
}

function checkCollisions() {
    checkPlayerCollisions(player);
    if (playerCount === 2) checkPlayerCollisions(player2);
}

function killPlayerObj(pl) {
    if (!pl.alive) return;
    pl.alive = false;
    pl.lives--;
    if (pl === player) p1Thrusting = false;
    if (pl === player2) p2Thrusting = false;
    updateFireSound();
    spawnExplosion(pl.x + pl.width / 2, pl.y + pl.height / 2);
    pl.vy = 8;
    playDeathSound();

    const p1Done = player.lives <= 0;
    const p2Done = playerCount === 1 || player2.lives <= 0;
    if (p1Done && p2Done) {
        stopFireSound();
        bgMusic.pause();
        bgMusic.currentTime = 0;
        musicStatus = 'blocked';
        gameState = STATE.DEAD;
        deadTimer = 0;
    } else if (pl.lives > 0) {
        pl.respawnTimer = 120;
    }
}

// ─── HUD ──────────────────────────────────────────────────────────────────────
function drawHUD(pl, keyHint, xOff, hw) {
    ctx.save();
    // stats box (top-left of this player's half)
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(xOff + 8, 8, 170, 76);
    ctx.fillStyle = '#FFAA00';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Dist: ${distanceScore}m`, xOff + 16, 28);
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`Coins: ${pl.coinScore}`, xOff + 16, 48);
    // life hearts
    ctx.font = '15px Arial';
    for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < pl.lives ? '#FF2244' : '#553333';
        ctx.fillText('♥', xOff + 16 + i * 20, 68);
    }

    // player label centred in this player's half
    ctx.textAlign = 'center';
    if (!pl.alive && pl.respawnTimer > 0) {
        // respawning — show countdown
        const secs = Math.ceil(pl.respawnTimer / 60);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(xOff + hw / 2 - 70, 4, 140, 34);
        ctx.fillStyle = Math.sin(frameCount * 0.2) > 0 ? '#FFAA00' : '#FFD700';
        ctx.font = 'bold 18px Arial';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#FF8800';
        ctx.fillText(`RESPAWNING ${secs}…`, xOff + hw / 2, 28);
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(xOff + hw - 148, 8, 140, 44);
        ctx.fillStyle = '#996600';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('DEAD', xOff + hw - 78, 36);
    } else if (!pl.alive) {
        // permanently dead (lives = 0)
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(xOff + hw / 2 - 60, 4, 120, 34);
        ctx.fillStyle = Math.sin(frameCount * 0.18) > 0 ? '#FF2200' : '#FF6600';
        ctx.font = 'bold 22px Arial';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#FF0000';
        ctx.fillText('☠ DEAD', xOff + hw / 2, 28);
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(xOff + hw - 148, 8, 140, 44);
        ctx.fillStyle = '#880000';
        ctx.font = 'bold 18px Arial';
        ctx.fillText('DEAD', xOff + hw - 78, 36);
    } else {
        ctx.fillStyle = pl.shirtColor;
        ctx.font = 'bold 14px Arial';
        ctx.fillText(keyHint === 'W' ? 'P1' : 'P2', xOff + hw / 2, 22);

        // spice bar (top-right of this player's half)
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(xOff + hw - 148, 8, 140, 44);
        const spiceFrac = pl.spice / 100;
        const spiceColor = spiceFrac > 0.5 ? '#FF4400' : spiceFrac > 0.25 ? '#FF8800' : '#FF0000';
        ctx.fillStyle = spiceColor;
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('SPICE LEVEL', xOff + hw - 140, 22);
        ctx.fillStyle = '#333';
        ctx.fillRect(xOff + hw - 140, 27, 124, 14);
        ctx.fillStyle = spiceColor;
        if (spiceFrac > 0) {
            const flicker = spiceFrac > 0.1 ? 0.92 + Math.random() * 0.08 : 1;
            ctx.fillRect(xOff + hw - 140, 27, Math.floor(124 * spiceFrac * flicker), 14);
        }
        if (pl.spice <= 0) {
            ctx.fillStyle = Math.sin(frameCount * 0.2) > 0 ? '#FF0000' : '#FF6600';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'left';
            ctx.fillText('NO SPICE! EAT RAMEN!', xOff + hw - 140, 52);
        } else if (pl.spice < 25) {
            ctx.fillStyle = '#FF8800';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'left';
            ctx.fillText('LOW SPICE! EAT RAMEN!', xOff + hw - 140, 52);
        }
    }

    // hold key prompt
    if (hudPromptAlpha > 0) {
        ctx.globalAlpha = hudPromptAlpha;
        ctx.fillStyle = 'white';
        ctx.font = '13px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`HOLD ${keyHint} to fly!`, xOff + hw / 2, CANVAS_H - 20);
    }
    ctx.restore();
}

// ─── Game Over Screen ─────────────────────────────────────────────────────────
function drawGameOver() {
    if (deadTimer < 50) return;
    const fade = Math.min(1, (deadTimer - 50) / 40);
    ctx.save();
    ctx.globalAlpha = fade * 0.8;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.globalAlpha = fade;

    ctx.textAlign = 'center';
    ctx.fillStyle = '#FF2200';
    ctx.font = 'bold 48px Arial';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#FF6600';
    ctx.fillText('GAME OVER', CANVAS_W / 2, 90);
    ctx.shadowBlur = 0;

    if (playerCount === 1) {
        ctx.fillStyle = '#FF9900';
        ctx.font = 'bold 18px Arial';
        ctx.fillText('TOO SPICY FOR YOU!', CANVAS_W / 2, 128);

        const p1Total = distanceScore + player.coinScore * 5;
        ctx.fillStyle = player.shirtColor;
        ctx.font = 'bold 20px Arial';
        ctx.fillText('YOUR SCORE', CANVAS_W / 2, 195);
        ctx.fillStyle = 'white';
        ctx.font = '17px Arial';
        ctx.fillText(`Distance: ${distanceScore}m`, CANVAS_W / 2, 228);
        ctx.fillText(`Coins: ${player.coinScore}  (+${player.coinScore * 5}pts)`, CANVAS_W / 2, 256);
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 22px Arial';
        ctx.fillText(`TOTAL: ${p1Total}`, CANVAS_W / 2, 292);
    } else {
        ctx.fillStyle = '#FF9900';
        ctx.font = 'bold 18px Arial';
        ctx.fillText('TOO SPICY FOR BOTH OF YOU!', CANVAS_W / 2, 128);

        const p1Total = distanceScore + player.coinScore * 5;
        ctx.fillStyle = player.shirtColor;
        ctx.font = 'bold 20px Arial';
        ctx.fillText('PLAYER 1', CANVAS_W / 4, 185);
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.fillText(`Dist: ${distanceScore}m`, CANVAS_W / 4, 215);
        ctx.fillText(`Coins: ${player.coinScore} (+${player.coinScore * 5}pts)`, CANVAS_W / 4, 238);
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 18px Arial';
        ctx.fillText(`Score: ${p1Total}`, CANVAS_W / 4, 266);

        const p2Total = distanceScore + player2.coinScore * 5;
        ctx.fillStyle = player2.shirtColor;
        ctx.font = 'bold 20px Arial';
        ctx.fillText('PLAYER 2', (CANVAS_W * 3) / 4, 185);
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.fillText(`Dist: ${distanceScore}m`, (CANVAS_W * 3) / 4, 215);
        ctx.fillText(`Coins: ${player2.coinScore} (+${player2.coinScore * 5}pts)`, (CANVAS_W * 3) / 4, 238);
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 18px Arial';
        ctx.fillText(`Score: ${p2Total}`, (CANVAS_W * 3) / 4, 266);

        ctx.strokeStyle = '#FF6600';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(CANVAS_W / 2, 165);
        ctx.lineTo(CANVAS_W / 2, 280);
        ctx.stroke();

        ctx.font = 'bold 26px Arial';
        ctx.shadowBlur = 14;
        ctx.shadowColor = '#FF6600';
        if (p1Total > p2Total) {
            ctx.fillStyle = player.shirtColor;
            ctx.fillText('PLAYER 1 WINS!', CANVAS_W / 2, 330);
        } else if (p2Total > p1Total) {
            ctx.fillStyle = player2.shirtColor;
            ctx.fillText('PLAYER 2 WINS!', CANVAS_W / 2, 330);
        } else {
            ctx.fillStyle = '#FFDD00';
            ctx.fillText("IT'S A TIE!", CANVAS_W / 2, 330);
        }
        ctx.shadowBlur = 0;
    }

    if (deadTimer > 90) {
        const blink = Math.sin(frameCount * 0.15) > 0;
        ctx.fillStyle = blink ? '#FFFFFF' : '#FFAA00';
        ctx.font = '17px Arial';
        ctx.fillText('ENTER  or  CLICK  to return to menu', CANVAS_W / 2, 390);
    }
    ctx.restore();
}

// ─── Intro Cutscene ───────────────────────────────────────────────────────────
function updateIntro() {
    introFrame++;
    if (introFrame > 340) startGame();

    // Spawn particles for fire burst
    if (introFrame >= 270 && introFrame < 310) {
        const bx = PLAYER_X + player.width / 2;
        const by = GROUND_Y - 20;
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 2 + Math.random() * 6;
            introParticles.push(new Particle(
                bx, by,
                Math.cos(angle) * spd, Math.sin(angle) * spd - 2,
                5 + Math.random() * 8,
                ['#FF2200', '#FF6600', '#FFCC00'][Math.floor(Math.random() * 3)],
                30
            ));
        }
    }
    introParticles = introParticles.filter(p => { p.update(); return !p.dead; });
}

function drawIntro() {
    const f = introFrame;

    // Background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Phase 1 (0-50): Title
    if (f < 100) {
        const alpha = Math.min(1, f / 40);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.textAlign = 'center';
        ctx.font = 'bold 64px Arial';
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#FF6600';
        ctx.fillStyle = '#FF2200';
        ctx.fillText('SPICY RIDE', CANVAS_W / 2, CANVAS_H / 2 - 40);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#FFAA00';
        ctx.font = '22px Arial';
        ctx.fillText(`Buldak Edition — ${playerCount === 1 ? '1 Player' : '2 Players'}`, CANVAS_W / 2, CANVAS_H / 2 + 10);
        ctx.font = 'bold 16px Arial';
        if (playerCount === 1) {
            ctx.fillStyle = '#3355CC';
            ctx.fillText('hold  W  to fly', CANVAS_W / 2, CANVAS_H / 2 + 55);
        } else {
            ctx.fillStyle = '#3355CC';
            ctx.fillText('P1: hold  W  to fly', CANVAS_W / 2 - 120, CANVAS_H / 2 + 55);
            ctx.fillStyle = '#CC3333';
            ctx.fillText('P2: hold  ↑  to fly', CANVAS_W / 2 + 120, CANVAS_H / 2 + 55);
        }
        ctx.restore();
        if (f < 80) return;
    }

    // Phase 2+ (50+): Scene
    if (f >= 50) {
        const sceneFade = Math.min(1, (f - 50) / 40);
        ctx.save();
        ctx.globalAlpha = sceneFade;
        drawBackground();
        ctx.restore();
    }

    // bowl slides in (100–140)
    if (f >= 100) {
        const targetBowlX = PLAYER_X + player.width + 80;
        if (!bowl.visible) { bowl.visible = true; bowl.x = CANVAS_W + 50; }
        if (!bowl.grabbed) {
            bowl.x = Math.max(targetBowlX, bowl.x - 8);
        }
        if (bowl.x <= targetBowlX + 5 && !bowl.grabbed) {
            bowl.x = targetBowlX;
        }
        drawRamenBowl(bowl.x, GROUND_Y - 70);
    }

    // Character
    let introState = 'idle';
    let charY = GROUND_Y - player.height;
    const charHeadRed = f >= 230 ? Math.min(1, (f - 230) / 40) : 0;

    if (f >= 140 && f < 180) {
        introState = 'reaching';
        if (f >= 165) bowl.grabbed = true;
    } else if (f >= 180 && f < 270) {
        introState = 'eating';
        bowl.grabbed = true;
        // bowl near face
        if (bowl.visible) {
            bowl.x = PLAYER_X + player.width - 10;
            drawRamenBowl(bowl.x, GROUND_Y - player.height + 10);
            bowl.visible = f < 240;
        }
    } else if (f >= 270 && f < 320) {
        introState = 'idle';
        // launch: character rises
        const launchT = (f - 300) / 20;
        if (f >= 300) charY = (GROUND_Y - player.height) - launchT * launchT * 120;
    }

    if (introState !== 'eating' || f >= 240) {
        if (bowl.visible && f >= 100 && f < 180) {
            drawRamenBowl(bowl.x, GROUND_Y - 70);
        }
    }

    drawCharacter({ ...player, y: charY, headRed: charHeadRed, crumpled: false }, false, introState);

    // draw intro fire particles
    introParticles.forEach(p => p.draw());

    // Captions
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px Arial';
    if (f >= 100 && f < 145) {
        ctx.fillStyle = '#FFAA00';
        ctx.fillText('What\'s that...?', CANVAS_W / 2, 60);
    } else if (f >= 140 && f < 185) {
        ctx.fillStyle = '#FF4400';
        ctx.fillText('BULDAK RAMEN!!', CANVAS_W / 2, 60);
    } else if (f >= 180 && f < 235) {
        ctx.fillStyle = '#FF6600';
        const slurps = ['SLURP SLURP SLURP', 'NOM NOM NOM', 'SLURP SLURP!!'];
        ctx.fillText(slurps[Math.floor(f / 18) % 3], CANVAS_W / 2, 60);
    } else if (f >= 230 && f < 275) {
        ctx.fillStyle = '#FF0000';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#FF6600';
        ctx.fillText("IT'S SO HOT!!!", CANVAS_W / 2, 60);
        ctx.font = '18px Arial';
        ctx.fillStyle = '#FFAA00';
        ctx.fillText('2x spicy / 불닭볶음면', CANVAS_W / 2, 90);
    } else if (f >= 270 && f < 325) {
        ctx.fillStyle = '#FF6600';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#FF2200';
        ctx.font = 'bold 28px Arial';
        ctx.fillText('MAXIMUM SPICE ACHIEVED!', CANVAS_W / 2, 60);
    }
    ctx.restore();

    // Fade to black on transition
    if (f >= 320) {
        const fadeOut = (f - 320) / 20;
        ctx.save();
        ctx.globalAlpha = Math.min(1, fadeOut);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.restore();
    }
}

// ─── Game Management ──────────────────────────────────────────────────────────
function startGame() {
    tryStartMusic();
    gameState = STATE.PLAYING;
    resetPlayer();
    obstacles.length = 0;
    coins.length = 0;
    particles.length = 0;
    groundFireTrail.length = 0;
    ramens.length = 0;
    nextRamenIn = 180;
    sauces.length = 0;
    nextSauceIn = 600;
    peppers.length = 0;
    nextPepperIn = 900;
    scrollOffset = 0;
    scrollSpeed = SCROLL_SPEED_BASE;
    distanceScore = 0;
    frameCount = 0;
    nextObstacleIn = 140;
    hudPromptAlpha = 1;
}

function confirmMenu() {
    playerCount = menuSelection === 0 ? 1 : 2;
    introFrame = 0;
    introParticles = [];
    bowl = { x: 700, y: GROUND_Y - 60, visible: false, grabbed: false };
    gameState = STATE.INTRO;
    tryStartMusic();
}

function resetGame() {
    gameState = STATE.MENU;
    adminMode = false;
    bgMusic.pause();
    bgMusic.currentTime = 0;
    musicStatus = 'blocked';
}

// ─── Dead State Update ────────────────────────────────────────────────────────
function updateDeadPlayer(pl) {
    if (!pl.crumpled) {
        pl.vy += GRAVITY;
        pl.y += pl.vy;
        const groundLimit = GROUND_Y - pl.height;
        if (pl.y >= groundLimit) {
            pl.y = groundLimit;
            pl.vy = 0;
            pl.crumpled = true;
        }
    }
}

function updateDead() {
    deadTimer++;
    updateDeadPlayer(player);
    if (playerCount === 2) updateDeadPlayer(player2);
    particles = particles.filter(p => { p.update(); return !p.dead; });
}

function updateRespawn(pl) {
    if (pl.alive || pl.respawnTimer <= 0) return;
    updateDeadPlayer(pl);
    pl.respawnTimer--;
    if (pl.respawnTimer === 0) {
        respawnPlayerObj(pl);
    }
}

// ─── Full-Screen Rendering ────────────────────────────────────────────────────
function renderFullScreen() {
    drawBackground();
    drawGroundFire();
    drawObstacles();
    drawCoins();
    drawRamens();
    drawSauces();
    drawPeppers();
    particles.forEach(p => p.draw());
    if (playerCount === 2 && player2.alive) drawPepperFlamesBehind(player2);
    if (player.alive) drawPepperFlamesBehind(player);
    if (playerCount === 2) {
        if (player2.alive) {
            drawCharacter(player2, p2Thrusting, 'idle');
        } else if (player2.respawnTimer > 0) {
            ctx.save();
            ctx.globalAlpha = 0.35 + Math.abs(Math.sin(frameCount * 0.25)) * 0.55;
            drawCharacter(player2, false, 'idle');
            ctx.restore();
        }
    }
    if (player.alive) {
        drawCharacter(player, p1Thrusting, 'idle');
    } else if (player.respawnTimer > 0) {
        ctx.save();
        ctx.globalAlpha = 0.35 + Math.abs(Math.sin(frameCount * 0.25)) * 0.55;
        drawCharacter(player, false, 'idle');
        ctx.restore();
    }
    if (player.alive) drawPepperAura(player);
    if (playerCount === 2 && player2.alive) drawPepperAura(player2);
    if (playerCount === 1) {
        drawHUD(player, 'W', 0, CANVAS_W);
    } else {
        drawHUD(player, 'W', 0, CANVAS_W / 2);
        drawHUD(player2, '↑', CANVAS_W / 2, CANVAS_W / 2);
    }
}

function renderFullScreenDead() {
    drawBackground();
    drawObstacles();
    drawCoins();
    particles.forEach(p => p.draw());
    if (playerCount === 2) drawCharacter(player2, false, 'idle');
    drawCharacter(player, false, 'idle');
}

// ─── Admin Overlay ────────────────────────────────────────────────────────────
function drawAdminOverlay() {
    if (!adminMode) return;
    ctx.save();
    const x = 8, y = CANVAS_H - 110, w = 210, h = 100;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = '#FF6600';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#FF6600';
    ctx.font = 'bold 13px Arial';
    ctx.fillText('⚡ ADMIN MODE', x + 10, y + 20);

    ctx.fillStyle = '#FFCC00';
    ctx.font = '12px Arial';
    ctx.fillText('[1]  Spawn Ramen', x + 10, y + 42);
    ctx.fillStyle = '#FF4400';
    ctx.fillText('[2]  Spawn Hot Sauce', x + 10, y + 60);
    ctx.fillStyle = '#FF2200';
    ctx.fillText('[3]  Spawn Chili Pepper', x + 10, y + 78);

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '11px Arial';
    ctx.fillText('Press F to close', x + 10, y + 96);
    ctx.restore();
}

// ─── Main Menu ────────────────────────────────────────────────────────────────
function drawMenuBackground() {
    menuScrollOffset = (menuScrollOffset + 2.5) % (CANVAS_W * 4);

    // Sky fill
    ctx.fillStyle = '#07071A';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Ceiling metal plate
    ctx.fillStyle = '#10102A';
    ctx.fillRect(0, 0, CANVAS_W, 58);
    ctx.strokeStyle = '#1C1C38';
    ctx.lineWidth = 1;
    for (let i = -1; i < CANVAS_W / 100 + 2; i++) {
        ctx.strokeRect(i * 100 - menuScrollOffset % 100, 0, 100, 58);
    }

    // Ceiling lights with glow cones
    const lightOff = menuScrollOffset % 180;
    for (let i = -1; i < CANVAS_W / 180 + 2; i++) {
        const lx = i * 180 - lightOff + 90;
        ctx.fillStyle = '#232342';
        ctx.fillRect(lx - 26, 8, 52, 24);
        ctx.fillStyle = '#FFDD55';
        ctx.fillRect(lx - 20, 13, 40, 14);
        const cone = ctx.createLinearGradient(0, 32, 0, 160);
        cone.addColorStop(0, 'rgba(255,220,60,0.13)');
        cone.addColorStop(1, 'rgba(255,220,60,0)');
        ctx.fillStyle = cone;
        ctx.beginPath();
        ctx.moveTo(lx - 20, 32);
        ctx.lineTo(lx + 20, 32);
        ctx.lineTo(lx + 65, 160);
        ctx.lineTo(lx - 65, 160);
        ctx.closePath();
        ctx.fill();
    }

    // Back wall panels (slow)
    const wallOff = (menuScrollOffset * 0.35) % 200;
    for (let i = -1; i < CANVAS_W / 200 + 2; i++) {
        const wx = i * 200 - wallOff;
        ctx.fillStyle = '#0C0C22';
        ctx.fillRect(wx, 58, 200, GROUND_Y - 58);
        ctx.strokeStyle = '#181830';
        ctx.lineWidth = 1;
        ctx.strokeRect(wx, 58, 200, GROUND_Y - 58);
        // monitor
        ctx.fillStyle = '#001833';
        ctx.fillRect(wx + 48, GROUND_Y - 170, 84, 58);
        ctx.fillStyle = 'rgba(0,110,240,0.45)';
        ctx.fillRect(wx + 51, GROUND_Y - 167, 78, 52);
        // data lines on monitor
        ctx.strokeStyle = 'rgba(0,180,255,0.55)';
        for (let row = 0; row < 4; row++) {
            const w2 = 20 + Math.abs(Math.sin(menuScrollOffset * 0.018 + i + row * 1.3)) * 40;
            ctx.beginPath();
            ctx.moveTo(wx + 54, GROUND_Y - 160 + row * 11);
            ctx.lineTo(wx + 54 + w2, GROUND_Y - 160 + row * 11);
            ctx.stroke();
        }
    }

    // Lab tables with equipment (medium scroll)
    const tableOff = (menuScrollOffset * 0.65) % 280;
    for (let i = -1; i < CANVAS_W / 280 + 2; i++) {
        const tx = i * 280 - tableOff;
        ctx.fillStyle = '#141428';
        ctx.fillRect(tx, GROUND_Y - 112, 170, 8);
        ctx.fillRect(tx + 6, GROUND_Y - 104, 12, 104);
        ctx.fillRect(tx + 152, GROUND_Y - 104, 12, 104);
        // tall beaker
        ctx.fillStyle = '#0A2035';
        ctx.fillRect(tx + 62, GROUND_Y - 142, 20, 30);
        ctx.fillStyle = 'rgba(180,40,40,0.45)';
        ctx.fillRect(tx + 64, GROUND_Y - 125, 16, 13);
        // small round flask
        ctx.fillStyle = '#0A2035';
        ctx.beginPath();
        ctx.arc(tx + 28, GROUND_Y - 122, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(tx + 25, GROUND_Y - 139, 6, 17);
        ctx.fillStyle = 'rgba(0,200,100,0.35)';
        ctx.beginPath();
        ctx.arc(tx + 28, GROUND_Y - 122, 9, 0, Math.PI * 2);
        ctx.fill();
    }

    // Walking scientists silhouettes (3 at different speeds)
    for (let i = 0; i < 3; i++) {
        const spd = 1.1 + i * 0.35;
        const sx = ((menuScrollOffset * spd + i * 230) % (CANVAS_W + 80)) - 40;
        drawMenuScientist(sx, GROUND_Y, i);
    }

    // Floor
    const floorGrad = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_H);
    floorGrad.addColorStop(0, '#10101E');
    floorGrad.addColorStop(1, '#080812');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);

    // Conveyor belt
    ctx.fillStyle = '#18182E';
    ctx.fillRect(0, GROUND_Y, CANVAS_W, 20);
    const beltOff = menuScrollOffset % 28;
    for (let i = -1; i < CANVAS_W / 28 + 2; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#202038' : '#18182E';
        ctx.fillRect(i * 28 - beltOff, GROUND_Y, 14, 20);
    }
    // belt arrows
    ctx.fillStyle = '#2A2A48';
    const arrowOff = menuScrollOffset % 56;
    for (let i = -1; i < CANVAS_W / 56 + 2; i++) {
        const ax = i * 56 - arrowOff + 8;
        ctx.beginPath();
        ctx.moveTo(ax, GROUND_Y + 5);
        ctx.lineTo(ax + 10, GROUND_Y + 10);
        ctx.lineTo(ax, GROUND_Y + 15);
        ctx.closePath();
        ctx.fill();
    }

    // Hazard stripes
    const hazOff = menuScrollOffset % 36;
    for (let i = -1; i < CANVAS_W / 36 + 2; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#281600' : '#141000';
        ctx.fillRect(i * 36 - hazOff, GROUND_Y + 20, 18, 8);
    }

    // Floor tile grid
    ctx.strokeStyle = '#141422';
    ctx.lineWidth = 1;
    const ftOff = menuScrollOffset % 80;
    for (let i = -1; i < CANVAS_W / 80 + 2; i++) {
        ctx.strokeRect(i * 80 - ftOff, GROUND_Y + 28, 80, 28);
    }
}

function drawMenuScientist(x, y, variant) {
    const sc = 0.68 + variant * 0.06;
    const walk = Math.sin(menuScrollOffset * 0.11 + variant * 2.1);
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#080818';
    // torso
    ctx.fillRect(-9 * sc, -52 * sc, 18 * sc, 24 * sc);
    // head
    ctx.beginPath();
    ctx.arc(0, -60 * sc, 9 * sc, 0, Math.PI * 2);
    ctx.fill();
    // legs
    ctx.fillRect(-7 * sc, -28 * sc, 6 * sc, (20 + walk * 8) * sc);
    ctx.fillRect(1 * sc, -28 * sc, 6 * sc, (20 - walk * 8) * sc);
    // coat highlight
    ctx.fillStyle = '#111128';
    ctx.fillRect(-7 * sc, -50 * sc, 14 * sc, 20 * sc);
    ctx.restore();
}

function drawMenu() {
    ctx.save();
    ctx.textAlign = 'center';

    // Title
    ctx.shadowBlur = 45;
    ctx.shadowColor = '#FF4400';
    ctx.fillStyle = '#FF2200';
    ctx.font = 'bold 74px Arial';
    ctx.fillText('SPICY RIDE', CANVAS_W / 2, 175);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FF9900';
    ctx.font = 'bold 26px Arial';
    ctx.fillText('🌶  Buldak Edition  🌶', CANVAS_W / 2, 218);

    // Option boxes
    const boxes = [
        { label: '1 PLAYER',  sub: 'W  to fly',       x: CANVAS_W / 2 - 160, color: '#3355CC', selColor: 'rgba(51,85,204,0.75)',  idx: 0 },
        { label: '2 PLAYERS', sub: 'W  +  ↑  to fly', x: CANVAS_W / 2 + 20,  color: '#CC3333', selColor: 'rgba(204,51,51,0.75)',   idx: 1 },
    ];
    const optY = 290, optW = 140, optH = 76;

    boxes.forEach(b => {
        const sel = menuSelection === b.idx;
        ctx.fillStyle = sel ? b.selColor : 'rgba(15,15,35,0.65)';
        ctx.strokeStyle = sel ? b.color : '#2A2A50';
        ctx.lineWidth = sel ? 3 : 1.5;
        roundRect(ctx, b.x, optY, optW, optH, 10);
        ctx.fill();
        ctx.stroke();

        if (sel) { ctx.shadowBlur = 18; ctx.shadowColor = b.color; }
        ctx.fillStyle = sel ? '#FFFFFF' : '#888899';
        ctx.font = `bold ${sel ? 22 : 18}px Arial`;
        ctx.fillText(b.label, b.x + optW / 2, optY + 33);
        ctx.font = `${sel ? 14 : 12}px Arial`;
        ctx.fillStyle = sel ? '#CCDDFF' : '#555568';
        ctx.fillText(b.sub, b.x + optW / 2, optY + 56);
        ctx.shadowBlur = 0;
    });

    // Nav hint
    ctx.fillStyle = 'rgba(200,200,220,0.5)';
    ctx.font = '13px Arial';
    ctx.fillText('← → to select', CANVAS_W / 2, optY + optH + 26);

    // Blinking PRESS ENTER
    const blink = Math.sin(frameCount * 0.09) > 0;
    ctx.fillStyle = blink ? '#FFD700' : '#FF8800';
    ctx.font = 'bold 19px Arial';
    ctx.shadowBlur = 10;
    ctx.shadowColor = blink ? '#FFD700' : '#FF4400';
    ctx.fillText('PRESS  ENTER  TO  START', CANVAS_W / 2, optY + optH + 58);
    ctx.shadowBlur = 0;

    ctx.restore();
}

// ─── Main Game Loop ───────────────────────────────────────────────────────────
function loop() {
    frameCount++;

    if (gameState === STATE.MENU) {
        drawMenuBackground();
        drawMenu();
    } else if (gameState === STATE.INTRO) {
        updateIntro();
        drawIntro();
        drawMusicPrompt();
    } else if (gameState === STATE.PLAYING) {
        // scroll
        scrollOffset += scrollSpeed;
        scrollSpeed += 0.0015;
        distanceScore = Math.floor(scrollOffset / 60);

        updatePlayer(player, p1Thrusting);
        if (playerCount === 2) updatePlayer(player2, p2Thrusting);
        updateRespawn(player);
        if (playerCount === 2) updateRespawn(player2);
        updateGroundFire();

        // obstacle & coin spawning
        nextObstacleIn--;
        if (nextObstacleIn <= 0) {
            const rand = Math.random();
            if (rand < 0.55) spawnObstacle();
            else spawnCoins();
            nextObstacleIn = 80 + Math.floor(Math.random() * 120);
        }

        // ramen spawning
        nextRamenIn--;
        if (nextRamenIn <= 0) {
            spawnRamen();
            nextRamenIn = 200 + Math.floor(Math.random() * 180);
        }

        nextSauceIn--;
        if (nextSauceIn <= 0) {
            spawnSauce();
            nextSauceIn = 600 + Math.floor(Math.random() * 400);
        }

        nextPepperIn--;
        if (nextPepperIn <= 0) {
            spawnPepper();
            nextPepperIn = 900 + Math.floor(Math.random() * 600);
        }

        updateObstacles();
        updateCoins();
        updateRamens();
        updateSauces();
        updatePeppers();
        checkCollisions();

        particles = particles.filter(p => { p.update(); return !p.dead; });

        renderFullScreen();
        drawAdminOverlay();
        drawMusicPrompt();
        hudPromptAlpha -= 0.005;

    } else if (gameState === STATE.DEAD) {
        scrollOffset += scrollSpeed * 0.3;
        updateDead();

        renderFullScreenDead();
        drawGameOver();
        drawMusicPrompt();
    }

    requestAnimationFrame(loop);
}

// ─── Start ────────────────────────────────────────────────────────────────────
loop();
