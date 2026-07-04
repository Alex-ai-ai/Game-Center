// 2048 游戏主逻辑
const SIZE = 4;
let board = [];
let score = 0;
let gameOver = false;
let highscore = 0;

const boardDiv = document.getElementById('board-2048');
const scoreSpan = document.getElementById('score-2048');
const gameOverDiv = document.getElementById('game-over-2048');
const gameOverText = document.getElementById('game-over-text-2048');
const restartBtn = document.getElementById('restart-2048');
const restartBtn2 = document.getElementById('restart-btn-2048');
const highscoreSpan = document.getElementById('highscore-2048');

function init2048() {
    board = Array.from({length: SIZE}, () => Array(SIZE).fill(0));
    score = 0;
    gameOver = false;
    updateBoard();
    addRandomTile();
    addRandomTile();
    updateBoard();
    updateScore();
    gameOverDiv.style.display = 'none';
}

function addRandomTile() {
    const empty = [];
    for (let i = 0; i < SIZE; i++) {
        for (let j = 0; j < SIZE; j++) {
            if (board[i][j] === 0) empty.push([i, j]);
        }
    }
    if (empty.length === 0) return;
    const [i, j] = empty[Math.floor(Math.random() * empty.length)];
    board[i][j] = Math.random() < 0.9 ? 2 : 4;
}

function updateBoard() {
    boardDiv.innerHTML = '';
    for (let i = 0; i < SIZE; i++) {
        for (let j = 0; j < SIZE; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell-2048';
            cell.textContent = board[i][j] === 0 ? '' : board[i][j];
            setCellStyle(cell, board[i][j]);
            boardDiv.appendChild(cell);
        }
    }
    // 新增：每次刷新都检测是否失败
    if (!canMove() && !gameOver) {
        gameOver = true;
        showGameOver(false);
    }
}

function setCellStyle(cell, value) {
    const colors = {
        0:  '#cdc1b4',
        2:  '#eee4da',
        4:  '#ede0c8',
        8:  '#f2b179',
        16: '#f59563',
        32: '#f67c5f',
        64: '#f65e3b',
        128:'#edcf72',
        256:'#edcc61',
        512:'#edc850',
        1024:'#edc53f',
        2048:'#edc22e',
        4096:'#3c3a32',
        8192:'#3c3a32'
    };
    cell.style.background = colors[value] || '#3c3a32';
    cell.style.color = value <= 4 ? '#776e65' : '#fff';
}

function updateScore() {
    scoreSpan.textContent = score;
    updateHighscore();
}

function loadHighscore() {
    highscore = parseInt(localStorage.getItem('highscore-2048') || '0');
    highscoreSpan.textContent = highscore;
}

function updateHighscore() {
    if (score > highscore) {
        highscore = score;
        highscoreSpan.textContent = highscore;
        localStorage.setItem('highscore-2048', highscore);
    }
}

function canMove() {
    for (let i = 0; i < SIZE; i++) {
        for (let j = 0; j < SIZE; j++) {
            if (board[i][j] === 0) return true;
            if (i < SIZE-1 && board[i][j] === board[i+1][j]) return true;
            if (j < SIZE-1 && board[i][j] === board[i][j+1]) return true;
        }
    }
    return false;
}

function checkWin() {
    for (let i = 0; i < SIZE; i++) {
        for (let j = 0; j < SIZE; j++) {
            if (board[i][j] === 2048) return true;
        }
    }
    return false;
}

function showGameOver(isWin) {
    const overText = document.getElementById('game-over-text-2048');
    if (isWin) {
        overText.textContent = '恭喜你，获得2048！';
    } else {
        overText.textContent = '游戏结束！';
    }
    gameOverDiv.style.display = 'block';
}

function move(dir) {
    if (gameOver) return;
    let moved = false;
    let merged = Array.from({length: SIZE}, () => Array(SIZE).fill(false));
    if (dir === 'left') {
        for (let i = 0; i < SIZE; i++) {
            for (let j = 1; j < SIZE; j++) {
                if (board[i][j] === 0) continue;
                let k = j;
                while (k > 0 && board[i][k-1] === 0) {
                    board[i][k-1] = board[i][k];
                    board[i][k] = 0;
                    k--;
                    moved = true;
                }
                if (k > 0 && board[i][k-1] === board[i][k] && !merged[i][k-1] && !merged[i][k]) {
                    board[i][k-1] *= 2;
                    score += board[i][k-1];
                    board[i][k] = 0;
                    merged[i][k-1] = true;
                    moved = true;
                }
            }
        }
    } else if (dir === 'right') {
        for (let i = 0; i < SIZE; i++) {
            for (let j = SIZE-2; j >= 0; j--) {
                if (board[i][j] === 0) continue;
                let k = j;
                while (k < SIZE-1 && board[i][k+1] === 0) {
                    board[i][k+1] = board[i][k];
                    board[i][k] = 0;
                    k++;
                    moved = true;
                }
                if (k < SIZE-1 && board[i][k+1] === board[i][k] && !merged[i][k+1] && !merged[i][k]) {
                    board[i][k+1] *= 2;
                    score += board[i][k+1];
                    board[i][k] = 0;
                    merged[i][k+1] = true;
                    moved = true;
                }
            }
        }
    } else if (dir === 'up') {
        for (let j = 0; j < SIZE; j++) {
            for (let i = 1; i < SIZE; i++) {
                if (board[i][j] === 0) continue;
                let k = i;
                while (k > 0 && board[k-1][j] === 0) {
                    board[k-1][j] = board[k][j];
                    board[k][j] = 0;
                    k--;
                    moved = true;
                }
                if (k > 0 && board[k-1][j] === board[k][j] && !merged[k-1][j] && !merged[k][j]) {
                    board[k-1][j] *= 2;
                    score += board[k-1][j];
                    board[k][j] = 0;
                    merged[k-1][j] = true;
                    moved = true;
                }
            }
        }
    } else if (dir === 'down') {
        for (let j = 0; j < SIZE; j++) {
            for (let i = SIZE-2; i >= 0; i--) {
                if (board[i][j] === 0) continue;
                let k = i;
                while (k < SIZE-1 && board[k+1][j] === 0) {
                    board[k+1][j] = board[k][j];
                    board[k][j] = 0;
                    k++;
                    moved = true;
                }
                if (k < SIZE-1 && board[k+1][j] === board[k][j] && !merged[k+1][j] && !merged[k][j]) {
                    board[k+1][j] *= 2;
                    score += board[k+1][j];
                    board[k][j] = 0;
                    merged[k+1][j] = true;
                    moved = true;
                }
            }
        }
    }
    if (moved) {
        addRandomTile();
        updateBoard();
        updateScore();
        if (checkWin()) {
            gameOver = true;
            showGameOver(true);
        } else if (!canMove()) {
            gameOver = true;
            showGameOver(false);
        }
    }
    // 新增：无论是否移动，只要不能再移动就判定失败
    if (!canMove() && !gameOver) {
        gameOver = true;
        showGameOver(false);
    }
}

document.addEventListener('keydown', function(e) {
    if (gameOver) return;
    let moved = false;
    if (e.key === 'ArrowLeft') {
        move('left');
        moved = true;
    } else if (e.key === 'ArrowRight') {
        move('right');
        moved = true;
    } else if (e.key === 'ArrowUp') {
        move('up');
        moved = true;
    } else if (e.key === 'ArrowDown') {
        move('down');
        moved = true;
    }
    if (moved) e.preventDefault();
});

restartBtn.onclick = function() { gameOverDiv.style.display = 'none'; init2048(); };
restartBtn2.onclick = function() { gameOverDiv.style.display = 'none'; init2048(); };

window.onload = function() {
    loadHighscore();
    init2048();
};

// 鼠标滑动控制
let dragStartX = null, dragStartY = null;
boardDiv.addEventListener('mousedown', function(e) {
    dragStartX = e.clientX;
    dragStartY = e.clientY;
});
boardDiv.addEventListener('mouseup', function(e) {
    if (dragStartX === null || dragStartY === null) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return; // 忽略微小移动
    if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) move('right');
        else move('left');
    } else {
        if (dy > 0) move('down');
        else move('up');
    }
    dragStartX = dragStartY = null;
});
boardDiv.addEventListener('mouseleave', function() {
    dragStartX = dragStartY = null;
}); 