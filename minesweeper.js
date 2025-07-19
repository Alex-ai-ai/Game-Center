// 专业版扫雷核心逻辑（仿 minesweeper.top）
(function() {
    // 颜色映射，1-8
    const NUMBER_COLORS = [
        '', '#1976D2', '#388E3C', '#D32F2F', '#7B1FA2', '#F57C00', '#0288D1', '#000', '#757575'
    ];
    // 读取参数
    function getParam(name, def) {
        const m = location.search.match(new RegExp(`[?&]${name}=([^&]+)`));
        return m ? parseInt(m[1]) : def;
    }
    let ROWS = getParam('rows', 9);
    let COLS = getParam('cols', 9);
    let MINES = getParam('mines', 10);

    // DOM
    const boardDiv = document.getElementById('minesweeper-board');
    const mineCountPanel = document.getElementById('mine-count');
    const timerPanel = document.getElementById('timer');
    const faceBtn = document.getElementById('face-btn');
    const faceIcon = document.getElementById('face-icon');
    const restartBtn = document.getElementById('restart-btn');

    // 状态
    let board, revealed, flagged, mineSet, timer, timerValue, gameOver, firstClick, remainMines;

    // 动态设置棋盘布局
    function setBoardGrid() {
        boardDiv.style.gridTemplateColumns = `repeat(${COLS}, 32px)`;
        boardDiv.style.gridTemplateRows = `repeat(${ROWS}, 32px)`;
    }

    // 初始化数据
    function resetData() {
        board = Array.from({length: ROWS}, () => Array(COLS).fill(0));
        revealed = Array.from({length: ROWS}, () => Array(COLS).fill(false));
        flagged = Array.from({length: ROWS}, () => Array(COLS).fill(false));
        mineSet = new Set();
        timerValue = 0;
        gameOver = false;
        firstClick = true;
        remainMines = MINES;
        updatePanels('reset');
    }

    // 更新顶部面板
    function updatePanels(state) {
        mineCountPanel.textContent = remainMines.toString().padStart(3, '0');
        timerPanel.textContent = timerValue.toString().padStart(3, '0');
        if (state === 'win') faceIcon.textContent = '😎';
        else if (state === 'fail') faceIcon.textContent = '😵';
        else faceIcon.textContent = '😊';
    }

    // 计时器
    function startTimer() {
        if (timer) return;
        timer = setInterval(() => {
            timerValue++;
            timerPanel.textContent = timerValue.toString().padStart(3, '0');
        }, 1000);
    }
    function stopTimer() {
        clearInterval(timer);
        timer = null;
    }

    // 随机布雷，排除首点及其周围
    function layMines(sx, sy) {
        mineSet = new Set();
        while (mineSet.size < MINES) {
            let idx = Math.floor(Math.random() * ROWS * COLS);
            let r = Math.floor(idx / COLS), c = idx % COLS;
            if (Math.abs(r - sx) <= 1 && Math.abs(c - sy) <= 1) continue;
            let key = r * COLS + c;
            if (!mineSet.has(key)) {
                mineSet.add(key);
                board[r][c] = 'M';
            }
        }
        // 计算数字
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (board[r][c] === 'M') continue;
                let cnt = 0;
                for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
                    let nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc] === 'M') cnt++;
                }
                board[r][c] = cnt;
            }
        }
    }

    // 渲染棋盘
    function renderBoard() {
        boardDiv.innerHTML = '';
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.style.width = cell.style.height = '32px';
                cell.style.boxSizing = 'border-box';
                cell.style.background = revealed[r][c] ? '#f5f5f5' : '#bdbdbd';
                cell.style.border = revealed[r][c] ? '2px solid #e0e0e0' : '2px solid #888';
                cell.style.boxShadow = revealed[r][c]
                    ? 'inset 2px 2px 6px #e0e0e0, inset -2px -2px 6px #bdbdbd'
                    : '2px 2px 6px #fff, -2px -2px 6px #888';
                cell.style.display = 'flex';
                cell.style.alignItems = 'center';
                cell.style.justifyContent = 'center';
                cell.style.fontWeight = 'bold';
                cell.style.fontSize = '1.2rem';
                cell.style.userSelect = 'none';
                cell.style.cursor = gameOver ? 'default' : 'pointer';
                // 悬停/按压效果
                cell.onmousedown = e => { if (!gameOver) cell.style.filter = 'brightness(0.95)'; };
                cell.onmouseup = e => { if (!gameOver) cell.style.filter = ''; };
                cell.onmouseleave = e => { cell.style.filter = ''; };
                // 内容
                if (revealed[r][c]) {
                    if (board[r][c] === 'M') {
                        cell.innerHTML = '<span style="font-size:1.3em;color:#222;">💣</span>';
                    } else if (board[r][c] > 0) {
                        cell.textContent = board[r][c];
                        cell.style.color = NUMBER_COLORS[board[r][c]];
                    }
                } else if (flagged[r][c]) {
                    cell.innerHTML = '<span style="font-size:1.2em;color:#D32F2F;">🚩</span>';
                }
                // 事件
                cell.oncontextmenu = e => { e.preventDefault(); };
                cell.onmousedown = e => {
                    if (gameOver) return;
                    if (e.button === 2) { // 右键插旗
                        if (!revealed[r][c]) {
                            flagged[r][c] = !flagged[r][c];
                            remainMines += flagged[r][c] ? -1 : 1;
                            updatePanels();
                            renderBoard();
                        }
                        return;
                    }
                    if (e.button === 0) { // 左键开格
                        if (flagged[r][c] || revealed[r][c]) return;
                        if (firstClick) {
                            layMines(r, c);
                            firstClick = false;
                            startTimer();
                        }
                        openCell(r, c);
                        renderBoard();
                        checkWin();
                    }
                };
                boardDiv.appendChild(cell);
            }
        }
    }

    // 开格
    function openCell(r, c) {
        if (flagged[r][c] || revealed[r][c]) return;
        revealed[r][c] = true;
        if (board[r][c] === 'M') {
            gameOver = true;
            stopTimer();
            updatePanels('fail');
            revealAll();
            renderBoard();
            return;
        }
        if (board[r][c] === 0) {
            for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
                let nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) openCell(nr, nc);
            }
        }
    }

    // 全部翻开
    function revealAll() {
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) revealed[r][c] = true;
    }

    // 检查胜利
    function checkWin() {
        let safe = 0;
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
            if (!revealed[r][c] && board[r][c] !== 'M') safe++;
        }
        if (safe === 0 && !gameOver) {
            gameOver = true;
            stopTimer();
            updatePanels('win');
            revealAll();
            renderBoard();
        }
    }

    // 绑定表情按钮和重开
    faceBtn.onclick = restartBtn.onclick = function() {
        stopTimer();
        resetData();
        setBoardGrid();
        renderBoard();
    };

    // 初始化
    setBoardGrid();
    resetData();
    renderBoard();
})(); 