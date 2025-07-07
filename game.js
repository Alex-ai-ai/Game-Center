// 在文件开头添加缩放设置函数
function setInitialZoom() {
    // 检查是否为移动设备
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // 仅在非移动设备上设置缩放
    if (!isMobile) {
        // 设置页面缩放为98%
        document.body.style.zoom = "98%";
        // 对于不支持 zoom 属性的浏览器，使用 transform 缩放
        document.body.style.transform = "scale(0.98)";
        document.body.style.transformOrigin = "center top";
    }
}

// 在页面加载完成后调用缩放设置
window.addEventListener('load', setInitialZoom);

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
const pauseIcon = document.getElementById('pause-icon');
const nextCanvas = document.getElementById('next-piece');
const nextCtx = nextCanvas.getContext('2d');

const COLORS = [
    '#66ffff', // 浅青色
    '#ffff99', // 浅黄色
    '#ff99ff', // 浅紫色
    '#99ff99', // 浅绿色
    '#ff9999', // 浅红色
    '#99ccff', // 浅蓝色
    '#ffcc99', // 浅橙色
    '#ffb3d9', // 浅粉色
    '#b3ffec', // 浅青绿色
    '#c2d6ff', // 浅天蓝色
    '#ffcccc', // 浅珊瑚色
    '#ccff99', // 浅黄绿色
    '#ffb366', // 浅杏色
    '#c2c2f0', // 浅薰衣草色
    '#99ffcc'  // 浅薄荷色
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
let linesCleared = 0; // 新增：累计消除行数
let level = 1;        // 新增：当前难度等级
let lastColorIndex = -1; // 记录上一个方块的颜色索引
let gameLoop = null;
let currentPiece = null;
let nextPieceBlock = null;
let currentDifficulty = 'easy'; // 默认简单难度
let lastDownPress = 0;  // 记录上次按下向下键的时间
let downPressCount = 0;  // 记录连续按下次数

const DIFFICULTY_SETTINGS = {
    easy: {
        initialSpeed: 600,     // 初始速度更快
        speedDecrease: 21,     // 保持不变
        minSpeed: 280,         // 保持不变
        linesPerLevel: 6,      // 保持不变
        name: "简单"
    },
    normal: {
        initialSpeed: 400,     // 初始速度更快
        speedDecrease: 35,     // 保持不变
        minSpeed: 175,         // 保持不变
        linesPerLevel: 5,      // 保持不变
        name: "普通"
    },
    hard: {
        initialSpeed: 250,     // 初始速度更快
        speedDecrease: 49,     // 保持不变
        minSpeed: 105,         // 保持不变
        linesPerLevel: 4,      // 保持不变
        name: "困难"
    }
};

// 设置画布大小
canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;

function getDropInterval(level) {
    const settings = DIFFICULTY_SETTINGS[currentDifficulty];
    const speed = settings.initialSpeed - (level - 1) * settings.speedDecrease;
    return Math.max(speed, settings.minSpeed);
}

function resetGame(difficulty = 'easy') {
    currentDifficulty = difficulty;
    board = Array.from({length: ROWS}, () => Array(COLS).fill(0));
    score = 0;
    gameOver = false;
    nextPieceBlock = randomPiece();  // 游戏开始时生成第一个预览方块
    current = randomPiece();
    current.y = -2;
    updateScore();
    endScreen.style.display = 'none';
    document.getElementById('main-container').style.display = '';
    linesCleared = 0;
    level = 1;
    dropInterval = getDropInterval(level);
    if (dropTimer) clearInterval(dropTimer);
    dropTimer = setInterval(tick, dropInterval);
    draw();
    setPause(false);
    drawNextPiece();  // 游戏开始时显示预览
    document.getElementById('lines').textContent = '0';
    document.getElementById('difficulty').textContent = DIFFICULTY_SETTINGS[currentDifficulty].name;
}

// 初始化游戏，但不开始
function initGame() {
    board = Array.from({length: ROWS}, () => Array(COLS).fill(0));
    score = 0;
    gameOver = false;
    current = randomPiece();
    updateScore();
    linesCleared = 0;
    level = 1;
    dropInterval = getDropInterval(level);
    if (dropTimer) clearInterval(dropTimer);
    draw();
}

// 在页面加载时初始化游戏
initGame();

function randomPiece() {
    const piece = {
        shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        x: Math.floor(COLS / 2) - 1,
        y: -4  // 从更高的位置开始
    };
    return piece;
}

function collide(piece, x, y) {
    const shape = piece.shape;
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col]) {
                const newX = x + col;
                const newY = y + row;
                
                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }
                
                if (newY >= 0 && board[newY] && board[newY][newX]) {
                    return true;
                }
            }
        }
    }
    return false;
}

function merge(piece) {
    const shape = piece.shape;
    for (let i = 0; i < shape.length; i++) {
        for (let j = 0; j < shape[i].length; j++) {
            if (shape[i][j]) {
                const newY = piece.y + i;
                const newX = piece.x + j;
                // 确保只在有效范围内合并方块
                if (newY >= 0 && newY < ROWS && newX >= 0 && newX < COLS) {
                    board[newY][newX] = piece.color;
                }
            }
        }
    }
}

function drawBlock(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制已固定的方块
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x]) {
                drawBlock(x, y, board[y][x]);
            }
        }
    }
    
    // 绘制当前方块
    if (current) {
        const shape = current.shape;
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const x = current.x + col;
                    const y = current.y + row;
                    if (y >= 0) {  // 只绘制可见部分
                        drawBlock(x, y, current.color);
                    }
                }
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
        const baseScore = SCORE_PER_LINE;
        const combo = [1, 2.5, 4, 6];
        score += Math.floor(baseScore * combo[lines - 1] * lines);
        
        updateScore();
        linesCleared += lines;
        document.getElementById('lines').textContent = linesCleared;
        
        // 根据当前难度设置确定升级所需行数
        const settings = DIFFICULTY_SETTINGS[currentDifficulty];
        let newLevel = Math.floor(linesCleared / settings.linesPerLevel) + 1;
        if (newLevel > level) {
            level = newLevel;
            document.getElementById('level').textContent = level;
            dropInterval = getDropInterval(level);
            if (dropTimer) clearInterval(dropTimer);
            dropTimer = setInterval(tick, dropInterval);
            
            const levelPanel = document.getElementById('level-panel');
            levelPanel.style.animation = 'none';
            levelPanel.offsetHeight;
            levelPanel.style.animation = 'levelUp 0.5s';
        }
        return true;
    }
    return false;
}

function updateScore() {
    scoreSpan.textContent = score;
}

function rotate(shape) {
    return shape[0].map((_, i) => shape.map(row => row[i]).reverse());
}

function tryRotate(piece) {
    const newShape = rotate(piece.shape);
    const kicks = [
        {x: 0, y: 0},  // 原位置
        {x: -1, y: 0}, // 左移
        {x: 1, y: 0},  // 右移
        {x: -2, y: 0}, // 左移两格
        {x: 2, y: 0},  // 右移两格
        {x: 0, y: -1}, // 上移
        {x: 0, y: 1}   // 下移
    ];

    // 尝试所有可能的位置调整
    for (let kick of kicks) {
        const newX = piece.x + kick.x;
        const newY = piece.y + kick.y;
        
        // 创建一个临时piece对象用于检查
        const testPiece = {
            shape: newShape,
            x: newX,
            y: newY
        };
        
        // 如果这个位置有效，则应用旋转
        if (!collide(testPiece, newX, newY)) {
            piece.shape = newShape;
            piece.x = newX;
            piece.y = newY;
            return true;
        }
    }
    return false;
}

function move(dx, dy) {
    const newX = current.x + dx;
    const newY = current.y + dy;
    
    if (!collide(current, newX, newY)) {
        current.x = newX;
        current.y = newY;
        draw();  // 立即重绘，提高响应速度
        
        // 只在下落时检查是否需要更新预览
        if (dy > 0 && current.y >= 0) {
            drawNextPiece();
        }
        return true;
    }
    return false;
}

function hardDrop() {
    let dropDistance = 0;
    while (move(0, 1)) {
        dropDistance++;
    }
    score += dropDistance;
    updateScore();
    tick();
    return dropDistance;
}

function tick() {
    if (paused) return;

    if (move(0, 1)) {
        draw();
    } else {
        // 方块已经无法继续下落
        if (current.y < 0) {
            // 游戏结束
            endGame();
            return;
        }
        merge(current);
        const clearedLines = clearLines();
        if (clearedLines > 0) {
            score += clearedLines * SCORE_PER_LINE * level;
            linesCleared += clearedLines;
            updateScore();
            updateLines(linesCleared);
            updateGameLevel();
        }

        // 使用预览的方块作为当前方块
        current = nextPieceBlock;
        current.y = -2;  // 从顶部开始

        // 生成新的预览方块，但暂不显示
        nextPieceBlock = randomPiece();

        // 更新下落速度
        clearInterval(dropTimer);
        dropInterval = getDropInterval(level);
        dropTimer = setInterval(tick, dropInterval);
    }
    draw();
}

// 恢复暂停按钮点击事件
pauseBtn.onclick = function() {
    setPause(!paused);
};

// 添加暂停菜单按钮事件监听
document.getElementById('resume-btn').addEventListener('click', () => {
    setPause(false);
});

document.getElementById('quit-btn').addEventListener('click', () => {
    // 直接跳转到主菜单（index.html）
    window.location.href = 'index.html';
});

function setPause(state) {
    paused = state;
    if (dropTimer) {
        clearInterval(dropTimer);
        dropTimer = null;
    }
    if (paused) {
        pauseIcon.innerHTML = '&#9654;'; // ▶
        pauseBtn.classList.add('paused');
        document.getElementById('pause-menu').style.display = 'flex';
    } else {
        pauseIcon.innerHTML = '&#10073;&#10073;'; // ||
        pauseBtn.classList.remove('paused');
        document.getElementById('pause-menu').style.display = 'none';
        if (!gameOver && !dropTimer) dropTimer = setInterval(tick, dropInterval);
    }
}

function getStarCount(linesCleared) {
    // 满足分数或消除行数任一条件即可
    if (score >= 2000 || linesCleared >= 50) return 5;
    if (score >= 1500 || linesCleared >= 40) return 4;
    if (score >= 1000 || linesCleared >= 30) return 3;
    if (score >= 500 || linesCleared >= 20) return 2;
    if (score >= 200 || linesCleared >= 10) return 1;
    return 0;
}

function endGame() {
    gameOver = true;
    clearInterval(dropTimer);
    endScreen.style.display = 'flex';
    endTitle.textContent = '游戏结束';
    endScore.textContent = `最终得分：${score}`;
    
    // 更新当前难度的最高分
    const bestScoreKey = `tetris_${currentDifficulty}`;
    const currentBest = localStorage.getItem(bestScoreKey) || 0;
    if (score > currentBest) {
        localStorage.setItem(bestScoreKey, score);
        document.getElementById(`${currentDifficulty}-best-score`).textContent = score;
    }
    
    // 显示星级
    const stars = getStarCount(linesCleared);
    starContainer.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        if (i >= stars) {
            star.style.opacity = '0.3';
        }
        starContainer.appendChild(star);
    }
}

restartBtn.onclick = function() {
    setMainBorderRandomColor(); // 每次再来一局时随机主界面边框色
    resetGame();
};
menuBtn.onclick = function() {
    window.location.href = 'menu.html';
};

function updateGameLevel() {
    const settings = DIFFICULTY_SETTINGS[currentDifficulty];
    const newLevel = Math.floor(linesCleared / settings.linesPerLevel) + 1;
    if (newLevel !== level) {
        level = newLevel;
        document.getElementById('level').textContent = level;
        // 更新下落速度
        clearInterval(dropTimer);
        dropInterval = getDropInterval(level);
        dropTimer = setInterval(tick, dropInterval);
    }
}

function startGameLoop() {
    const baseSpeed = 1000;
    const speed = Math.max(baseSpeed - (level - 1) * 100, 100); // 最快100ms
    gameLoop = setInterval(() => {
        update();
        if (clearLines()) {
            updateGameLevel();
        }
    }, speed);
}

function updateLines(newLines) {
    linesCleared = newLines;
    document.getElementById('lines').textContent = linesCleared;
}

function drawNextPiece() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    if (!nextPieceBlock) return;
    
    const blockSize = 20;
    const offsetX = (nextCanvas.width - nextPieceBlock.shape[0].length * blockSize) / 2;
    const offsetY = (nextCanvas.height - nextPieceBlock.shape.length * blockSize) / 2;

    nextPieceBlock.shape.forEach((row, i) => {
        row.forEach((value, j) => {
            if (value) {
                nextCtx.fillStyle = nextPieceBlock.color;
                nextCtx.fillRect(offsetX + j * blockSize, offsetY + i * blockSize, blockSize - 1, blockSize - 1);
            }
        });
    });
}

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
@keyframes levelUp {
    0% { transform: scale(1); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
}
`;
document.head.appendChild(style);

// 移动端控制
if (document.getElementById('mobile-controls')) {
    // 旋转按钮
    document.getElementById('rotate-btn').addEventListener('click', () => {
        if (!paused && !gameOver) {
            tryRotate(current);
            draw();
        }
    });

    // 左移按钮
    document.getElementById('left-btn').addEventListener('click', () => {
        if (!paused && !gameOver) {
            move(-1, 0);
        }
    });

    // 右移按钮
    document.getElementById('right-btn').addEventListener('click', () => {
        if (!paused && !gameOver) {
            move(1, 0);
        }
    });

    // 下移按钮
    document.getElementById('down-btn').addEventListener('click', () => {
        if (!paused && !gameOver) {
            move(0, 1);
        }
    });

    // 直接下落按钮
    document.getElementById('drop-btn').addEventListener('click', () => {
        if (!paused && !gameOver) {
            hardDrop();
        }
    });

    // 添加触摸滑动支持
    let touchStartX = 0;
    let touchStartY = 0;
    let lastTouchMove = 0;
    const SWIPE_THRESHOLD = 30;
    const SWIPE_TIMEOUT = 200;

    canvas.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        lastTouchMove = Date.now();
    });

    canvas.addEventListener('touchmove', (e) => {
        if (paused || gameOver) return;
        
        const now = Date.now();
        if (now - lastTouchMove < SWIPE_TIMEOUT) return;
        
        const touchEndX = e.touches[0].clientX;
        const touchEndY = e.touches[0].clientY;
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;

        if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
            if (deltaX > 0) {
                move(1, 0);
            } else {
                move(-1, 0);
            }
            touchStartX = touchEndX;
            lastTouchMove = now;
        }

        if (deltaY > SWIPE_THRESHOLD) {
            move(0, 1);
            touchStartY = touchEndY;
            lastTouchMove = now;
        }

        e.preventDefault();
    });

    // 双击旋转
    let lastTap = 0;
    canvas.addEventListener('touchend', (e) => {
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;
        
        if (now - lastTap < DOUBLE_TAP_DELAY) {
            if (!paused && !gameOver) {
                tryRotate(current);
                draw();
            }
            e.preventDefault();
        }
        lastTap = now;
    });
}

// 添加规则按钮事件监听
document.getElementById('rules-btn')?.addEventListener('click', () => {
    document.getElementById('rules-menu').style.display = 'flex';
});

document.getElementById('close-rules-btn')?.addEventListener('click', () => {
    document.getElementById('rules-menu').style.display = 'none';
});

// 键盘控制
document.addEventListener('keydown', e => {
    if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " ", "Tab"].includes(e.key)) {
        e.preventDefault(); // 阻止页面滚动和Tab默认行为
    }
    if (e.key === ' ' && !gameOver) {
        setPause(!paused);
        return;
    }
    if (paused || gameOver) return;
    
    if (e.key === 'ArrowLeft') move(-1, 0);
    else if (e.key === 'ArrowRight') move(1, 0);
    else if (e.key === 'ArrowDown') {
        move(0, 1);
    }
    else if (e.key === 'Tab') {
        hardDrop();  // 按Tab键直接下落到底部
    }
    else if (e.key === 'ArrowUp') {
        tryRotate(current);
        draw();
    }
});

// 移动端控制按钮事件处理
if (isMobile) {
    document.getElementById('left-btn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        move(-1, 0);
    });

    document.getElementById('right-btn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        move(1, 0);
    });

    document.getElementById('down-btn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        move(0, 1);
        // 记录按下时间和次数，用于判断快速下落
        const now = Date.now();
        if (now - lastDownPress < 600) {
            downPressCount++;
            if (downPressCount >= 3) {
                hardDrop();
                downPressCount = 0;
            }
        } else {
            downPressCount = 1;
        }
        lastDownPress = now;
    });

    document.getElementById('rotate-btn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        tryRotate(current);
    });

    document.getElementById('drop-btn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        hardDrop();
    });

    // 防止移动端滚动和缩放
    document.addEventListener('touchmove', (e) => {
        if (e.target.closest('#mobile-controls')) {
            e.preventDefault();
        }
    }, { passive: false });

    // 调整画布大小
    function resizeCanvas() {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const gameArea = document.querySelector('.game-area');
        
        // 计算合适的方块大小
        const blockSize = Math.min(Math.floor(screenWidth / 12), Math.floor(screenHeight / 24));
        
        // 更新画布大小
        canvas.width = COLS * blockSize;
        canvas.height = ROWS * blockSize;
        
        // 更新预览区域大小
        nextCanvas.width = 4 * blockSize;
        nextCanvas.height = 4 * blockSize;
        
        // 更新全局方块大小
        BLOCK_SIZE = blockSize;
        
        // 重新绘制
        draw();
        drawNextPiece();
    }

    // 监听屏幕旋转
    window.addEventListener('orientationchange', () => {
        setTimeout(resizeCanvas, 100);
    });

    // 初始调整大小
    resizeCanvas();
}