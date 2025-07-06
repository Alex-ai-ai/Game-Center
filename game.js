// 俄罗斯方块升级版网页版
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const SCORE_PER_LINE = 10;
const canvas = document.getElementById('tetris');
const ctx = canvas.getContext('2d');
const scoreSpan = document.getElementById('score');
const endScreen = document.getElementById('end-screen');
const endTitle = document.getElementById('end-title');
const endScore = document.getElementById('end-score');
const starContainer = document.getElementById('star-container');
const restartBtn = document.getElementById('restart-btn');
const menuBtn = document.getElementById('menu-btn');
const pauseBtn = document.getElementById('pause-btn');

const COLORS = [
    '#00ffff', // I
    '#ffff00', // O
    '#800080', // T
    '#00ff00', // S
    '#ff0000', // Z
    '#0000ff', // J
    '#ffa500'  // L
];
const SHAPES = [
    [[1, 1, 1, 1]], // I
    [[1, 1], [1, 1]], // O
    [[0, 1, 0], [1, 1, 1]], // T
    [[0, 1, 1], [1, 1, 0]], // S
    [[1, 1, 0], [0, 1, 1]], // Z
    [[1, 0, 0], [1, 1, 1]], // J
    [[0, 0, 1], [1, 1, 1]]  // L
];

let board, current, score, gameOver, dropInterval, dropTimer;
let paused = false;

function resetGame() {
    board = Array.from({length: ROWS}, () => Array(COLS).fill(0));
    score = 0;
    gameOver = false;
    current = randomPiece();
    updateScore();
    endScreen.style.display = 'none';
    document.getElementById('main-container').style.display = '';
    if (dropTimer) clearInterval(dropTimer);
    dropTimer = setInterval(tick, 500);
    draw();
    setPause(false);
}

function randomPiece() {
    const idx = Math.floor(Math.random() * SHAPES.length);
    return {
        shape: SHAPES[idx].map(row => row.slice()),
        color: COLORS[idx],
        x: Math.floor(COLS / 2) - 1,
        y: 0
    };
}

function collide(piece, x, y, shape = null) {
    shape = shape || piece.shape;
    for (let i = 0; i < shape.length; i++) {
        for (let j = 0; j < shape[i].length; j++) {
            if (shape[i][j]) {
                let nx = x + j, ny = y + i;
                if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return true;
                if (board[ny][nx]) return true;
            }
        }
    }
    return false;
}

function merge(piece) {
    for (let i = 0; i < piece.shape.length; i++) {
        for (let j = 0; j < piece.shape[i].length; j++) {
            if (piece.shape[i][j]) {
                board[piece.y + i][piece.x + j] = piece.color;
            }
        }
    }
}

function clearLines() {
    let lines = 0;
    for (let i = ROWS - 1; i >= 0; i--) {
        if (board[i].every(cell => cell)) {
            board.splice(i, 1);
            board.unshift(Array(COLS).fill(0));
            lines++;
            i++;
        }
    }
    if (lines > 0) {
        score += lines * 2;
        updateScore();
    }
}

function updateScore() {
    scoreSpan.textContent = score;
}

function drawCell(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    ctx.strokeStyle = '#222';
    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // 画已落下的方块
    for (let i = 0; i < ROWS; i++) {
        for (let j = 0; j < COLS; j++) {
            if (board[i][j]) {
                drawCell(j, i, board[i][j]);
            }
        }
    }
    // 画当前方块
    if (!gameOver) {
        for (let i = 0; i < current.shape.length; i++) {
            for (let j = 0; j < current.shape[i].length; j++) {
                if (current.shape[i][j]) {
                    drawCell(current.x + j, current.y + i, current.color);
                }
            }
        }
    }
}

function rotate(shape) {
    return shape[0].map((_, i) => shape.map(row => row[i]).reverse());
}

function tick() {
    if (!move(0, 1)) {
        merge(current);
        clearLines();
        current = randomPiece();
        if (collide(current, current.x, current.y)) {
            endGame();
            return;
        }
    }
    draw();
}

function move(dx, dy) {
    if (!collide(current, current.x + dx, current.y + dy)) {
        current.x += dx;
        current.y += dy;
        draw();
        return true;
    }
    return false;
}

function hardDrop() {
    while (move(0, 1));
    tick();
}

function setPause(state) {
    paused = state;
    if (paused) {
        pauseBtn.textContent = '继续';
        pauseBtn.classList.add('paused');
        if (dropTimer) clearInterval(dropTimer);
    } else {
        pauseBtn.textContent = '暂停';
        pauseBtn.classList.remove('paused');
        if (!gameOver) dropTimer = setInterval(tick, 500);
    }
}

pauseBtn.onclick = function() {
    setPause(!paused);
};

document.addEventListener('keydown', e => {
    if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " "].includes(e.key)) {
        e.preventDefault(); // 阻止页面滚动
    }
    if (e.key === ' ' && !gameOver) {
        setPause(!paused);
        return;
    }
    if (paused || gameOver) return;
    if (e.key === 'ArrowLeft') move(-1, 0);
    else if (e.key === 'ArrowRight') move(1, 0);
    else if (e.key === 'ArrowDown') move(0, 1);
    else if (e.key === 'ArrowUp') {
        const newShape = rotate(current.shape);
        if (!collide(current, current.x, current.y, newShape)) {
            current.shape = newShape;
            draw();
        }
    }
});

function getStarCount(score) {
    if (score < 10) return 0;
    if (score < 20) return 1;
    if (score < 30) return 2;
    return 3;
}

function endGame() {
    gameOver = true;
    clearInterval(dropTimer);
    document.getElementById('main-container').style.display = 'none';
    endScreen.style.display = 'flex';
    let stars = getStarCount(score);
    if (score < 10) {
        endTitle.textContent = '游戏失败';
        starContainer.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const star = document.createElement('span');
            star.className = 'star';
            star.style.filter = 'grayscale(1) opacity(0.4)';
            starContainer.appendChild(star);
        }
    } else {
        endTitle.textContent = '游戏胜利';
        starContainer.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const star = document.createElement('span');
            star.className = 'star';
            if (i >= stars) {
                star.style.filter = 'grayscale(1) opacity(0.4)';
            }
            starContainer.appendChild(star);
        }
    }
    endScore.textContent = `本局积分：${score}`;
    setPause(false);
}

restartBtn.onclick = function() {
    resetGame();
};
menuBtn.onclick = function() {
    window.location.href = 'menu.html';
};

// 初始化
resetGame(); 