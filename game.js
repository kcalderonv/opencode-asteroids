'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 1280;
const H = 720;

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

// Escudo
const SHIELD_DURATION = 8;                  // segundos que protege la nave
const SHIELD_RADIUS   = 24;                 // radio visual de la burbuja
const SHIELD_COLOR    = '#4f8bff';          // azul: distinto del cian de Triple
const SHIELD_RGB      = '79, 139, 255';

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

// ── Skins de la nave ──────────────────────────────────────────────────────────
// Una skin es sólo datos: el casco se traza desde `hull` (puntos en espacio
// local, con la nave apuntando a +x). `nose` es dónde nace la bala, `tail` dónde
// arranca la llama y `glow` un halo opcional. La hitbox (radius) no cambia.
const SKINS = [
  {
    id: 'clasica', name: 'CLÁSICA', color: '#fff',
    flame: '255, 130, 0', nose: 20, tail: -8, glow: 0,
    hull: [[20, 0], [-12, -9], [-7, 0], [-12, 9]],
  },
  {
    id: 'dardo', name: 'DARDO', color: '#7fdfff',
    flame: '120, 220, 255', nose: 22, tail: -10, glow: 0,
    hull: [[22, 0], [-10, -8], [-5, 0], [-10, 8]],
  },
  {
    id: 'delta', name: 'DELTA', color: '#ffcf5f',
    flame: '255, 190, 90', nose: 20, tail: -8, glow: 0,
    hull: [[20, 0], [-2, -3], [-12, -10], [-8, -3], [-8, 3], [-12, 10], [-2, 3]],
  },
  {
    id: 'aguja', name: 'AGUJA', color: '#c9a4ff',
    flame: '200, 160, 255', nose: 23, tail: -9, glow: 8,
    hull: [[23, 0], [-9, -4], [-9, 4]],
  },
  {
    id: 'ovni', name: 'OVNI', color: '#ff8fd0',
    flame: '255, 140, 210', nose: 11, tail: -10, glow: 0,
    hull: [[11, 0], [6, -7], [-4, -13], [-11, -10], [-11, 10], [-4, 13], [6, 7]],
  },
];

const SKIN_STORAGE_KEY = 'asteroids.skin';  // se guarda el `id`, no el índice
const SKIN_TOAST_TIME  = 1.6;               // segundos visible el aviso de skin
const LIFE_ICON_SCALE  = 0.45;              // iconos de vida, a escala del casco

let skinIndex = 0;
let skinToast = 0;

const currentSkin = () => SKINS[skinIndex];

function loadSkin() {
  try {
    const i = SKINS.findIndex(s => s.id === localStorage.getItem(SKIN_STORAGE_KEY));
    if (i >= 0) skinIndex = i;
  } catch (e) { /* localStorage puede estar bloqueado (file://) */ }
}

function saveSkin() {
  try {
    localStorage.setItem(SKIN_STORAGE_KEY, SKINS[skinIndex].id);
  } catch (e) { /* ídem */ }
}

function traceHull(skin, scale) {
  ctx.beginPath();
  skin.hull.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x * scale, y * scale);
    else         ctx.lineTo(x * scale, y * scale);
  });
  ctx.closePath();
}

// Dibuja el casco en el espacio local del llamador (ya trasladado/rotado).
function drawHull(skin, scale = 1, lineWidth = 1.5, color = skin.color) {
  traceHull(skin, scale);
  ctx.strokeStyle = color;
  ctx.lineWidth   = lineWidth;
  ctx.lineJoin    = 'round';
  if (skin.glow > 0) {
    ctx.save();
    ctx.shadowBlur  = skin.glow * scale;
    ctx.shadowColor = color;
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.stroke();
  }
}

function handleSkinInput(dt) {
  if (skinToast > 0) skinToast -= dt;
  if (!pressed('KeyS')) return;
  skinIndex = (skinIndex + 1) % SKINS.length;
  saveSkin();
  skinToast = SKIN_TOAST_TIME;
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
    this.shield        = 0;
    this.tripleShot    = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.speedBoost    > 0) this.speedBoost    -= dt;
    if (this.shield        > 0) this.shield        -= dt;
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
    const NOSE = currentSkin().nose;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    // Triple: tres balas paralelas, desplazadas perpendicularmente al rumbo
    const px = -Math.sin(this.angle);
    const py =  Math.cos(this.angle);
    const offs = this.tripleShot > 0 ? [-TRIPLE_SPREAD, 0, TRIPLE_SPREAD] : [0];
    return offs.map(o => new Bullet(ox + px * o, oy + py * o, this.angle));
  }

  // Burbuja de energía alrededor de la nave (coordenadas de mundo: no rota)
  drawShield() {
    const pulse = (0.4 + 0.25 * Math.sin(this.shield * 8)).toFixed(2);
    ctx.save();
    ctx.strokeStyle = `rgba(${SHIELD_RGB}, ${pulse})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(this.x, this.y, SHIELD_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${SHIELD_RGB}, 0.07)`;
    ctx.fill();
    ctx.stroke();

    // Arco que marca el tiempo restante, en sentido horario
    ctx.strokeStyle = SHIELD_COLOR;
    ctx.beginPath();
    ctx.arc(this.x, this.y, SHIELD_RADIUS + 4,
            -Math.PI / 2,
            -Math.PI / 2 + Math.PI * 2 * (this.shield / SHIELD_DURATION));
    ctx.stroke();
    ctx.restore();
  }

  draw() {
    if (this.dead) return;

    // La burbuja del escudo se dibuja siempre, incluso mientras la nave parpadea
    if (this.shield > 0) this.drawShield();

    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    const skin    = currentSkin();
    const boosted = this.speedBoost > 0;
    const triple  = this.tripleShot > 0;

    // El boost manda sobre la triple y la skin para no perder el feedback de gameplay
    drawHull(skin, 1, 1.5, boosted ? POWERUP_COLOR : (triple ? TRIPLE_COLOR : skin.color));

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      const t = skin.tail;
      ctx.beginPath();
      ctx.moveTo(t, -4);
      ctx.lineTo(t - rand(6, 14), 0);
      ctx.lineTo(t,  4);
      ctx.strokeStyle = boosted
        ? `rgba(${POWERUP_RGB}, 0.85)`
        : triple ? `rgba(${TRIPLE_RGB}, 0.85)` : `rgba(${skin.flame}, 0.85)`;
      ctx.lineWidth   = 1.5;
      ctx.lineJoin    = 'round';
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
    ctx.strokeStyle = this.type === 'shield' ? SHIELD_COLOR
                    : this.type === 'triple' ? TRIPLE_COLOR
                    : POWERUP_COLOR;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    if (this.type === 'shield') {
      // Hexágono
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a  = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const px = Math.cos(a) * this.radius;
        const py = Math.sin(a) * this.radius;
        if (i === 0) ctx.moveTo(px, py);
        else         ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    } else if (this.type === 'triple') {
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

function explode(x, y, count = 8, rgb = '255,255,255') {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y, { rgb }));
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
  handleSkinInput(dt);   // siempre disponible, en cualquier estado

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
          powerUps.push(new PowerUp(a.x, a.y, ['speed', 'shield', 'triple'][randInt(0, 2)]));
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
        if (ship.shield > 0) {
          // El escudo absorbe el impacto: el asteroide se desintegra sin dañar la nave
          a.dead = true;
          explode(a.x, a.y, a.size * 5, SHIELD_RGB);
        } else {
          killShip();
          break;
        }
      }
    }
    asteroids = asteroids.filter(a => !a.dead);
  }

  // Nave vs power-up
  if (!ship.dead) {
    for (const p of powerUps) {
      if (dist(ship, p) < ship.radius + p.radius) {
        if (p.type === 'speed')  ship.speedBoost = BOOST_DURATION;
        if (p.type === 'shield') ship.shield     = SHIELD_DURATION;  // recoger de nuevo refresca
        if (p.type === 'triple') ship.tripleShot = TRIPLE_DURATION;  // ídem
        explode(p.x, p.y, 6,
                p.type === 'shield' ? SHIELD_RGB
              : p.type === 'triple' ? TRIPLE_RGB
              : POWERUP_RGB);
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
  drawHull(currentSkin(), LIFE_ICON_SCALE, 1.2);
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
      fxY += 22;
    }
    if (ship.shield > 0) {
      ctx.fillStyle = SHIELD_COLOR;
      ctx.fillText(`ESCUDO  ${ship.shield.toFixed(1)}s`, 14, fxY);
    }
    ctx.fillStyle = '#fff';
  }

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  // Aviso de skin al cambiarla
  if (skinToast > 0) {
    ctx.textAlign = 'left';
    ctx.font      = '13px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(`SKIN: ${currentSkin().name}   [S]`, 14, H - 14);
    ctx.font      = '15px monospace';
    ctx.fillStyle = '#fff';
  }
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
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR   —   S: CAMBIAR SKIN`);
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

loadSkin();
initGame();
requestAnimationFrame(loop);
