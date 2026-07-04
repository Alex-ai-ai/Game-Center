const canvas = document.querySelector("#table");
const ctx = canvas.getContext("2d");
const menuEl = document.querySelector("#menu");
const leftEl = document.querySelector("#left");
const shotsEl = document.querySelector("#shots");
const modeLabel = document.querySelector("#modeLabel");
const turnLabel = document.querySelector("#turnLabel");
const scoreLabel = document.querySelector("#scoreLabel");
const helpText = document.querySelector("#helpText");
const backToMenuBtn = document.querySelector("#backToMenu");
const resetBtn = document.querySelector("#reset");
const playAgainBtn = document.querySelector("#playAgain");
const messageEl = document.querySelector("#message");
const finalTextEl = document.querySelector("#finalText");
const powerFill = document.querySelector("#powerFill");
const powerText = document.querySelector("#powerText");
const rulesOpen = document.querySelector("#rulesOpen");
const rulesClose = document.querySelector("#rulesClose");
const rulesOverlay = document.querySelector("#rulesOverlay");

const WORLD = { width: 960, height: 480 };
const BALL_RADIUS = 13;
const POCKET_RADIUS = 32;
const CUSHION_RESTITUTION = 0.72;
const BALL_RESTITUTION = 0.92;
const ROLLING_RESISTANCE = 0.043;
const CLOTH_DRAG = 0.9966;
const SPEED_DRAG = 0.00042;
const LOW_SPEED_DRAG = 0.018;
const STOP_SPEED = 0.062;
const MAX_POWER = 17.6;
const MIN_POWER = 2.4;
const MAX_PULL_DISTANCE = 210;
const CUE_LENGTH = 150;

const pockets = [
  { x: 0, y: 0 },
  { x: WORLD.width / 2, y: -4 },
  { x: WORLD.width, y: 0 },
  { x: 0, y: WORLD.height },
  { x: WORLD.width / 2, y: WORLD.height + 4 },
  { x: WORLD.width, y: WORLD.height },
];

const ballStyles = {
  1: { color: "#f6c343", pattern: "solid" },
  2: { color: "#2455a6", pattern: "solid" },
  3: { color: "#c9342c", pattern: "solid" },
  4: { color: "#5e3f99", pattern: "solid" },
  5: { color: "#e57a27", pattern: "solid" },
  6: { color: "#20874a", pattern: "solid" },
  7: { color: "#7b2d2f", pattern: "solid" },
  8: { color: "#111111", pattern: "solid" },
  9: { color: "#f6c343", pattern: "stripe" },
  10: { color: "#2455a6", pattern: "stripe" },
  11: { color: "#c9342c", pattern: "stripe" },
  12: { color: "#5e3f99", pattern: "stripe" },
  13: { color: "#e57a27", pattern: "stripe" },
  14: { color: "#20874a", pattern: "stripe" },
  15: { color: "#7b2d2f", pattern: "stripe" },
};

const playerNames = {
  friend: ["玩家 1", "玩家 2"],
  ai: ["玩家", "AI"],
};

let balls = [];
let shots = 0;
let aimPoint = { x: 120, y: WORLD.height / 2 };
let isAiming = false;
let chargePower = 0;
let cueAngle = 0;
let animationId = null;
let gameMode = "friend";
let currentPlayer = 0;
let scores = [0, 0];
let playerGroups = [null, null];
let shotInProgress = false;
let pocketedThisShot = 0;
let pocketedBallsThisShot = [];
let cuePocketedThisShot = false;
let firstContactBall = null;
let ballInHand = false;
let gameOver = false;
let aiTimer = null;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.width * 0.5 * dpr);
  ctx.setTransform(canvas.width / WORLD.width, 0, 0, canvas.height / WORLD.height, 0, 0);
}

function makeBall(x, y, color, type = "target", number = null, pattern = "solid") {
  return {
    x, y, vx: 0, vy: 0, color, type, number, pattern, active: true,
    radius: BALL_RADIUS,
    spin: Math.random() * Math.PI * 2,
    stripeAngle: Math.random() * Math.PI * 2,
    rollAngle: 0,
    rollDistance: 0,
  };
}

function rackBalls() {
  const startX = 650;
  const startY = WORLD.height / 2;
  const gap = BALL_RADIUS * 2.1;
  const rows = [1, 2, 3, 4, 5];
  const result = [];
  const rackOrder = [1, 10, 2, 11, 8, 3, 12, 4, 13, 5, 14, 6, 15, 7, 9];
  let index = 0;

  rows.forEach((count, row) => {
    for (let i = 0; i < count; i++) {
      const x = startX + row * gap;
      const y = startY + (i - (count - 1) / 2) * gap;
      const number = rackOrder[index];
      const style = ballStyles[number];
      result.push(makeBall(x, y, style.color, "target", number, style.pattern));
      index++;
    }
  });
  return result;
}

function startGame(mode) {
  gameMode = mode;
  menuEl.classList.add("hide");
  resetGame();
}

function backToMenu() {
  menuEl.classList.remove("hide");
  cancelAnimationFrame(animationId);
  clearTimeout(aiTimer);
  isAiming = false;
  shotInProgress = false;
  ballInHand = false;
  chargePower = 0;
  messageEl.classList.remove("show");
  updateHud();
  drawTable();
  drawBalls();
}

function resetGame() {
  cancelAnimationFrame(animationId);
  clearTimeout(aiTimer);
  shots = 0;
  currentPlayer = 0;
  scores = [0, 0];
  playerGroups = [null, null];
  shotInProgress = false;
  pocketedThisShot = 0;
  pocketedBallsThisShot = [];
  cuePocketedThisShot = false;
  firstContactBall = null;
  ballInHand = false;
  gameOver = false;
  balls = [
    makeBall(255, WORLD.height / 2, "#f8fafc", "cue"),
    ...rackBalls(),
  ];
  chargePower = 0;
  isAiming = false;
  messageEl.classList.remove("show");
  helpText.textContent = gameMode === "ai"
    ? "AI 对战：你先手。首颗非 8 号进球后分配全色/条纹，犯规后对方获得任意球。"
    : "好友对战：首颗非 8 号进球后分配全色/条纹，犯规后对方获得任意球。";
  updateHud();
  loop();
}

function updateHud() {
  const left = balls.filter(ball => ball.type === "target" && ball.active).length;
  leftEl.textContent = left;
  shotsEl.textContent = shots;
  modeLabel.textContent = gameMode === "ai" ? "AI 对战" : "好友对战";
  const groupText = playerGroups[currentPlayer]
    ? " · " + groupName(playerGroups[currentPlayer])
    : " · 待分组";
  turnLabel.textContent = playerNames[gameMode][currentPlayer] + groupText + (ballInHand ? " · 任意球" : "");
  scoreLabel.textContent = scores[0] + " : " + scores[1];
  const powerPercent = Math.max(0, Math.min(100, Math.round((chargePower / MAX_POWER) * 100)));
  powerFill.style.transform = "scaleX(" + (powerPercent / 100) + ")";
  powerText.textContent = powerPercent + "%";
}

function getCueBall() {
  return balls.find(ball => ball.type === "cue" && ball.active);
}

function tableMoving() {
  return balls.some(ball => ball.active && Math.hypot(ball.vx, ball.vy) > STOP_SPEED * 2);
}

function isAITurn() {
  return gameMode === "ai" && currentPlayer === 1 && !gameOver;
}

function groupName(group) {
  return group === "solid" ? "全色球" : "条纹球";
}

function canPlaceCueAt(x, y) {
  if (x < BALL_RADIUS || x > WORLD.width - BALL_RADIUS
    || y < BALL_RADIUS || y > WORLD.height - BALL_RADIUS) return false;
  return !balls.some(ball =>
    ball.active && ball.type === "target"
    && Math.hypot(ball.x - x, ball.y - y) < BALL_RADIUS * 2.15
  );
}

function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  const touch = event.touches?.[0] || event.changedTouches?.[0] || event;
  return {
    x: ((touch.clientX - rect.left) / rect.width) * WORLD.width,
    y: ((touch.clientY - rect.top) / rect.height) * WORLD.height,
  };
}

function beginAim(event) {
  if (tableMoving() || isAITurn() || messageEl.classList.contains("show")) return;
  const cue = getCueBall();
  if (!cue) return;

  const p = pointerPosition(event);
  if (ballInHand) {
    event.preventDefault();
    if (canPlaceCueAt(p.x, p.y)) {
      cue.x = p.x;
      cue.y = p.y;
      cue.vx = 0;
      cue.vy = 0;
      ballInHand = false;
      helpText.textContent = "任意球已放置。按住白球附近向后拖动，拖得越远力度越大，松开击球。";
      updateHud();
    }
    return;
  }

  const distance = Math.hypot(p.x - cue.x, p.y - cue.y);
  if (distance > 140) return;

  event.preventDefault();
  isAiming = true;
  aimPoint = p;
  updateAim(p);
}

function updateAim(p) {
  const cue = getCueBall();
  if (!cue) return;

  aimPoint = p;
  cueAngle = Math.atan2(cue.y - p.y, cue.x - p.x);
  if (isAiming) {
    const pullDistance = Math.max(0, Math.hypot(cue.x - p.x, cue.y - p.y) - BALL_RADIUS);
    chargePower = Math.min(MAX_POWER, (pullDistance / MAX_PULL_DISTANCE) * MAX_POWER);
    updateHud();
  }
}

function moveAim(event) {
  if (!isAiming) return;
  event.preventDefault();
  updateAim(pointerPosition(event));
}

function shoot(event) {
  if (!isAiming) return;
  event.preventDefault();
  if (chargePower < 0.8) {
    isAiming = false;
    aimPoint = { x: 0, y: 0 };
    chargePower = 0;
    updateHud();
    return;
  }
  strikeCue(cueAngle, chargePower);
  isAiming = false;
  aimPoint = { x: 0, y: 0 };
  chargePower = 0;
  updateHud();
}

function strikeCue(angle, power) {
  const cue = getCueBall();
  if (!cue || tableMoving() || gameOver) return;

  cue.vx = Math.cos(angle) * power;
  cue.vy = Math.sin(angle) * power;
  cue.spin += (Math.random() - 0.5) * 0.5;
  shots++;
  shotInProgress = true;
  pocketedThisShot = 0;
  pocketedBallsThisShot = [];
  cuePocketedThisShot = false;
  firstContactBall = null;
  updateHud();
}

function physics() {
  const maxSpeed = Math.max(0, ...balls.filter(ball => ball.active).map(ball => Math.hypot(ball.vx, ball.vy)));
  const steps = Math.min(10, Math.max(2, Math.ceil(maxSpeed / 3.6)));
  for (let step = 0; step < steps; step++) {
    physicsStep(1 / steps);
  }
  checkPockets();
}

function physicsStep(dt) {
  for (const ball of balls) {
    if (!ball.active) continue;

    for (const pocket of pockets) {
      const dx = pocket.x - ball.x;
      const dy = pocket.y - ball.y;
      const distance = Math.hypot(dx, dy);
      if (distance < POCKET_RADIUS * 2.15 && distance > 1) {
        const pull = (1 - distance / (POCKET_RADIUS * 2.15)) * 0.105;
        ball.vx += (dx / distance) * pull * dt;
        ball.vy += (dy / distance) * pull * dt;
      }
    }

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed > 0) {
      const distanceMoved = speed * dt;
      const lowSpeedBoost = speed < 2.2 ? (2.2 - speed) * LOW_SPEED_DRAG : 0;
      const speedDrag = speed * speed * SPEED_DRAG;
      const decel = Math.min(speed, (ROLLING_RESISTANCE + lowSpeedBoost + speedDrag) * dt);
      ball.vx -= (ball.vx / speed) * decel;
      ball.vy -= (ball.vy / speed) * decel;
      const clothDrag = Math.pow(CLOTH_DRAG, dt * 1.8);
      ball.vx *= clothDrag;
      ball.vy *= clothDrag;
      ball.rollDistance += distanceMoved;
      ball.spin += (distanceMoved / ball.radius) * 0.62;
      ball.rollAngle = Math.atan2(ball.vy, ball.vx);
      ball.stripeAngle = smoothAngle(ball.stripeAngle, ball.rollAngle, 0.12);
    }

    if (Math.hypot(ball.vx, ball.vy) < STOP_SPEED) {
      ball.vx = 0;
      ball.vy = 0;
    }

    if (ball.x - ball.radius < 0) {
      ball.x = ball.radius;
      ball.vx *= -CUSHION_RESTITUTION;
      ball.vy *= 0.88;
    }
    if (ball.x + ball.radius > WORLD.width) {
      ball.x = WORLD.width - ball.radius;
      ball.vx *= -CUSHION_RESTITUTION;
      ball.vy *= 0.88;
    }
    if (ball.y - ball.radius < 0) {
      ball.y = ball.radius;
      ball.vy *= -CUSHION_RESTITUTION;
      ball.vx *= 0.88;
    }
    if (ball.y + ball.radius > WORLD.height) {
      ball.y = WORLD.height - ball.radius;
      ball.vy *= -CUSHION_RESTITUTION;
      ball.vx *= 0.88;
    }
  }

  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      collide(balls[i], balls[j]);
    }
  }
}

function collide(a, b) {
  if (!a.active || !b.active) return;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy);
  const minDistance = a.radius + b.radius;
  if (distance === 0 || distance >= minDistance) return;

  if (shotInProgress && !firstContactBall) {
    if (a.type === "cue" && b.type === "target") firstContactBall = b;
    if (b.type === "cue" && a.type === "target") firstContactBall = a;
  }

  const nx = dx / distance;
  const ny = dy / distance;
  const overlap = (minDistance - distance) / 2;
  a.x -= nx * overlap;
  a.y -= ny * overlap;
  b.x += nx * overlap;
  b.y += ny * overlap;

  const rvx = b.vx - a.vx;
  const rvy = b.vy - a.vy;
  const velocityAlongNormal = rvx * nx + rvy * ny;
  if (velocityAlongNormal > 0) return;

  const impulse = -(1 + BALL_RESTITUTION) * velocityAlongNormal / 2;
  const impulseX = impulse * nx;
  const impulseY = impulse * ny;
  a.vx -= impulseX;
  a.vy -= impulseY;
  b.vx += impulseX;
  b.vy += impulseY;

  const tangentX = -ny;
  const tangentY = nx;
  const tangentSpeed = rvx * tangentX + rvy * tangentY;
  const tangentImpulse = Math.max(-0.24, Math.min(0.24, -tangentSpeed * 0.052));
  a.vx -= tangentImpulse * tangentX;
  a.vy -= tangentImpulse * tangentY;
  b.vx += tangentImpulse * tangentX;
  b.vy += tangentImpulse * tangentY;

  a.vx *= 0.992;
  a.vy *= 0.992;
  b.vx *= 0.992;
  b.vy *= 0.992;
}

function checkPockets() {
  for (const ball of balls) {
    if (!ball.active) continue;
    for (const pocket of pockets) {
      if (Math.hypot(ball.x - pocket.x, ball.y - pocket.y) < POCKET_RADIUS - 3) {
        if (ball.type === "cue") {
          cuePocketedThisShot = true;
          resetCueBall(ball);
        } else {
          ball.active = false;
          pocketedThisShot++;
          if (shotInProgress) {
            pocketedBallsThisShot.push(ball);
          }
        }
        break;
      }
    }
  }

  const left = balls.filter(ball => ball.type === "target" && ball.active).length;
  if (left === 0 && !gameOver) {
    const eightPocketedNow = balls.some(b => b.number === 8 && !b.active);
    if (!eightPocketedNow) {
      gameOver = true;
      const names = playerNames[gameMode];
      const winner = scores[0] === scores[1]
        ? "双方平局"
        : (scores[0] > scores[1] ? names[0] : names[1]) + "获胜";
      finalTextEl.textContent = winner + "。总杆数：" + shots + "，比分：" + scores[0] + " : " + scores[1] + "。";
      messageEl.classList.add("show");
    }
  }
  updateHud();
}

function resetCueBall(cue) {
  cue.x = 255;
  cue.y = WORLD.height / 2;
  cue.vx = 0;
  cue.vy = 0;
  cue.spin = 0;
  cue.rollDistance = 0;

  let tries = 0;
  while (balls.some(ball => ball !== cue && ball.active && Math.hypot(ball.x - cue.x, ball.y - cue.y) < BALL_RADIUS * 2.3) && tries < 80) {
    cue.x = 160 + Math.random() * 190;
    cue.y = 90 + Math.random() * (WORLD.height - 180);
    tries++;
  }
}

function resolveTurnIfNeeded() {
  if (!shotInProgress || tableMoving() || gameOver) return;

  shotInProgress = false;
  assignGroupsIfNeeded();

  const foulReason = getFoulReason();
  const foul = Boolean(foulReason);
  creditPocketedBalls();

  // 8号球胜负判定
  const eightPocketed = pocketedBallsThisShot.some(b => b.number === 8);
  if (eightPocketed) {
    gameOver = true;
    const names = playerNames[gameMode];
    if (foul) {
      finalTextEl.textContent = names[currentPlayer] + "犯规打进8号球，" + names[1 - currentPlayer] + "获胜！";
    } else {
      const group = playerGroups[currentPlayer];
      const myGroupLeft = group
        ? balls.filter(b => b.type === "target" && b.active && b.pattern === group).length
        : 99;
      if (myGroupLeft === 0) {
        finalTextEl.textContent = names[currentPlayer] + "成功打进8号球，获胜！";
      } else {
        finalTextEl.textContent = names[currentPlayer] + "提前打进8号球，" + names[1 - currentPlayer] + "获胜！";
      }
    }
    messageEl.classList.add("show");
    updateHud();
    return;
  }

  if (foul) {
    currentPlayer = 1 - currentPlayer;
    ballInHand = true;
    resetCueBall(getCueBall());
    helpText.textContent = foulReason + "，" + playerNames[gameMode][currentPlayer] + "获得任意球：点击台面任意合法位置放置白球。";
  } else if (pocketedThisShot === 0) {
    currentPlayer = 1 - currentPlayer;
    helpText.textContent = playerNames[gameMode][currentPlayer] + "出杆。按住白球附近向后拖动瞄准。";
  } else {
    helpText.textContent = playerNames[gameMode][currentPlayer] + "继续出杆。";
  }

  updateHud();

  if (isAITurn()) {
    aiTimer = setTimeout(aiShoot, 850);
  }
}

function assignGroupsIfNeeded() {
  if (playerGroups[0] || playerGroups[1]) return;
  const firstGroupBall = pocketedBallsThisShot.find(ball => ball.number !== 8);
  if (!firstGroupBall) return;
  playerGroups[currentPlayer] = firstGroupBall.pattern;
  playerGroups[1 - currentPlayer] = firstGroupBall.pattern === "solid" ? "stripe" : "solid";
}

function creditPocketedBalls() {
  for (const ball of pocketedBallsThisShot) {
    if (ball.number === 8) continue;
    const owner = playerGroups.findIndex(group => group === ball.pattern);
    if (owner >= 0) scores[owner]++;
  }
}

function firstContactIsWrongGroup() {
  if (!firstContactBall || firstContactBall.number === 8) return false;
  const group = playerGroups[currentPlayer];
  return Boolean(group && firstContactBall.pattern !== group);
}

function pocketedOpponentBall() {
  const group = playerGroups[currentPlayer];
  if (!group) return false;
  return pocketedBallsThisShot.some(ball => ball.number !== 8 && ball.pattern !== group);
}

function getFoulReason() {
  if (cuePocketedThisShot) return "白球进洞犯规";
  if (!firstContactBall) return "白球没有碰到任何球犯规";
  if (firstContactIsWrongGroup()) return "白球先碰到对方球犯规";
  if (pocketedOpponentBall()) return "将对方球打进洞犯规";
  return "";
}

function aiShoot() {
  if (!isAITurn() || tableMoving() || gameOver) return;
  let cue = getCueBall();
  const group = playerGroups[currentPlayer];
  const targets = balls.filter(ball =>
    ball.type === "target" && ball.active
    && (!group || ball.pattern === group || ball.number === 8)
  );
  if (!cue || targets.length === 0) return;

  // 任意球：选择最佳白球位置
  if (ballInHand && cue) {
    const bestPos = findBestCuePosition(targets);
    if (bestPos) {
      cue.x = bestPos.x;
      cue.y = bestPos.y;
    }
    ballInHand = false;
  }

  // 收集所有可行击球路线（直接击球 + 库边反弹）
  let best = null;

  // 1. 直接击球
  for (const target of targets) {
    for (const pocket of pockets) {
      const shot = evaluateDirectShot(cue, target, pocket);
      if (shot && (!best || shot.score < best.score)) best = shot;
    }
  }

  // 2. 库边反弹（Bank Shot）
  for (const target of targets) {
    for (const pocket of pockets) {
      const banks = evaluateBankShots(cue, target, pocket);
      for (const shot of banks) {
        if (shot && (!best || shot.score < best.score)) best = shot;
      }
    }
  }

  // 3. 如果没有找到好路线，随机打一个
  if (!best || best.score > 900) {
    const target = targets[Math.floor(Math.random() * targets.length)];
    const pocket = pockets[Math.floor(Math.random() * pockets.length)];
    best = evaluateDirectShot(cue, target, pocket) || {
      ghostX: target.x, ghostY: target.y,
      cueDistance: Math.hypot(target.x - cue.x, target.y - cue.y),
      pocketDistance: 260, score: 999
    };
  }

  // 计算击球角度和力度
  const error = (Math.random() - 0.5) * 0.025;
  const angle = Math.atan2(best.ghostY - cue.y, best.ghostX - cue.x) + error;

  // 力度控制：近距离轻推，远距离适当加力
  let power;
  if (best.cueDistance < 60) {
    power = Math.max(3.5, best.cueDistance / 14);
  } else if (best.cueDistance < 150) {
    power = Math.max(5.5, Math.min(11, best.cueDistance / 12));
  } else {
    power = Math.max(8, Math.min(MAX_POWER - 0.5, (best.cueDistance + best.pocketDistance) / 55));
  }
  strikeCue(angle, power);
}

function evaluateDirectShot(cue, target, pocket) {
  const toPocketX = pocket.x - target.x;
  const toPocketY = pocket.y - target.y;
  const pocketDistance = Math.hypot(toPocketX, toPocketY);
  if (pocketDistance < 1) return null;

  const ux = toPocketX / pocketDistance;
  const uy = toPocketY / pocketDistance;
  const ghostX = target.x - ux * BALL_RADIUS * 2.05;
  const ghostY = target.y - uy * BALL_RADIUS * 2.05;
  if (ghostX < BALL_RADIUS + 2 || ghostX > WORLD.width - BALL_RADIUS - 2
    || ghostY < BALL_RADIUS + 2 || ghostY > WORLD.height - BALL_RADIUS - 2) return null;

  const cueDistance = Math.hypot(ghostX - cue.x, ghostY - cue.y);
  const cutAngle = angleBetween(ghostX - cue.x, ghostY - cue.y, toPocketX, toPocketY);

  // 检查目标球到袋口是否被阻挡
  const targetBlocked = pathBlocked(target.x, target.y, pocket.x, pocket.y, target);
  if (targetBlocked) return null;

  // 检查白球到目标球是否被阻挡
  const cueBlocked = pathBlocked(cue.x, cue.y, ghostX, ghostY, target);
  const blockedPenalty = cueBlocked ? 500 : 0;

  const score = cueDistance * 0.8 + pocketDistance * 0.45 + cutAngle * 180 + blockedPenalty + Math.random() * 12;
  return { ghostX, ghostY, cueDistance, pocketDistance, score };
}

function evaluateBankShots(cue, target, pocket) {
  const results = [];
  const toPocketX = pocket.x - target.x;
  const toPocketY = pocket.y - target.y;
  const pocketDistance = Math.hypot(toPocketX, toPocketY);
  if (pocketDistance < 1) return results;

  // 目标球到袋口的方向
  const tpx = toPocketX / pocketDistance;
  const tpy = toPocketY / pocketDistance;

  // 需要目标球打向的方向（从袋口反推）
  const needVx = -tpx;
  const needVy = -tpy;

  // 尝试4个库边的反弹
  const rails = [
    { axis: 'x', pos: 0, normal: 1 },      // 左库
    { axis: 'x', pos: WORLD.width, normal: -1 },  // 右库
    { axis: 'y', pos: 0, normal: 1 },      // 上库
    { axis: 'y', pos: WORLD.height, normal: -1 }, // 下库
  ];

  for (const rail of rails) {
    // 镜像法：计算白球通过库边反弹后击中目标球的位置
    let mirrorCueX, mirrorCueY;
    if (rail.axis === 'x') {
      mirrorCueX = 2 * rail.pos - cue.x;
      mirrorCueY = cue.y;
    } else {
      mirrorCueX = cue.x;
      mirrorCueY = 2 * rail.pos - cue.y;
    }

    // 计算从镜像白球到目标球需要撞击的方向
    const dx = target.x - mirrorCueX;
    const dy = target.y - mirrorCueY;
    const dist = Math.hypot(dx, dy);
    if (dist < BALL_RADIUS * 2) continue;

    const nx = dx / dist;
    const ny = dy / dist;

    // 目标球被撞击后的方向应该与 needVx/needVy 一致（或接近）
    // 对于直线反弹，目标球被白球撞击后的方向 = 白球来的方向
    const dot = nx * needVx + ny * needVy;
    if (dot < 0.75) continue; // 角度差太大，不是好的 bank shot

    // 计算反弹点
    const t = (rail.axis === 'x')
      ? (rail.pos - cue.x) / nx
      : (rail.pos - cue.y) / ny;
    if (t <= 0 || t > dist * 1.5) continue;

    const hitX = cue.x + nx * t;
    const hitY = cue.y + ny * t;

    // 检查反弹点是否在桌面范围内（库边附近）
    if (hitX < -5 || hitX > WORLD.width + 5 || hitY < -5 || hitY > WORLD.height + 5) continue;

    // 检查反弹点到目标球是否被阻挡
    const blockedAfter = pathBlocked(hitX, hitY, target.x, target.y, target);
    if (blockedAfter) continue;

    // 检查白球到反弹点是否被阻挡
    const blockedBefore = pathBlocked(cue.x, cue.y, hitX, hitY, null);

    // 计算 ghost 点（白球撞击目标球时的位置）
    const ghostX = target.x - nx * BALL_RADIUS * 2.05;
    const ghostY = target.y - ny * BALL_RADIUS * 2.05;

    const cueDistance = Math.hypot(hitX - cue.x, hitY - cue.y) + Math.hypot(target.x - hitX, target.y - hitY);
    const cutAngle = Math.acos(Math.max(-1, Math.min(1, dot)));
    const blockedPenalty = blockedBefore ? 350 : 0;
    const bankPenalty = 180; // bank shot 有一定惩罚（更难打进）

    const score = cueDistance * 0.8 + pocketDistance * 0.5 + cutAngle * 200 + blockedPenalty + bankPenalty + Math.random() * 15;
    results.push({ ghostX, ghostY, cueDistance, pocketDistance, score });
  }

  return results;
}

function findBestCuePosition(targets) {
  let bestPos = null;
  let bestScore = Infinity;

  // 尝试多个候选位置
  const candidates = [];
  // 固定候选位置
  candidates.push({ x: 220, y: WORLD.height / 2 });
  candidates.push({ x: 160, y: WORLD.height / 2 });
  candidates.push({ x: 280, y: WORLD.height / 2 });
  candidates.push({ x: 220, y: WORLD.height / 2 - 60 });
  candidates.push({ x: 220, y: WORLD.height / 2 + 60 });
  candidates.push({ x: 180, y: WORLD.height / 2 - 100 });
  candidates.push({ x: 180, y: WORLD.height / 2 + 100 });
  candidates.push({ x: 260, y: WORLD.height / 2 - 80 });
  candidates.push({ x: 260, y: WORLD.height / 2 + 80 });

  // 在每个目标球附近生成候选位置
  for (const target of targets) {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
      const dist = 120 + Math.random() * 80;
      const cx = target.x - Math.cos(angle) * dist;
      const cy = target.y - Math.sin(angle) * dist;
      if (canPlaceCueAt(cx, cy)) candidates.push({ x: cx, y: cy });
    }
  }

  for (const pos of candidates) {
    if (!canPlaceCueAt(pos.x, pos.y)) continue;
    let minShotScore = Infinity;
    for (const target of targets) {
      for (const pocket of pockets) {
        const shot = evaluateDirectShot(pos, target, pocket);
        if (shot && shot.score < minShotScore) minShotScore = shot.score;
      }
    }
    if (minShotScore < bestScore) {
      bestScore = minShotScore;
      bestPos = pos;
    }
  }

  return bestPos;
}

function angleBetween(ax, ay, bx, by) {
  const a = Math.hypot(ax, ay);
  const b = Math.hypot(bx, by);
  if (a === 0 || b === 0) return 0;
  const dot = (ax * bx + ay * by) / (a * b);
  return Math.acos(Math.max(-1, Math.min(1, dot)));
}

function pathBlocked(x1, y1, x2, y2, ignoredBall) {
  return balls.some(ball => {
    if (!ball.active || ball === ignoredBall || ball.type === "cue") return false;
    return pointToSegmentDistance(ball.x, ball.y, x1, y1, x2, y2) < BALL_RADIUS * 2.05;
  });
}

function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSq));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function smoothAngle(current, target, amount) {
  const diff = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + diff * amount;
}

function drawTable() {
  ctx.clearRect(0, 0, WORLD.width, WORLD.height);

  ctx.save();
  ctx.fillStyle = "#0d562b";
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(WORLD.width / 4, 28);
  ctx.lineTo(WORLD.width / 4, WORLD.height - 28);
  ctx.stroke();

  ctx.setLineDash([10, 11]);
  ctx.beginPath();
  ctx.arc(WORLD.width / 4, WORLD.height / 2, 82, Math.PI / 2, -Math.PI / 2, true);
  ctx.stroke();
  ctx.setLineDash([]);

  for (const pocket of pockets) {
    const rim = ctx.createRadialGradient(pocket.x - 6, pocket.y - 6, 5, pocket.x, pocket.y, POCKET_RADIUS + 13);
    rim.addColorStop(0, "rgba(255,255,255,0.16)");
    rim.addColorStop(0.46, "#3b2416");
    rim.addColorStop(1, "rgba(0,0,0,0.42)");
    ctx.fillStyle = rim;
    ctx.beginPath();
    ctx.arc(pocket.x, pocket.y, POCKET_RADIUS + 9, 0, Math.PI * 2);
    ctx.fill();

    const gradient = ctx.createRadialGradient(pocket.x, pocket.y, 3, pocket.x, pocket.y, POCKET_RADIUS + 3);
    gradient.addColorStop(0, "#000");
    gradient.addColorStop(0.62, "#05070b");
    gradient.addColorStop(0.86, "#111827");
    gradient.addColorStop(1, "rgba(255,255,255,0.14)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(pocket.x, pocket.y, POCKET_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pocket.x, pocket.y, POCKET_RADIUS - 1, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawAim() {
  const cue = getCueBall();
  if (!isAiming || !cue || ballInHand || tableMoving() || isAITurn() || messageEl.classList.contains("show")) return;

  const directionX = Math.cos(cueAngle);
  const directionY = Math.sin(cueAngle);

  const prediction = predictAimPath(cue, directionX, directionY);
  ctx.save();

  ctx.strokeStyle = "rgba(0, 0, 0, 0.22)";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(cue.x, cue.y);
  ctx.lineTo(prediction.endX, prediction.endY);
  ctx.stroke();

  ctx.strokeStyle = isAiming ? "rgba(255, 255, 255, 0.92)" : "rgba(255, 255, 255, 0.42)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cue.x, cue.y);
  ctx.lineTo(prediction.endX, prediction.endY);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 9]);
  ctx.beginPath();
  ctx.moveTo(cue.x, cue.y);
  ctx.lineTo(prediction.endX, prediction.endY);
  ctx.stroke();
  ctx.setLineDash([]);

  drawAimTarget(prediction.endX, prediction.endY);

  if (prediction.reflect) {
    ctx.strokeStyle = "rgba(125, 211, 252, 0.72)";
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(prediction.endX, prediction.endY);
    ctx.quadraticCurveTo(
      prediction.endX + prediction.reflect.x * 48,
      prediction.endY + prediction.reflect.y * 48,
      prediction.endX + prediction.reflect.x * 96,
      prediction.endY + prediction.reflect.y * 96
    );
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (prediction.refract) {
    ctx.strokeStyle = "rgba(255, 196, 87, 0.86)";
    ctx.lineWidth = 4;
    ctx.setLineDash([18, 7]);
    ctx.beginPath();
    ctx.moveTo(prediction.ball.x, prediction.ball.y);
    ctx.lineTo(
      prediction.ball.x + prediction.refract.x * 170,
      prediction.ball.y + prediction.refract.y * 170
    );
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (prediction.invalidTarget) {
    drawRedCross(prediction.crossX, prediction.crossY, 8);
  }

  if (isAiming) {
    ctx.setLineDash([]);
    const pullBack = 18 + chargePower * 3;
    const startX = cue.x - directionX * (BALL_RADIUS + pullBack + CUE_LENGTH);
    const startY = cue.y - directionY * (BALL_RADIUS + pullBack + CUE_LENGTH);
    const endX = cue.x - directionX * (BALL_RADIUS + pullBack);
    const endY = cue.y - directionY * (BALL_RADIUS + pullBack);
    const gripX = cue.x - directionX * (BALL_RADIUS + pullBack + CUE_LENGTH * 0.46);
    const gripY = cue.y - directionY * (BALL_RADIUS + pullBack + CUE_LENGTH * 0.46);
    ctx.strokeStyle = "#7a3f23";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(gripX, gripY);
    ctx.stroke();
    ctx.strokeStyle = "#f4d187";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(gripX, gripY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.strokeStyle = "#4f8df7";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(endX - directionX * 10, endY - directionY * 10);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }

  ctx.restore();
}

function drawAimTarget(x, y) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.strokeStyle = "rgba(15,23,42,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawVerticalPowerMeter() {
  const x = 28;
  const y = 92;
  const width = 34;
  const height = 260;
  const percent = Math.max(0, Math.min(1, chargePower / MAX_POWER));
  const fillHeight = height * percent;
  const gradient = ctx.createLinearGradient(0, y + height, 0, y);
  gradient.addColorStop(0, "#59d85f");
  gradient.addColorStop(0.48, "#f5e642");
  gradient.addColorStop(1, "#ff453a");

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, width, height, 18);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  roundRect(ctx, x, y, width, height, 18);
  ctx.clip();
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y + height - fillHeight, width, fillHeight);
  ctx.restore();
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 16px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(Math.round(percent * 100) + "%", x + width / 2, y - 10);
  ctx.font = "900 22px Arial, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("\u26a1", x + width / 2, y + height - 22);
  ctx.restore();
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function predictAimPath(cue, dx, dy) {
  const ballHit = findFirstBallOnRay(cue.x, cue.y, dx, dy);
  const railHit = findRailHit(cue.x, cue.y, dx, dy);

  if (ballHit && ballHit.t < railHit.t) {
    const normalX = (ballHit.x - ballHit.ball.x) / (BALL_RADIUS * 2);
    const normalY = (ballHit.y - ballHit.ball.y) / (BALL_RADIUS * 2);
    const dot = dx * normalX + dy * normalY;
    const reflect = normalizeVector(dx - 2 * dot * normalX, dy - 2 * dot * normalY);
    return {
      endX: ballHit.x,
      endY: ballHit.y,
      crossX: ballHit.crossX,
      crossY: ballHit.crossY,
      ball: ballHit.ball,
      reflect,
      refract: normalizeVector(ballHit.ball.x - ballHit.x, ballHit.ball.y - ballHit.y),
      invalidTarget: isOpponentBall(ballHit.ball),
    };
  }

  const reflect = normalizeVector(railHit.reflectX, railHit.reflectY);
  return {
    endX: railHit.x,
    endY: railHit.y,
    reflect,
    invalidTarget: false,
  };
}

function findFirstBallOnRay(x, y, dx, dy) {
  let best = null;
  for (const ball of balls) {
    if (!ball.active || ball.type !== "target") continue;
    const vx = ball.x - x;
    const vy = ball.y - y;
    const projection = vx * dx + vy * dy;
    if (projection <= 0) continue;
    const perpendicular = Math.abs(vx * dy - vy * dx);
    const hitRadius = BALL_RADIUS * 2;
    if (perpendicular > hitRadius) continue;
    const offset = Math.sqrt(hitRadius * hitRadius - perpendicular * perpendicular);
    const t = projection - offset;
    if (t <= BALL_RADIUS) continue;
    const surfaceOffset = perpendicular <= BALL_RADIUS
      ? Math.sqrt(BALL_RADIUS * BALL_RADIUS - perpendicular * perpendicular)
      : offset;
    const surfaceT = projection - surfaceOffset;
    if (!best || t < best.t) {
      best = {
        ball, t,
        x: x + dx * t,
        y: y + dy * t,
        crossX: x + dx * surfaceT,
        crossY: y + dy * surfaceT,
      };
    }
  }
  return best;
}

function findRailHit(x, y, dx, dy) {
  const candidates = [];
  if (dx > 0) candidates.push({ t: (WORLD.width - BALL_RADIUS - x) / dx, reflectX: -dx, reflectY: dy });
  if (dx < 0) candidates.push({ t: (BALL_RADIUS - x) / dx, reflectX: -dx, reflectY: dy });
  if (dy > 0) candidates.push({ t: (WORLD.height - BALL_RADIUS - y) / dy, reflectX: dx, reflectY: -dy });
  if (dy < 0) candidates.push({ t: (BALL_RADIUS - y) / dy, reflectX: dx, reflectY: -dy });
  const hit = candidates.filter(item => item.t > 0).sort((a, b) => a.t - b.t)[0]
    || { t: 420, reflectX: dx, reflectY: dy };
  return { x: x + dx * hit.t, y: y + dy * hit.t, t: hit.t, reflectX: hit.reflectX, reflectY: hit.reflectY };
}

function normalizeVector(x, y) {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

function isOpponentBall(ball) {
  const group = playerGroups[currentPlayer];
  return Boolean(group && ball.type === "target" && ball.number !== 8 && ball.pattern !== group);
}

function drawRedCross(x, y, size) {
  ctx.save();
  ctx.setLineDash([]);
  ctx.strokeStyle = "#ff2d2d";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - size, y - size);
  ctx.lineTo(x + size, y + size);
  ctx.moveTo(x + size, y - size);
  ctx.lineTo(x - size, y + size);
  ctx.stroke();
  ctx.restore();
}

function drawBalls() {
  for (const ball of balls) {
    if (!ball.active) continue;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.42)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 6;

    if (ball.type === "cue") {
      drawCueBall(ball);
    } else {
      drawTargetBall(ball);
    }

    ctx.restore();
  }
}

function drawCueBall(ball) {
  ctx.fillStyle = ball.color;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(ball.x, ball.y);
  ctx.rotate(ball.rollAngle);
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 2;
  const offset = Math.sin(ball.spin) * ball.radius * 0.36;
  ctx.beginPath();
  ctx.ellipse(offset, 0, ball.radius * 0.72, ball.radius * 0.28, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(-offset * 0.65, 0, ball.radius * 0.42, ball.radius * 0.18, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  drawBallHighlight(ball);
}

function drawTargetBall(ball) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = ball.pattern === "stripe" ? "#f8fafc" : ball.color;
  ctx.fillRect(ball.x - ball.radius, ball.y - ball.radius, ball.radius * 2, ball.radius * 2);

  if (ball.pattern === "stripe") {
    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(ball.stripeAngle);
    const stripeOffset = Math.sin(ball.spin) * ball.radius * 0.18;
    ctx.fillStyle = ball.color;
    ctx.fillRect(-ball.radius * 1.15, -ball.radius * 0.46 + stripeOffset, ball.radius * 2.3, ball.radius * 0.92);
    ctx.restore();
  }
  ctx.restore();

  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius - 0.6, 0, Math.PI * 2);
  ctx.stroke();

  drawBallHighlight(ball);
  drawBallNumber(ball);
}

function drawBallHighlight(ball) {
  const highlight = ctx.createRadialGradient(
    ball.x - 5, ball.y - 7, 1,
    ball.x, ball.y, ball.radius
  );
  highlight.addColorStop(0, "rgba(255,255,255,0.95)");
  highlight.addColorStop(0.24, "rgba(255,255,255,0.25)");
  highlight.addColorStop(1, "rgba(0,0,0,0.12)");
  ctx.fillStyle = highlight;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawBallNumber(ball) {
  const badgeRadius = ball.number >= 10 ? 7 : 6.6;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, badgeRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#111827";
  ctx.font = "900 " + (ball.number >= 10 ? 8 : 9) + "px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(ball.number), ball.x, ball.y + 0.4);
}

function loop() {
  if (isAiming) {
    updateAim(aimPoint);
  }

  physics();
  resolveTurnIfNeeded();
  drawTable();
  drawAim();
  drawBalls();
  animationId = requestAnimationFrame(loop);
}

// 事件绑定
document.querySelectorAll(".mode-btn").forEach(button => {
  button.addEventListener("click", () => startGame(button.dataset.mode));
});
rulesOpen.addEventListener("click", () => {
  rulesOverlay.classList.add("show");
  rulesOverlay.setAttribute("aria-hidden", "false");
});
rulesClose.addEventListener("click", () => {
  rulesOverlay.classList.remove("show");
  rulesOverlay.setAttribute("aria-hidden", "true");
});
rulesOverlay.addEventListener("click", event => {
  if (event.target === rulesOverlay) {
    rulesOverlay.classList.remove("show");
    rulesOverlay.setAttribute("aria-hidden", "true");
  }
});
canvas.addEventListener("pointerdown", beginAim);
window.addEventListener("pointermove", moveAim);
window.addEventListener("pointerup", shoot);
backToMenuBtn.addEventListener("click", backToMenu);
resetBtn.addEventListener("click", backToMenu);
playAgainBtn.addEventListener("click", resetGame);
window.addEventListener("resize", () => {
  resizeCanvas();
  drawTable();
  drawBalls();
});

resizeCanvas();
drawTable();