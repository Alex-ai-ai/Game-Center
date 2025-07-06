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
    nextPieceBlock = randomPiece();
    current = randomPiece();
    current.y = -2;
    current.hasGeneratedNext = false;
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
    drawNextPiece();
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
    for (let i = 0; i < shape.length; i++) {
        for (let j = 0; j < shape[i].length; j++) {
            if (shape[i][j]) {
                const newX = x + j;
                const newY = y + i;
                
                // 检查是否超出边界
                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }
                
                // 检查是否与其他方块碰撞
                // 只在方块完全进入游戏区域后才检查碰撞
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

function drawCell(x, y, color) {
    const size = BLOCK_SIZE;
    
    // 填充方块背景
    ctx.fillStyle = color;
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, size, size);
    
    // 绘制边框 - 使用更细的线条
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, size, size);
    
    // 添加更淡的内部阴影效果
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.moveTo(x * BLOCK_SIZE + 2, y * BLOCK_SIZE + size - 2);
    ctx.lineTo(x * BLOCK_SIZE + 2, y * BLOCK_SIZE + 2);
    ctx.lineTo(x * BLOCK_SIZE + size - 2, y * BLOCK_SIZE + 2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.moveTo(x * BLOCK_SIZE + 2, y * BLOCK_SIZE + size - 2);
    ctx.lineTo(x * BLOCK_SIZE + size - 2, y * BLOCK_SIZE + size - 2);
    ctx.lineTo(x * BLOCK_SIZE + size - 2, y * BLOCK_SIZE + 2);
    ctx.stroke();
}

function draw() {
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制背景网格
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= ROWS; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * BLOCK_SIZE);
        ctx.lineTo(canvas.width, i * BLOCK_SIZE);
        ctx.stroke();
    }
    for (let j = 0; j <= COLS; j++) {
        ctx.beginPath();
        ctx.moveTo(j * BLOCK_SIZE, 0);
        ctx.lineTo(j * BLOCK_SIZE, canvas.height);
        ctx.stroke();
    }
    
    // 绘制已经固定的方块
    for (let i = 0; i < ROWS; i++) {
        for (let j = 0; j < COLS; j++) {
            if (board[i][j]) {
                drawCell(j, i, board[i][j]);
            }
        }
    }
    
    // 绘制当前方块
    if (current) {
        const shape = current.shape;
        for (let i = 0; i < shape.length; i++) {
            for (let j = 0; j < shape[i].length; j++) {
                if (shape[i][j] && (current.y + i >= 0)) {
                    drawCell(current.x + j, current.y + i, current.color);
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
    if (!collide(current, current.x + dx, current.y + dy)) {
        current.x += dx;
        current.y += dy;
        draw(); // 确保移动后立即重绘
        return true;
    }
    return false;
}

function hardDrop() {
    while (move(0, 1));
    tick();
}

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

function tick() {
    if (gameOver || paused) return;
    
    // 检查当前方块是否完全进入屏幕
    const isFullyVisible = current.shape.every((row, i) => 
        !row.some(cell => cell === 1) || (current.y + i >= 0)
    );
    
    // 如果方块完全进入屏幕且还没有生成下一个方块，则生成下一个方块
    if (isFullyVisible && !current.hasGeneratedNext) {
        nextPieceBlock = randomPiece();
        drawNextPiece();
        current.hasGeneratedNext = true;
    }
    
    // 检查是否可以移动
    if (!collide(current, current.x, current.y + 1)) {
        current.y++;
        draw();
    } else {
        // 如果方块已经接触到其他方块或底部
        merge(current);
        if (clearLines()) {
            document.getElementById('lines').textContent = linesCleared;
        }
        
        // 检查游戏是否结束 - 检查顶部几行是否有方块
        for (let j = 0; j < COLS; j++) {
            if (board[0][j] || board[1][j]) {
                endGame();
                return;
            }
        }
        
        current = nextPieceBlock;
        current.y = -2; // 调整初始位置更靠近顶部
        current.hasGeneratedNext = false;
        
        // 如果新方块一出现就发生碰撞，游戏结束
        if (collide(current, current.x, current.y)) {
            endGame();
            return;
        }
        
        draw();
    }
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

function getStarCount(score) {
    // 修改星星评级机制
    // 根据消除的行数来评定星级
    if (linesCleared < 10) return 0;      // 0星：消除不到10行
    else if (linesCleared < 20) return 1;  // 1星：消除10-19行
    else if (linesCleared < 30) return 2;  // 2星：消除20-29行
    else if (linesCleared < 40) return 3;  // 3星：消除30-39行
    else if (linesCleared < 50) return 4;  // 4星：消除40-49行
    else return 5;                         // 5星：消除50行以上
}

function endGame() {
    gameOver = true;
    clearInterval(dropTimer);
    document.getElementById('main-container').style.display = 'none';
    endScreen.style.display = 'flex';
    let stars = getStarCount(score);
    
    // 更新结束界面的标题和星星显示
    if (linesCleared < 10) {
        endTitle.textContent = '继续加油';
    } else if (linesCleared < 20) {
        endTitle.textContent = '有待提高';
    } else if (linesCleared < 30) {
        endTitle.textContent = '表现不错';
    } else if (linesCleared < 40) {
        endTitle.textContent = '很棒';
    } else if (linesCleared < 50) {
        endTitle.textContent = '太厉害了';
    } else {
        endTitle.textContent = '完美游戏';
    }

    // 清空并重新生成星星
    starContainer.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        const star = document.createElement('span');
        star.className = 'star';
        if (i >= stars) {
            star.style.filter = 'grayscale(1) opacity(0.4)';
        }
        starContainer.appendChild(star);
    }
    
    endScore.textContent = `消除行数：${linesCleared}`;
    setPause(false);
    
    // 保存最高纪录
    let best = localStorage.getItem('tetris_best') || 0;
    if (linesCleared > best) {
        localStorage.setItem('tetris_best', linesCleared);
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
    const newLevel = Math.floor(linesCleared / 10) + 1;
    if(newLevel !== level) {
        level = newLevel;
        dropInterval = Math.max(1000 - (level - 1) * 100, 100);
        if (dropTimer) clearInterval(dropTimer);
        dropTimer = setInterval(update, dropInterval);
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
    if (!nextPieceBlock) {
        nextPieceBlock = randomPiece();
    }
    
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    // 调整方块大小
    const blockSize = 25; // 减小方块大小
    const size = blockSize - 1;
    
    // 计算预览区域中心位置
    const pieceWidth = nextPieceBlock.shape[0].length * blockSize;
    const pieceHeight = nextPieceBlock.shape.length * blockSize;
    const offsetX = (nextCanvas.width - pieceWidth) / 2;
    const offsetY = (nextCanvas.height - pieceHeight) / 2;
    
    // 绘制方块
    for (let i = 0; i < nextPieceBlock.shape.length; i++) {
        for (let j = 0; j < nextPieceBlock.shape[i].length; j++) {
            if (nextPieceBlock.shape[i][j]) {
                const x = offsetX + j * blockSize;
                const y = offsetY + i * blockSize;
                
                // 填充方块
                nextCtx.fillStyle = nextPieceBlock.color;
                nextCtx.fillRect(x, y, size, size);
                
                // 绘制边框
                nextCtx.beginPath();
                nextCtx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                nextCtx.lineWidth = 0.5;
                nextCtx.strokeRect(x, y, size, size);
            }
        }
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