const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const menu = document.getElementById("menu");
const levelGrid = document.getElementById("levelGrid");
const gameView = document.getElementById("gameView");
const message = document.getElementById("message");
const messageTitle = document.getElementById("messageTitle");
const messageText = document.getElementById("messageText");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const levelEl = document.getElementById("level");
const weaponEl = document.getElementById("weapon");
const progressFill = document.getElementById("progressFill");
const healthFill = document.getElementById("healthFill");
const bossPanel = document.getElementById("bossPanel");
const bossFill = document.getElementById("bossFill");
const pauseBtn = document.getElementById("pauseBtn");
const menuBtn = document.getElementById("menuBtn");
const restartBtn = document.getElementById("restartBtn");
const nextStageBtn = document.getElementById("nextStageBtn");
const backHome = document.getElementById("backHome");
const rulesOpen = document.getElementById("rulesOpen");
const rulesClose = document.getElementById("rulesClose");
const rulesModal = document.getElementById("rulesModal");

const playerImg = new Image();
playerImg.src = "assets/player_fighter.png";

const W = canvas.width;
const H = canvas.height;
const keys = new Set();

const AIRPLANE_SAVE_KEY = "airplane_level_progress_v1";
const stages = [
  { id: 1, name: "第一关", desc: "训练空域", enemyRate: 820, enemySpeed: 1.18, bulletRate: 1900, targetScore: 2400, lives: 5 },
  { id: 2, name: "第二关", desc: "云层遭遇", enemyRate: 720, enemySpeed: 1.22, bulletRate: 1700, targetScore: 3200, lives: 5 },
  { id: 3, name: "第三关", desc: "密集巡逻", enemyRate: 620, enemySpeed: 1.28, bulletRate: 1500, targetScore: 4300, lives: 5 },
  { id: 4, name: "第四关", desc: "火力封锁", enemyRate: 540, enemySpeed: 1.36, bulletRate: 1320, targetScore: 5600, lives: 5 },
  { id: 5, name: "第五关", desc: "Boss 决战", enemyRate: 1200, enemySpeed: 1.65, bulletRate: 1250, targetScore: 0, lives: 5, boss: true, bossHp: 90 },
  { id: 6, name: "第六关", desc: "第二大关", enemyRate: 660, enemySpeed: 1.34, bulletRate: 1500, targetScore: 4200, lives: 5 },
  { id: 7, name: "第七关", desc: "密集空域", enemyRate: 590, enemySpeed: 1.4, bulletRate: 1370, targetScore: 5200, lives: 5 },
  { id: 8, name: "第八关", desc: "红翼突袭", enemyRate: 530, enemySpeed: 1.48, bulletRate: 1240, targetScore: 6400, lives: 5 },
  { id: 9, name: "第九关", desc: "火力压制", enemyRate: 480, enemySpeed: 1.56, bulletRate: 1120, targetScore: 7800, lives: 5 },
  { id: 10, name: "第十关", desc: "Boss 决战", enemyRate: 1050, enemySpeed: 1.75, bulletRate: 1120, targetScore: 0, lives: 5, boss: true, bossHp: 130 },
];

let currentStage = stages[0];
let config = stages[0];
let progress = loadProgress();
let player;
let bullets = [];
let enemies = [];
let enemyBullets = [];
let powerups = [];
let particles = [];
let stars = [];
let boss = null;
let bossDefeated = false;
let bossExplosionTimer = 0;
let score = 0;
let lives = 5;
let level = 1;
let weapon = 1;
let weaponTimer = 0;
let lastTime = 0;
let enemyTimer = 0;
let shootTimer = 0;
let enemyShotTimer = 0;
let bossShotTimer = 0;
let powerupTimer = 0;
let animationId = null;
let playing = false;
let paused = false;
let dragging = false;

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(AIRPLANE_SAVE_KEY));
    return {
      unlocked: Math.max(1, Math.min(stages.length, saved?.unlocked || 1)),
      stars: saved?.stars || {},
    };
  } catch {
    return { unlocked: 1, stars: {} };
  }
}

function saveProgress() {
  localStorage.setItem(AIRPLANE_SAVE_KEY, JSON.stringify(progress));
}

function renderLevelCards() {
  levelGrid.innerHTML = "";
  for (const stage of stages) {
    const unlocked = stage.id <= progress.unlocked;
    const starCount = progress.stars[stage.id] || 0;
    const card = document.createElement("button");
    card.className = "level-card" + (unlocked ? "" : " locked");
    card.disabled = !unlocked;
    card.innerHTML = `
      <div class="level-icon"><i class="fas ${unlocked ? (stage.boss ? "fa-skull" : "fa-fighter-jet") : "fa-lock"}"></i></div>
      <div class="level-name">${stage.name}</div>
      <div class="level-desc">${stage.desc}｜${stage.boss ? "击败 Boss" : `目标 ${stage.targetScore} 分`}</div>
      <div class="level-stars">${renderStars(starCount)}</div>
    `;
    if (unlocked) {
      card.addEventListener("click", () => startGame(stage.id));
    }
    levelGrid.appendChild(card);
  }
}

function renderStars(count) {
  return [1, 2, 3].map(i => i <= count ? "★" : "☆").join("");
}

function getChapter(stageId = currentStage.id) {
  return Math.floor((stageId - 1) / 5) + 1;
}

function getStageStep(stageId = currentStage.id) {
  return ((stageId - 1) % 5) + 1;
}

function createStars() {
  stars = Array.from({ length: 90 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.8 + 0.4,
    speed: Math.random() * 1.5 + 0.5,
    alpha: Math.random() * 0.5 + 0.35,
  }));
}

function resetGame(stageId = currentStage.id) {
  currentStage = stages.find(stage => stage.id === stageId) || stages[0];
  config = currentStage;
  player = {
    x: W / 2,
    y: H - 86,
    w: 70,
    h: 78,
    speed: 4.5,
    invincible: 1600,
  };
  bullets = [];
  enemies = [];
  enemyBullets = [];
  powerups = [];
  particles = [];
  boss = null;
  bossDefeated = false;
  bossExplosionTimer = 0;
  score = 0;
  lives = config.lives;
  level = config.id;
  weapon = 1;
  weaponTimer = 0;
  enemyTimer = 0;
  shootTimer = 0;
  enemyShotTimer = 0;
  bossShotTimer = 0;
  powerupTimer = 0;
  paused = false;
  playing = true;
  message.classList.remove("show");
  nextStageBtn.style.display = "none";
  pauseBtn.textContent = "暂停";
  if (config.boss) spawnBoss();
  updateHud();
}

function startGame(stageId) {
  menu.classList.add("hide");
  gameView.classList.add("show");
  resetGame(stageId);
  lastTime = performance.now();
  cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(loop);
}

function backToMenu() {
  playing = false;
  paused = false;
  cancelAnimationFrame(animationId);
  message.classList.remove("show");
  gameView.classList.remove("show");
  menu.classList.remove("hide");
  renderLevelCards();
}

function updateHud() {
  scoreEl.textContent = config.boss ? `${score} 分` : `${score} / ${config.targetScore}`;
  livesEl.textContent = `${Math.max(0, Math.round(lives / config.lives * 100))}%`;
  levelEl.textContent = level;
  weaponEl.textContent = weapon;
  healthFill.style.width = `${Math.max(0, Math.min(100, Math.round(lives / config.lives * 100)))}%`;
  if (config.boss && boss) {
    bossPanel.classList.add("show");
    bossFill.style.width = `${Math.max(0, Math.round(boss.hp / boss.maxHp * 100))}%`;
    progressFill.style.width = `${Math.max(0, Math.round((1 - boss.hp / boss.maxHp) * 100))}%`;
  } else {
    bossPanel.classList.remove("show");
    progressFill.style.width = `${Math.min(100, Math.round(score / config.targetScore * 100))}%`;
  }
}

function loop(now) {
  const dt = Math.min(32, now - lastTime);
  lastTime = now;
  if (playing && !paused) update(dt);
  draw();
  if (playing) animationId = requestAnimationFrame(loop);
}

function update(dt) {
  updateStars(dt);
  updatePlayer(dt);
  updateShooting(dt);
  updateBoss(dt);
  updateEnemies(dt);
  updateEnemyBullets(dt);
  updatePowerups(dt);
  updateParticles(dt);
  handleCollisions();
  if (config.boss && bossDefeated) {
    bossExplosionTimer -= dt;
    updateHud();
    if (bossExplosionTimer <= 0) completeStage();
    return;
  }
  if (!config.boss && score >= config.targetScore) {
    completeStage();
    return;
  }
  if (weaponTimer > 0) {
    weaponTimer -= dt;
    if (weaponTimer <= 0) weapon = 1;
  }
  updateHud();
}

function updateStars(dt) {
  for (const star of stars) {
    star.y += star.speed * dt / 16;
    if (star.y > H) {
      star.y = -4;
      star.x = Math.random() * W;
    }
  }
}

function updatePlayer(dt) {
  const step = player.speed * dt / 16;
  if (keys.has("ArrowLeft") || keys.has("a")) player.x -= step;
  if (keys.has("ArrowRight") || keys.has("d")) player.x += step;
  if (keys.has("ArrowUp") || keys.has("w")) player.y -= step;
  if (keys.has("ArrowDown") || keys.has("s")) player.y += step;
  player.x = Math.max(player.w / 2, Math.min(W - player.w / 2, player.x));
  player.y = Math.max(80, Math.min(H - player.h / 2, player.y));
  if (player.invincible > 0) player.invincible -= dt;
}

function updateShooting(dt) {
  shootTimer += dt;
  const interval = weapon >= 3 ? 150 : weapon === 2 ? 185 : 230;
  if (shootTimer < interval) return;
  shootTimer = 0;

  if (weapon === 1) {
    bullets.push(makeBullet(player.x, player.y - 42, 0, -8.2));
  } else if (weapon === 2) {
    bullets.push(makeBullet(player.x - 12, player.y - 40, -0.45, -8.4));
    bullets.push(makeBullet(player.x + 12, player.y - 40, 0.45, -8.4));
  } else {
    bullets.push(makeBullet(player.x, player.y - 42, 0, -8.8));
    bullets.push(makeBullet(player.x - 20, player.y - 34, -0.9, -8.2));
    bullets.push(makeBullet(player.x + 20, player.y - 34, 0.9, -8.2));
  }
}

function makeBullet(x, y, vx, vy) {
  return { x, y, vx, vy, r: 4, damage: 1 };
}

function spawnBoss() {
  boss = {
    x: W / 2,
    y: 96,
    w: 150,
    h: 86,
    hp: config.bossHp,
    maxHp: config.bossHp,
    phase: 0,
    score: 1200 + currentStage.id * 180,
  };
}

function updateBoss(dt) {
  if (!boss || boss.hp <= 0) return;
  const chapter = getChapter();
  boss.phase += dt * 0.002;
  boss.x = W / 2 + Math.sin(boss.phase) * 120;
  boss.y = 96 + Math.sin(boss.phase * 0.7) * 18;

  bossShotTimer += dt;
  if (bossShotTimer > Math.max(610, config.bulletRate - (chapter - 1) * 95)) {
    bossShotTimer = 0;
    const firstBoss = currentStage.id === 5;
    const patterns = firstBoss ? [-0.55, 0, 0.55] : [-0.95, -0.48, 0, 0.48, 0.95];
    for (const vx of patterns) {
      enemyBullets.push({
        x: boss.x,
        y: boss.y + boss.h / 2 - 4,
        vx,
        vy: firstBoss ? 2.45 : 2.58 + (chapter - 1) * 0.16,
        r: 5,
      });
    }
    if (Math.random() < (firstBoss ? 0.3 : 0.55)) {
      const dx = player.x - boss.x;
      const dy = player.y - boss.y;
      const len = Math.hypot(dx, dy) || 1;
      enemyBullets.push({
        x: boss.x,
        y: boss.y + boss.h / 2,
        vx: dx / len * (firstBoss ? 2.65 : 2.86 + (chapter - 1) * 0.18),
        vy: dy / len * (firstBoss ? 2.65 : 2.86 + (chapter - 1) * 0.18),
        r: 7,
      });
    }
  }
}

function updateEnemies(dt) {
  enemyTimer += dt;
  const chapter = getChapter();
  const step = getStageStep();
  const interval = config.boss
    ? Math.max(950, config.enemyRate + 260)
    : Math.max(390, config.enemyRate - (step - 1) * 36 - (chapter - 1) * 58);
  if (enemyTimer > interval) {
    enemyTimer = 0;
    spawnEnemy();
  }

  for (const enemy of enemies) {
    enemy.y += enemy.speed * dt / 16;
    enemy.x += Math.sin(enemy.y * 0.025 + enemy.phase) * enemy.drift * dt / 16;
  }
  enemies = enemies.filter(enemy => enemy.y < H + 80 && enemy.hp > 0);

  enemyShotTimer += dt;
  if (enemyShotTimer > Math.max(720, config.bulletRate - (step - 1) * 55 - (chapter - 1) * 70)) {
    enemyShotTimer = 0;
    const shooters = enemies.filter(e => e.y > 30 && e.y < H * 0.55);
    if (shooters.length) {
      const enemy = shooters[Math.floor(Math.random() * shooters.length)];
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const len = Math.hypot(dx, dy) || 1;
      enemyBullets.push({
        x: enemy.x,
        y: enemy.y + 22,
        vx: dx / len * (2.25 + (step - 1) * 0.035 + (chapter - 1) * 0.055),
        vy: dy / len * (2.25 + (step - 1) * 0.035 + (chapter - 1) * 0.055),
        r: 5,
      });
    }
  }
}

function spawnEnemy() {
  const chapter = getChapter();
  const step = getStageStep();
  const elite = Math.random() < Math.min(0.52, 0.14 + (step - 1) * 0.07 + (chapter - 1) * 0.075);
  const enemyHp = elite
    ? 2 + Math.floor((step - 1) / 2) + Math.floor((chapter - 1) / 2)
    : 1 + Math.floor((chapter - 1) / 3);
  enemies.push({
    x: 42 + Math.random() * (W - 84),
    y: -50,
    w: elite ? 58 : 46,
    h: elite ? 48 : 38,
    hp: enemyHp,
    maxHp: enemyHp,
    speed: config.enemySpeed + Math.random() * 0.28 + (step - 1) * 0.025 + (chapter - 1) * 0.035,
    drift: Math.random() * 1.4,
    phase: Math.random() * Math.PI * 2,
    elite,
    score: elite ? 130 : 65,
  });
}

function updateEnemyBullets(dt) {
  for (const bullet of enemyBullets) {
    bullet.x += bullet.vx * dt / 16;
    bullet.y += bullet.vy * dt / 16;
  }
  enemyBullets = enemyBullets.filter(b => b.x > -20 && b.x < W + 20 && b.y > -20 && b.y < H + 20);
}

function updatePowerups(dt) {
  powerupTimer += dt;
  if (powerupTimer > 8200) {
    powerupTimer = 0;
    powerups.push({
      x: 40 + Math.random() * (W - 80),
      y: -30,
      r: 14,
      vy: 1.9,
      type: Math.random() < 0.84 ? "weapon" : "life",
      spin: 0,
    });
  }
  for (const item of powerups) {
    item.y += item.vy * dt / 16;
    item.spin += dt * 0.004;
  }
  powerups = powerups.filter(item => item.y < H + 30);
}

function updateParticles(dt) {
  for (const p of particles) {
    p.x += p.vx * dt / 16;
    p.y += p.vy * dt / 16;
    p.life -= dt;
    p.vy += 0.02 * dt / 16;
  }
  particles = particles.filter(p => p.life > 0);
}

function handleCollisions() {
  for (const bullet of bullets) {
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;
    for (const enemyBullet of enemyBullets) {
      if (enemyBullet.dead) continue;
      const hitDistance = bullet.r + enemyBullet.r + 3;
      if (Math.hypot(bullet.x - enemyBullet.x, bullet.y - enemyBullet.y) < hitDistance) {
        bullet.dead = true;
        enemyBullet.dead = true;
        spark((bullet.x + enemyBullet.x) / 2, (bullet.y + enemyBullet.y) / 2, "#ffffff", 8);
        break;
      }
    }
    if (bullet.dead) continue;
    if (boss && boss.hp > 0 && rectCircle(boss, bullet)) {
      boss.hp -= bullet.damage;
      bullet.dead = true;
      spark(bullet.x, bullet.y, "#7ee7ff", 5);
      if (boss.hp <= 0) {
        boss.hp = 0;
        score += boss.score;
        bossDefeated = true;
        bossExplosionTimer = 950;
        enemyBullets = [];
        bossExplosion(boss.x, boss.y);
      }
      continue;
    }
    for (const enemy of enemies) {
      if (enemy.hp <= 0) continue;
      if (rectCircle(enemy, bullet)) {
        enemy.hp -= bullet.damage;
        bullet.dead = true;
        spark(bullet.x, bullet.y, "#7ee7ff", 5);
        if (enemy.hp <= 0) {
          score += enemy.score;
          explode(enemy.x, enemy.y, enemy.elite ? 24 : 15);
        }
        break;
      }
    }
  }
  bullets = bullets.filter(b => !b.dead && b.y > -20 && b.x > -20 && b.x < W + 20);

  for (const enemy of enemies) {
    if (enemy.hp > 0 && player.invincible <= 0 && rectOverlap(player, enemy)) {
      damagePlayer();
      enemy.hp = 0;
      explode(enemy.x, enemy.y, 14);
    }
  }

  if (boss && boss.hp > 0 && player.invincible <= 0 && rectOverlap(player, boss)) {
    damagePlayer();
  }

  for (const bullet of enemyBullets) {
    if (player.invincible <= 0 && circlePlayer(bullet)) {
      bullet.dead = true;
      damagePlayer();
    }
  }
  enemyBullets = enemyBullets.filter(b => !b.dead);

  for (const item of powerups) {
    if (circlePlayer(item)) {
      item.dead = true;
      if (item.type === "life") {
        lives = Math.min(config.lives, lives + 1);
      } else {
        weapon = Math.min(3, weapon + 1);
        weaponTimer = 8500;
      }
      spark(item.x, item.y, item.type === "life" ? "#ff8fb3" : "#4ecdc4", 20);
    }
  }
  powerups = powerups.filter(item => !item.dead);
}

function damagePlayer() {
  lives--;
  player.invincible = 2200;
  spark(player.x, player.y, "#ff6b6b", 26);
  if (lives <= 0) endGame();
}

function endGame() {
  playing = false;
  updateHud();
  messageTitle.textContent = "游戏结束";
  messageText.textContent = config.boss
    ? `${currentStage.name} 失败。最终分数：${score}，Boss 剩余血量：${boss ? Math.max(0, boss.hp) : 0}。`
    : `${currentStage.name} 失败。最终分数：${score} / ${config.targetScore}。`;
  nextStageBtn.style.display = "none";
  message.classList.add("show");
}

function completeStage() {
  playing = false;
  updateHud();
  const earnedStars = getEarnedStars();
  const oldStars = progress.stars[currentStage.id] || 0;
  progress.stars[currentStage.id] = Math.max(oldStars, earnedStars);
  if (currentStage.id < stages.length) {
    progress.unlocked = Math.max(progress.unlocked, currentStage.id + 1);
  }
  saveProgress();

  messageTitle.textContent = "关卡完成";
  messageText.textContent = config.boss
    ? `${currentStage.name} 通关！成功击败 Boss，获得 ${renderStars(earnedStars)}，分数：${score}，剩余生命：${lives}。`
    : `${currentStage.name} 通关！获得 ${renderStars(earnedStars)}，分数：${score} / ${config.targetScore}，剩余生命：${lives}。`;
  nextStageBtn.style.display = currentStage.id < stages.length ? "inline-block" : "none";
  message.classList.add("show");
}

function getEarnedStars() {
  if (lives >= 4) return 3;
  if (lives >= 2) return 2;
  return 1;
}

function rectCircle(rect, circle) {
  const rx = Math.max(rect.x - rect.w / 2, Math.min(circle.x, rect.x + rect.w / 2));
  const ry = Math.max(rect.y - rect.h / 2, Math.min(circle.y, rect.y + rect.h / 2));
  return Math.hypot(circle.x - rx, circle.y - ry) < circle.r + 2;
}

function rectOverlap(a, b) {
  return Math.abs(a.x - b.x) < (a.w + b.w) * 0.28 && Math.abs(a.y - b.y) < (a.h + b.h) * 0.28;
}

function circlePlayer(circle) {
  return Math.hypot(circle.x - player.x, circle.y - player.y) < circle.r + 26;
}

function spark(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3 + 0.8;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: Math.random() * 2.6 + 1,
      color,
      life: 300 + Math.random() * 350,
    });
  }
}

function explode(x, y, count) {
  spark(x, y, "#ffb347", count);
  spark(x, y, "#ff6b6b", Math.floor(count * 0.6));
}

function bossExplosion(x, y) {
  explode(x, y, 64);
  const points = [
    [-48, -18], [48, -18], [-62, 18], [62, 18], [0, -36], [0, 34],
  ];
  for (const [dx, dy] of points) {
    setTimeout(() => explode(x + dx, y + dy, 22), Math.random() * 420);
  }
}

function draw() {
  drawBackground();
  drawBullets();
  drawBoss();
  drawEnemies();
  drawPowerups();
  drawPlayer();
  drawParticles();
  if (paused && playing) drawPause();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, "#0b5fb7");
  gradient.addColorStop(0.45, "#0b83d8");
  gradient.addColorStop(1, "#06477f");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = "#b8f3ff";
  ctx.lineWidth = 2;
  for (let y = -40; y < H + 60; y += 72) {
    const offset = (performance.now() * 0.035 + y) % 72;
    ctx.beginPath();
    ctx.moveTo(0, y + offset);
    for (let x = 0; x <= W; x += 40) {
      ctx.lineTo(x, y + offset + Math.sin((x + y) * 0.025) * 10);
    }
    ctx.stroke();
  }
  ctx.restore();

  for (const cloud of stars) {
    ctx.globalAlpha = cloud.alpha * 0.45;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(cloud.x, cloud.y, cloud.r * 9, cloud.r * 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawBullets() {
  ctx.save();
  for (const bullet of bullets) {
    ctx.fillStyle = "#82f7ff";
    roundRect(bullet.x - 3, bullet.y - 14, 6, 24, 4);
    ctx.fill();
    ctx.fillStyle = "rgba(130,247,255,0.28)";
    roundRect(bullet.x - 8, bullet.y - 8, 16, 28, 8);
    ctx.fill();
  }
  for (const bullet of enemyBullets) {
    ctx.fillStyle = "#ff6b6b";
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawEnemies() {
  for (const enemy of enemies) {
    drawEnemyPlane(enemy);
    if (enemy.maxHp > 1) {
      ctx.fillStyle = "rgba(255,255,255,0.24)";
      ctx.fillRect(enemy.x - 24, enemy.y - enemy.h / 2 - 10, 48, 4);
      ctx.fillStyle = "#ff6b6b";
      ctx.fillRect(enemy.x - 24, enemy.y - enemy.h / 2 - 10, 48 * enemy.hp / enemy.maxHp, 4);
    }
  }
}

function drawBoss() {
  if (!boss || boss.hp <= 0) return;
  ctx.save();
  ctx.translate(boss.x, boss.y);

  const hpPercent = Math.max(0, boss.hp / boss.maxHp);
  const barWidth = 132;
  const barY = -boss.h / 2 - 30;
  ctx.fillStyle = "rgba(0,0,0,0.48)";
  roundRect(-barWidth / 2, barY, barWidth, 12, 6);
  ctx.fill();
  ctx.fillStyle = "#ff4d6d";
  roundRect(-barWidth / 2, barY, barWidth * hpPercent, 12, 6);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.65)";
  ctx.lineWidth = 1;
  roundRect(-barWidth / 2, barY, barWidth, 12, 6);
  ctx.stroke();
  ctx.fillStyle = "white";
  ctx.font = "bold 12px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`${Math.max(0, Math.ceil(boss.hp))} / ${boss.maxHp}`, 0, barY - 5);

  ctx.fillStyle = "#3b1f4d";
  ctx.strokeStyle = "rgba(255,255,255,0.34)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, boss.h / 2);
  ctx.lineTo(-boss.w / 2, 6);
  ctx.lineTo(-58, -12);
  ctx.lineTo(-30, -28);
  ctx.lineTo(-16, -boss.h / 2);
  ctx.lineTo(16, -boss.h / 2);
  ctx.lineTo(30, -28);
  ctx.lineTo(58, -12);
  ctx.lineTo(boss.w / 2, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#ff4d6d";
  ctx.beginPath();
  ctx.ellipse(0, -8, 18, 28, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffd166";
  ctx.fillRect(-46, 12, 18, 8);
  ctx.fillRect(28, 12, 18, 8);
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "center";
  ctx.fillText("BOSS", 0, 8);
  ctx.restore();
}

function drawEnemyPlane(enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.fillStyle = enemy.elite ? "#8b2f5a" : "#7a8496";
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, enemy.h / 2);
  ctx.lineTo(-enemy.w / 2, -4);
  ctx.lineTo(-14, -8);
  ctx.lineTo(-8, -enemy.h / 2);
  ctx.lineTo(8, -enemy.h / 2);
  ctx.lineTo(14, -8);
  ctx.lineTo(enemy.w / 2, -4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffcf6b";
  ctx.fillRect(-5, -enemy.h / 2 + 8, 10, 16);
  ctx.restore();
}

function drawPlayer() {
  if (!player) return;
  ctx.save();
  ctx.translate(player.x, player.y);
  if (player.invincible > 0 && Math.floor(performance.now() / 90) % 2 === 0) ctx.globalAlpha = 0.55;
  if (playerImg.complete) {
    ctx.drawImage(playerImg, -player.w / 2, -player.h / 2, player.w, player.h);
  } else {
    ctx.fillStyle = "#285f9f";
    ctx.beginPath();
    ctx.moveTo(0, -42);
    ctx.lineTo(34, 12);
    ctx.lineTo(12, 20);
    ctx.lineTo(0, 38);
    ctx.lineTo(-12, 20);
    ctx.lineTo(-34, 12);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(255,184,77,0.86)";
  ctx.beginPath();
  ctx.moveTo(-8, 34);
  ctx.lineTo(0, 54 + Math.random() * 10);
  ctx.lineTo(8, 34);
  ctx.fill();
  ctx.restore();
}

function drawPowerups() {
  for (const item of powerups) {
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(item.spin);
    ctx.fillStyle = item.type === "life" ? "#ff8fb3" : "#4ecdc4";
    ctx.beginPath();
    ctx.arc(0, 0, item.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.font = "bold 15px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(item.type === "life" ? "+" : "P", 0, 1);
    ctx.restore();
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / 650);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPause() {
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "white";
  ctx.font = "bold 34px Arial";
  ctx.textAlign = "center";
  ctx.fillText("已暂停", W / 2, H / 2);
}

function roundRect(x, y, w, h, r) {
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

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const touch = event.touches?.[0] || event.changedTouches?.[0] || event;
  return {
    x: (touch.clientX - rect.left) / rect.width * W,
    y: (touch.clientY - rect.top) / rect.height * H,
  };
}

function movePlayerToEvent(event) {
  if (!playing || paused || !player) return;
  const p = canvasPoint(event);
  player.x = Math.max(player.w / 2, Math.min(W - player.w / 2, p.x));
  player.y = Math.max(80, Math.min(H - player.h / 2, p.y));
}

pauseBtn.addEventListener("click", () => {
  if (!playing) return;
  paused = !paused;
  pauseBtn.textContent = paused ? "继续" : "暂停";
});
menuBtn.addEventListener("click", backToMenu);
restartBtn.addEventListener("click", () => startGame(currentStage.id));
nextStageBtn.addEventListener("click", () => {
  const next = Math.min(stages.length, currentStage.id + 1);
  startGame(next);
});
backHome.addEventListener("click", () => {
  if (gameView.classList.contains("show")) {
    backToMenu();
  } else {
    window.location.href = "index.html";
  }
});

rulesOpen.addEventListener("click", () => rulesModal.classList.add("show"));
rulesClose.addEventListener("click", () => rulesModal.classList.remove("show"));
rulesModal.addEventListener("click", event => {
  if (event.target === rulesModal) rulesModal.classList.remove("show");
});

window.addEventListener("keydown", event => keys.add(event.key));
window.addEventListener("keyup", event => keys.delete(event.key));

canvas.addEventListener("pointerdown", event => {
  dragging = true;
  movePlayerToEvent(event);
});
canvas.addEventListener("pointermove", event => {
  movePlayerToEvent(event);
});
window.addEventListener("pointerup", () => dragging = false);

createStars();
renderLevelCards();
draw();
