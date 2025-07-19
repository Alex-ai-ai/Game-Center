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

// 在页面加载完成后调用缩放设置和初始化游戏
window.addEventListener('load', () => {
    setInitialZoom();
    
    // 添加按钮事件监听
    const pauseBtn = document.getElementById('pause-btn');
    const resumeBtn = document.getElementById('resume-btn');
    const quitBtn = document.getElementById('quit-btn');
    const restartBtn = document.getElementById('restart-btn');
    const menuBtn = document.getElementById('menu-btn');
    
    // 设置初始暂停按钮图标
    if (pauseBtn) {
        pauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        pauseBtn.addEventListener('click', () => {
            setPause(!paused);
        });
    }
    
    if (resumeBtn) {
        resumeBtn.addEventListener('click', () => {
            setPause(false);
        });
    }
    
    if (quitBtn) {
        quitBtn.addEventListener('click', () => {
            window.location.href = 'menu.html';
        });
    }
    
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            resetGame(currentDifficulty);
        });
    }
    
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            window.location.href = 'menu.html';
        });
    }
    
    // 从 localStorage 获取难度设置
    const difficulty = localStorage.getItem('tetris_difficulty') || 'normal';
    
    // 初始化游戏
    initGame(difficulty);
});

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
    'none',
    '#FF0D72', // Z形方块
    '#0DC2FF', // I形方块
    '#0DFF72', // S形方块
    '#F538FF', // T形方块
    '#FF8E0D', // L形方块
    '#FFE138', // O形方块
    '#3877FF'  // J形方块
];
const SHAPES = [
    [],
    [[0, 0, 0, 0], [1, 1, 0, 0], [0, 1, 1, 0], [0, 0, 0, 0]], // Z
    [[0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0]], // I
    [[0, 0, 0, 0], [0, 1, 1, 0], [1, 1, 0, 0], [0, 0, 0, 0]], // S
    [[0, 0, 0, 0], [1, 1, 1, 0], [0, 1, 0, 0], [0, 0, 0, 0]], // T
    [[0, 0, 0, 0], [1, 1, 1, 0], [1, 0, 0, 0], [0, 0, 0, 0]], // L
    [[0, 0, 0, 0], [0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0]], // O
    [[0, 0, 0, 0], [1, 1, 1, 0], [0, 0, 1, 0], [0, 0, 0, 0]]  // J
];

let board, current, score, gameOver, dropInterval, dropTimer;
let paused = false;
let linesCleared = 0; // 新增：累计消除行数
let level = 1;        // 新增：当前难度等级
let lastColorIndex = -1; // 记录上一个方块的颜色索引
let gameLoop = null;
let currentPiece = null;
let nextPieceBlock = null;
let currentDifficulty = 'normal'; // 默认普通难度
let lastDownPress = 0;  // 记录上次按下向下键的时间
let downPressCount = 0;  // 记录连续按下次数

// Difficulty settings with customizable speeds
const DIFFICULTY_SETTINGS = {
    'easy': { 
        initialSpeed: 667, 
        speedIncrease: 33,
        linesPerLevel: 10,  // 每消除10行升一级
        maxSpeedIncrease: 200  // 最多加快200ms
    },
    'normal': { 
        initialSpeed: 533, 
        speedIncrease: 50,
        linesPerLevel: 8,   // 每消除8行升一级
        maxSpeedIncrease: 300  // 最多加快300ms
    },
    'hard': { 
        initialSpeed: 250, 
        speedIncrease: 80,
        linesPerLevel: 5,   // 每消除5行升一级
        maxSpeedIncrease: 400  // 最多加快400ms
    }
};

// 设置画布大小
function setCanvasSize() {
    if (isMobile) {
        // 移动端设置
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        
        // 计算合适的方块大小
        const blockSize = Math.min(Math.floor(screenWidth / 12), Math.floor((screenHeight - 200) / 20));
        
        // 更新全局方块大小
        BLOCK_SIZE = blockSize;
        
        // 更新画布大小
        canvas.width = COLS * BLOCK_SIZE;
        canvas.height = ROWS * BLOCK_SIZE;
        
        // 更新预览区域大小
        nextCanvas.width = 4 * BLOCK_SIZE;
        nextCanvas.height = 4 * BLOCK_SIZE;
    } else {
        // PC端保持原始大小
        canvas.width = COLS * BLOCK_SIZE;
        canvas.height = ROWS * BLOCK_SIZE;
    }
}

// 在页面加载和屏幕旋转时调整画布大小
window.addEventListener('load', setCanvasSize);
window.addEventListener('orientationchange', () => {
    setTimeout(setCanvasSize, 100);
});

function getDropInterval(level) {
    const settings = DIFFICULTY_SETTINGS[currentDifficulty];
    const speedIncrease = Math.min((level - 1) * settings.speedIncrease, settings.maxSpeedIncrease);
    const speed = settings.initialSpeed - speedIncrease;
    return Math.max(speed, 100);  // 保持最小间隔100ms以确保游戏可玩性
}

function resetGame(difficulty = 'normal') {
    // 在重置前检查是否创造新纪录
    const bestScoreKey = `tetris_${currentDifficulty}_best`;
    const currentBest = parseInt(localStorage.getItem(bestScoreKey)) || 0;
    if (score > currentBest) {
        // 保存新纪录
        localStorage.setItem(bestScoreKey, score);
        // 显示新纪录提示
        alert(`恭喜！您创造了新的纪录：${score}分！\n难度：${
            currentDifficulty === 'easy' ? '简单' :
            currentDifficulty === 'normal' ? '普通' :
            '困难'
        }`);
    }

    // 清除所有定时器
    if (dropTimer) clearInterval(dropTimer);
    if (gameLoop) {
        clearInterval(gameLoop);
        gameLoop = null;
    }

    // 重置游戏状态
    currentDifficulty = difficulty;
    board = Array.from({length: ROWS}, () => Array(COLS).fill(0));
    score = 0;
    gameOver = false;
    linesCleared = 0;
    level = 1;
    
    // 生成新方块
    nextPieceBlock = randomPiece();
    current = randomPiece();
    current.y = -1;
    
    // 更新显示
    updateScore();
    document.getElementById('score').textContent = '0';
    document.getElementById('level').textContent = '1';
    document.getElementById('lines').textContent = '0';
    
    // 隐藏结束和暂停界面
    document.getElementById('end-screen').style.display = 'none';
    document.getElementById('pause-menu').style.display = 'none';
    document.getElementById('main-container').style.display = '';
    
    // 重置游戏速度
    dropInterval = getDropInterval(level);
    dropTimer = setInterval(() => {
        if (!gameOver && !paused) {
            tick();
        }
    }, dropInterval);
    
    // 重绘游戏画面
    draw();
    drawNextPiece();
    
    // 取消暂停状态
    setPause(false);
}

// 初始化游戏
function initGame(difficulty = 'normal') {
    // 设置画布大小
    canvas.width = COLS * BLOCK_SIZE;
    canvas.height = ROWS * BLOCK_SIZE;
    
    // 初始化游戏状态
    board = Array.from({length: ROWS}, () => Array(COLS).fill(0));
    score = 0;
    gameOver = false;
    linesCleared = 0;
    level = 1;
    currentDifficulty = difficulty;
    
    // 生成初始方块
    nextPieceBlock = randomPiece();
    current = randomPiece();
    current.y = -1;  // 从更高的位置开始
    
    // 更新显示
    updateScore();
    document.getElementById('score').textContent = '0';
    document.getElementById('level').textContent = '1';
    document.getElementById('lines').textContent = '0';
    
    // 清除现有定时器
    if (dropTimer) {
        clearInterval(dropTimer);
    }
    if (gameLoop) {
        clearInterval(gameLoop);
        gameLoop = null;
    }
    
    // 设置下落速度并启动定时器
    dropInterval = getDropInterval(level);
    dropTimer = setInterval(() => {
        if (!gameOver && !paused) {
            tick();
        }
    }, dropInterval);
    
    // 开始游戏循环
    draw();
    setPause(false);
    drawNextPiece();
    
    // 隐藏结束屏幕
    if (endScreen) {
        endScreen.style.display = 'none';
    }
}

function randomPiece() {
    // 随机选择一个非空的形状（从索引1开始）
    const shapeIndex = Math.floor(Math.random() * (SHAPES.length - 1)) + 1;
    const colorIndex = Math.floor(Math.random() * (COLORS.length - 1)) + 1;
    
    const piece = {
        shape: SHAPES[shapeIndex],
        color: COLORS[colorIndex],
        x: Math.floor(COLS / 2) - 1,
        y: -1  // 从更高的位置开始
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
    let gameEnds = false;
    
    for (let i = 0; i < shape.length; i++) {
        for (let j = 0; j < shape[i].length; j++) {
            if (shape[i][j]) {
                const newY = piece.y + i;
                const newX = piece.x + j;
                // 只要newY>=0就写入board，newY<0才判定gameOver
                if (newY >= 0 && newY < ROWS && newX >= 0 && newX < COLS) {
                    board[newY][newX] = piece.color;
                } else if (newY < 0) {
                    gameEnds = true;
                }
            }
        }
    }
    
    // 如果方块触及顶部，游戏结束
    if (gameEnds) {
        endGame();
    }
}

function drawBlock(x, y, color) {
    if (!ctx) return;
    
    ctx.fillStyle = color;
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    ctx.strokeStyle = '#222';
    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

function draw() {
    if (!ctx) {
        console.error('Canvas context is not available');
        return;
    }
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制游戏板
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (board[row][col]) {
                drawBlock(col, row, board[row][col]);
            }
        }
    }
    
    // 绘制当前方块
    if (current) {
        current.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    drawBlock(current.x + x, current.y + y, current.color);
                }
            });
        });
    }
    
    // 请求下一帧动画
    if (!gameOver && !paused) {
        requestAnimationFrame(draw);
    }
}

// Line clearing logic
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
        return lines; // 返回消除的行数
    }
    return 0;
}

function updateScore() {
    scoreSpan.textContent = score;
}

function rotate(shape) {
    // 顺时针旋转90度
    const N = shape.length;
    const rotated = Array(N).fill().map(() => Array(N).fill(0));
    for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
            rotated[j][N-1-i] = shape[i][j];
        }
    }
    return rotated;
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
        return true;
    }
    
    // 如果是向下移动且发生碰撞，说明方块已经到底
    if (dy > 0) {
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
        current.y = -1;  // 从顶部开始

        // 生成新的预览方块并立即显示
        nextPieceBlock = randomPiece();
        drawNextPiece();

        // 检查游戏是否结束
        if (collide(current, current.x, current.y)) {
            endGame();
            return false;
        }
        draw(); // 只在全部处理后重绘一次
    }
    return false;
}

// Hard drop implementation
function hardDrop() {
    let dropDistance = 0;
    while (move(0, 1)) {
        dropDistance++;
    }
    score += dropDistance;
    updateScore();
    tick();  // 立即处理方块落地
}

function tick() {
    if (paused || gameOver) return;
    move(0, 1);
    // draw(); // 移除tick中的draw，避免多余重绘
}

function setPause(state) {
    paused = state;
    const pauseBtn = document.getElementById('pause-btn');
    const pauseMenu = document.getElementById('pause-menu');
    
    if (paused) {
        // 更新暂停按钮图标为播放图标
        if (pauseBtn) {
            pauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            pauseBtn.classList.add('paused');
        }
        // 显示暂停菜单
        if (pauseMenu) {
            pauseMenu.style.display = 'flex';
        }
    } else {
        // 更新暂停按钮图标为暂停图标
        if (pauseBtn) {
            pauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            pauseBtn.classList.remove('paused');
        }
        // 隐藏暂停菜单
        if (pauseMenu) {
            pauseMenu.style.display = 'none';
        }
        // 重新开始动画循环
        requestAnimationFrame(draw);
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
    
    // 更新当前难度的最高分
    const bestScoreKey = `tetris_${currentDifficulty}_best`;
    const currentBest = parseInt(localStorage.getItem(bestScoreKey)) || 0;
    
    // 显示最终得分和最高分
    if (score > currentBest) {
        endScore.textContent = `${score} (新纪录！)`;
        localStorage.setItem(bestScoreKey, score);
    } else {
        endScore.textContent = `${score} (最高分：${currentBest})`;
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

// 移除重复的事件绑定
restartBtn.onclick = null;

// 重新开始按钮事件监听
document.addEventListener('DOMContentLoaded', () => {
    // 游戏结束界面的重新开始按钮
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            resetGame(currentDifficulty);
        });
    }
    
    // 暂停菜单中的重新开始按钮
    const pauseRestartBtn = document.getElementById('restart-btn-pause');
    if (pauseRestartBtn) {
        pauseRestartBtn.addEventListener('click', () => {
            resetGame(currentDifficulty);
        });
    }
});

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

function drawNextPiece() {
    if (!nextCtx) {
        console.error('Next piece canvas context is not available');
        return;
    }
    
    // 清空预览画布
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    if (nextPieceBlock) {
        // 计算方块大小和偏移量
        const blockSize = Math.min(nextCanvas.width, nextCanvas.height) / 5; // 减小方块大小以留出更多空间
        
        // 计算方块的实际宽度和高度（以方块单位计）
        let pieceWidth = 0;
        let pieceHeight = 0;
        nextPieceBlock.shape.forEach((row, y) => {
            let rowWidth = 0;
            row.forEach((value, x) => {
                if (value) {
                    rowWidth = Math.max(rowWidth, x + 1);
                    pieceHeight = Math.max(pieceHeight, y + 1);
                }
            });
            pieceWidth = Math.max(pieceWidth, rowWidth);
        });
        
        // 计算居中偏移量
        const offsetX = (nextCanvas.width - pieceWidth * blockSize) / 2;
        const offsetY = (nextCanvas.height - pieceHeight * blockSize) / 2;
        
        // 绘制方块
        nextPieceBlock.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    nextCtx.fillStyle = nextPieceBlock.color;
                    nextCtx.fillRect(
                        offsetX + x * blockSize,
                        offsetY + y * blockSize,
                        blockSize - 1, // 留出1像素的间隔
                        blockSize - 1
                    );
                    nextCtx.strokeStyle = '#222';
                    nextCtx.strokeRect(
                        offsetX + x * blockSize,
                        offsetY + y * blockSize,
                        blockSize - 1,
                        blockSize - 1
                    );
                }
            });
        });
    }
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
    else if (e.key === 'ArrowDown') move(0, 1);
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