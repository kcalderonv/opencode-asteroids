'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

// Power-ups
const POWERUP_CHANCE = 0.20;  // prob. de soltar un power-up al destruir un asteroide
const POWERUP_TTL    = 10;    // segundos que un power-up permanece en el campo
const BOOST_DURATION = 5;     // duración del efecto Velocidad (s)
const BOOST_MULT     = 2;     // multiplicador de empuje del efecto Velocidad
const POWERUP_COLOR  = '#7dff5f';  // verde lima: color del efecto Velocidad
const POWERUP_RGB    = '125, 255, 95';  // mismo color en formato r,g,b (estela, llama)
const TRIPLE_DURATION = 5;         // duración del efecto Triple disparo (s)
const TRIPLE_COLOR    = '#5fd4ff'; // cian: color del efecto Triple
const TRIPLE_RGB      = '95, 212, 255';
const TRIPLE_SPREAD   = 9;         // separación perpendicular entre las 3 balas (px)

// Estrella fugaz
const STAR_SPEED        = 200;              // px/s (frente a 32/55/85 de los asteroides)
const STAR_TTL          = 8;                // segundos antes de desvanecerse
const STAR_POINTS       = 150;
const STAR_INTERVAL_MIN = 12;               // s entre apariciones
const STAR_INTERVAL_MAX = 20;               // s entre apariciones
const STAR_COLOR        = '#ffef9c';        // contorno cálido
const STAR_RGB          = '255, 239, 156';  // mismo color para el rastro

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.points = POINTS[size];
    this.color  = '#fff';
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = this.color;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Estrella fugaz ────────────────────────────────────────────────────────────
class ShootingStar extends Asteroid {
  constructor(x, y, vx, vy) {
    super(x, y, 2);              // tamaño medio: reutiliza polígono/radius/verts
    this.isShootingStar = true;
    this.points  = STAR_POINTS;
    this.color   = STAR_COLOR;
    this.vx      = vx;           // velocidad dirigida (sobreescribe la aleatoria)
    this.vy      = vy;
    this.rotSpeed *= 2;
    this.ttl     = STAR_TTL;
  }

  update(dt) {
    super.update(dt);            // wrap toroidal + rotación
    this.ttl -= dt;
    if (this.ttl <= 0) {
      this.dead = true;
      explode(this.x, this.y, 6);
      return;
    }
    // Rastro brillante (reutiliza Particle)
    particles.push(new Particle(this.x, this.y, {
      rgb: STAR_RGB, speedMin: 5, speedMax: 25, lifeMin: 0.15, lifeMax: 0.4,
    }));
  }

  split() { return []; }         // nunca se parte

  draw() {
    // Parpadeo de aviso cuando está por expirar
    if (this.ttl < 2 && Math.floor(this.ttl * 8) % 2 === 0) return;
    super.draw();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.speedBoost    = 0;
    this.tripleShot    = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.speedBoost    > 0) this.speedBoost    -= dt;
    if (this.tripleShot    > 0) this.tripleShot    -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = 260;  // px/s²
    const DRAG   = 0.987;
    const thrust = THRUST * (this.speedBoost > 0 ? BOOST_MULT : 1);

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * thrust * dt;
      this.vy += Math.sin(this.angle) * thrust * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);

    // Estela densa mientras el boost está activo
    const spd = Math.hypot(this.vx, this.vy);
    if (this.speedBoost > 0 && spd > 30) {
      const nx = this.vx / spd;
      const ny = this.vy / spd;
      particles.push(new Particle(this.x - nx * 12, this.y - ny * 12, {
        rgb: POWERUP_RGB, speedMin: 5, speedMax: 30, lifeMin: 0.2, lifeMax: 0.5,
      }));
    }
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    // Triple: tres balas paralelas, desplazadas perpendicularmente al rumbo
    const px = -Math.sin(this.angle);
    const py =  Math.cos(this.angle);
    const offs = this.tripleShot > 0 ? [-TRIPLE_SPREAD, 0, TRIPLE_SPREAD] : [0];
    return offs.map(o => new Bullet(ox + px * o, oy + py * o, this.angle));
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    const boosted = this.speedBoost > 0;
    const triple  = this.tripleShot > 0;
    ctx.strokeStyle = boosted ? POWERUP_COLOR : (triple ? TRIPLE_COLOR : '#fff');
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo( 20,  0);   // nariz
    ctx.lineTo(-12, -9);   // ala izquierda
    ctx.lineTo( -7,  0);   // muesca trasera
    ctx.lineTo(-12,  9);   // ala derecha
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = boosted
        ? `rgba(${POWERUP_RGB}, 0.85)`
        : triple ? `rgba(${TRIPLE_RGB}, 0.85)` : 'rgba(255, 130, 0, 0.85)';
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión y estela) ───────────────────────────────────────────
class Particle {
  constructor(x, y, opts = {}) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(opts.speedMin ?? 30, opts.speedMax ?? 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(opts.lifeMin ?? 0.4, opts.lifeMax ?? 1.1);
    this.ttl  = this.life;
    this.rgb  = opts.rgb ?? '255,255,255';
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(${this.rgb},${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── PowerUp ───────────────────────────────────────────────────────────────────
class PowerUp {
  constructor(x, y, type = 'speed') {
    this.x      = x;
    this.y      = y;
    this.type   = type;
    this.radius = 12;
    this.dead   = false;
    this.ttl    = POWERUP_TTL;

    const angle = rand(0, Math.PI * 2);
    const speed = rand(20, 50);
    this.vx  = Math.cos(angle) * speed;
    this.vy  = Math.sin(angle) * speed;
    this.rot = rand(0, Math.PI * 2);
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += 2 * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Parpadeo cuando está por expirar
    if (this.ttl < 2 && Math.floor(this.ttl * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = this.type === 'triple' ? TRIPLE_COLOR : POWERUP_COLOR;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    if (this.type === 'triple') {
      // Triángulo (apunta al morro de la nave) con tres rayas paralelas
      ctx.beginPath();
      ctx.moveTo( 0, -this.radius);
      ctx.lineTo( this.radius * 0.87,  this.radius * 0.5);
      ctx.lineTo(-this.radius * 0.87,  this.radius * 0.5);
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      for (let i = -1; i <= 1; i++) {
        ctx.moveTo(i * 4, -2);
        ctx.lineTo(i * 4,  4);
      }
      ctx.stroke();
    } else {
      // Rombo
      ctx.beginPath();
      ctx.moveTo( 0, -this.radius);
      ctx.lineTo( this.radius, 0);
      ctx.lineTo( 0,  this.radius);
      ctx.lineTo(-this.radius, 0);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerUps;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let starTimer;  // cuenta atrás para la próxima estrella fugaz

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

const nextStarDelay = () => rand(STAR_INTERVAL_MIN, STAR_INTERVAL_MAX);

function spawnShootingStar() {
  const edge = randInt(0, 3);
  const t = rand(0.15, 0.85);
  let x, y, tx, ty;
  if (edge === 0)      { x = W * t;   y = 0;      tx = W * (1 - t); ty = H + 20; }    // arriba → abajo
  else if (edge === 1) { x = W;       y = H * t;  tx = -20;         ty = H * (1 - t); } // derecha → izquierda
  else if (edge === 2) { x = W * t;   y = H;      tx = W * (1 - t); ty = -20; }        // abajo → arriba
  else                 { x = 0;       y = H * t;  tx = W + 20;      ty = H * (1 - t); } // izquierda → derecha
  const angle = Math.atan2(ty - y, tx - x);
  asteroids.push(new ShootingStar(x, y, Math.cos(angle) * STAR_SPEED, Math.sin(angle) * STAR_SPEED));
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerUps  = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  starTimer = nextStarDelay();
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerUps  = [];
  asteroids = [];   // descarta estrellas fugaces sobrantes del nivel anterior
  ship.reset();
  starTimer = nextStarDelay();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  // Estrella fugaz
  starTimer -= dt;
  if (starTimer <= 0) { spawnShootingStar(); starTimer = nextStarDelay(); }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerUps.forEach(p => p.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerUps  = powerUps.filter(p => !p.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += a.points;
        explode(a.x, a.y, a.size * 5);
        if (Math.random() < POWERUP_CHANCE)
          powerUps.push(new PowerUp(a.x, a.y, Math.random() < 0.5 ? 'speed' : 'triple'));
        newAsteroids.push(...a.split());
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        killShip();
        break;
      }
    }
  }

  // Nave vs power-up
  if (!ship.dead) {
    for (const p of powerUps) {
      if (dist(ship, p) < ship.radius + p.radius) {
        if (p.type === 'speed') ship.speedBoost = BOOST_DURATION;
        else if (p.type === 'triple') ship.tripleShot = TRIPLE_DURATION;
        p.dead = true;
      }
    }
    powerUps = powerUps.filter(p => !p.dead);
  }

  // Nivel completado (las estrellas fugaces no bloquean el avance)
  if (!asteroids.some(a => !a.isShootingStar)) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo( 9,  0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-3,  0);
  ctx.lineTo(-6,  5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  // Efectos activos, apilados para que puedan convivir
  if (!ship.dead) {
    ctx.textAlign = 'left';
    let fxY = 48;
    if (ship.speedBoost > 0) {
      ctx.fillStyle = POWERUP_COLOR;
      ctx.fillText(`VELOCIDAD  ${ship.speedBoost.toFixed(1)}s`, 14, fxY);
      fxY += 22;
    }
    if (ship.tripleShot > 0) {
      ctx.fillStyle = TRIPLE_COLOR;
      ctx.fillText(`TRIPLE  ${ship.tripleShot.toFixed(1)}s`, 14, fxY);
    }
    ctx.fillStyle = '#fff';
  }

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  powerUps.forEach(p => p.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
