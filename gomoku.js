class Gomoku {
    constructor() {
        this.difficulty = null;
        this.gameMode = null;
        this.setupModeSelection();
    }

    setupModeSelection() {
        const modeButtons = document.querySelectorAll('.mode-button');
        const difficultyOptions = document.getElementById('difficultyOptions');
        const startGameBtn = document.getElementById('startGameBtn');
        const modeDescription = document.getElementById('modeDescription');
        
        modeButtons.forEach(button => {
            button.addEventListener('click', () => {
                // 移除其他按钮的选中状态
                modeButtons.forEach(btn => btn.classList.remove('selected'));
                // 添加当前按钮的选中状态
                button.classList.add('selected');
                // 保存游戏模式
                this.gameMode = button.dataset.mode;

                // 更新模式描述
                if (this.gameMode === 'ai') {
                    modeDescription.textContent = '与电脑对战，选择合适的难度开始游戏';
                    difficultyOptions.classList.add('show');
                    startGameBtn.disabled = true;
                } else {
                    modeDescription.textContent = '与好友一起对战，黑子先手';
                    difficultyOptions.classList.remove('show');
                    startGameBtn.disabled = false;
                }
            });
        });

        // AI难度选择
        const difficultyButtons = document.querySelectorAll('.difficulty-button');
        difficultyButtons.forEach(button => {
            button.addEventListener('click', () => {
                if (this.gameMode !== 'ai') return;
                
                // 移除其他按钮的选中状态
                difficultyButtons.forEach(btn => btn.classList.remove('selected'));
                // 添加当前按钮的选中状态
                button.classList.add('selected');
                // 保存难度设置
                this.difficulty = button.dataset.difficulty;
                // 启用开始游戏按钮
                startGameBtn.disabled = false;
            });
        });

        startGameBtn.addEventListener('click', () => {
            this.initializeGame();
            document.getElementById('difficultyScreen').style.display = 'none';
            document.getElementById('gameContainer').style.display = 'block';
            document.getElementById('modeDisplay').textContent = 
                this.gameMode === 'ai' 
                    ? (this.difficulty === 'easy' ? 'AI简单'
                        : this.difficulty === 'medium' ? 'AI中等' 
                        : 'AI困难')
                    : '双人对战';
        });
    }

    initializeGame() {
        this.canvas = document.getElementById('gameBoard');
        this.ctx = this.canvas.getContext('2d');
        this.boardSize = 15;
        this.cellSize = Math.floor(this.canvas.width / (this.boardSize + 1));
        this.margin = Math.floor(this.cellSize / 2);
        this.board = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(null));
        this.currentPlayer = 'black';
        this.gameOver = false;
        this.moveCount = 0;
        this.startTime = Date.now();
        this.gameTime = 0;
        this.moveHistory = [];
        this.timer = null;

        // 绑定事件
        this.canvas.addEventListener('click', this.handleClick.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.getElementById('restartBtn').addEventListener('click', this.restart.bind(this));
        document.getElementById('undoBtn').addEventListener('click', this.undo.bind(this));
        document.getElementById('playAgainBtn').addEventListener('click', this.restart.bind(this));
        
        // 添加返回按钮事件
        document.getElementById('backToModeBtn').addEventListener('click', () => {
            if (confirm('确定要返回模式选择吗？当前游戏进度将丢失。')) {
                this.restart();
            }
        });

        // 初始化游戏
        this.startTimer();
        this.drawBoard();
    }

    // AI相关方法
    async makeAIMove() {
        if (this.gameOver || this.currentPlayer === 'black') return;

        // 根据难度级别设置AI思考时间
        const thinkingTime = {
            'easy': 500,
            'medium': 300,
            'hard': 100
        }[this.difficulty];

        // 模拟AI思考时间
        await new Promise(resolve => setTimeout(resolve, thinkingTime));

        const move = this.calculateBestMove();
        if (move) {
            this.makeMove(move.row, move.col);
        }
    }

    calculateBestMove() {
        const availableMoves = [];
        
        // 收集所有可用的位置
        for (let i = 0; i < this.boardSize; i++) {
            for (let j = 0; j < this.boardSize; j++) {
                if (!this.board[i][j]) {
                    const score = this.evaluatePosition(i, j);
                    availableMoves.push({ row: i, col: j, score });
                }
            }
        }

        // 根据难度调整AI的选择
        availableMoves.sort((a, b) => b.score - a.score);
        
        if (this.difficulty === 'easy') {
            // 简单模式：70%概率选择次优解
            return Math.random() < 0.7 && availableMoves.length > 1 
                ? availableMoves[1] 
                : availableMoves[0];
        } else if (this.difficulty === 'medium') {
            // 中等模式：随机选择前三个最佳位置
            const topMoves = availableMoves.slice(0, Math.min(3, availableMoves.length));
            return topMoves[Math.floor(Math.random() * topMoves.length)];
        } else {
            // 困难模式：始终选择最佳位置
            return availableMoves[0];
        }
    }

    evaluatePosition(row, col) {
        let score = 0;
        const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];

        // 评估每个方向
        directions.forEach(([dx, dy]) => {
            score += this.evaluateDirection(row, col, dx, dy, 'white'); // AI评分
            score += this.evaluateDirection(row, col, dx, dy, 'black') * 1.1; // 防守评分略高
        });

        // 根据位置给予额外分数
        if ((row === 7 && col === 7) || // 天元
            (row === 3 && col === 3) || // 星位
            (row === 3 && col === 11) ||
            (row === 11 && col === 3) ||
            (row === 11 && col === 11)) {
            score += 10;
        }

        return score;
    }

    evaluateDirection(row, col, dx, dy, color) {
        let score = 0;
        let count = 1;
        let blocked = 0;

        // 正向检查
        for (let i = 1; i < 5; i++) {
            const newRow = row + dx * i;
            const newCol = col + dy * i;
            if (!this.isValidPosition(newRow, newCol)) {
                blocked++;
                break;
            }
            if (this.board[newRow][newCol] === color) {
                count++;
            } else if (this.board[newRow][newCol] !== null) {
                blocked++;
                break;
            } else {
                break;
            }
        }

        // 反向检查
        for (let i = 1; i < 5; i++) {
            const newRow = row - dx * i;
            const newCol = col - dy * i;
            if (!this.isValidPosition(newRow, newCol)) {
                blocked++;
                break;
            }
            if (this.board[newRow][newCol] === color) {
                count++;
            } else if (this.board[newRow][newCol] !== null) {
                blocked++;
                break;
            } else {
                break;
            }
        }

        // 评分规则
        if (count >= 5) return 100000;
        if (count === 4 && blocked === 0) return 10000;
        if (count === 4 && blocked === 1) return 1000;
        if (count === 3 && blocked === 0) return 1000;
        if (count === 3 && blocked === 1) return 100;
        if (count === 2 && blocked === 0) return 100;
        if (count === 2 && blocked === 1) return 10;
        if (count === 1 && blocked === 0) return 10;

        return 0;
    }

    makeMove(row, col) {
        this.board[row][col] = this.currentPlayer;
        this.moveHistory.push({ row, col, player: this.currentPlayer });
        this.moveCount++;
        document.getElementById('moveCount').textContent = this.moveCount;
        this.drawBoard();

        if (this.checkWin(row, col)) {
            this.gameOver = true;
            clearInterval(this.timer);
            this.showWinnerModal();
            return;
        }

        // 切换玩家
        this.currentPlayer = this.currentPlayer === 'black' ? 'white' : 'black';
        document.getElementById('playerTurn').textContent = `当前玩家: ${this.currentPlayer === 'black' ? '黑子' : '白子'}`;

        // 如果是AI模式且切换到AI回合，则执行AI移动
        if (this.gameMode === 'ai' && this.currentPlayer === 'white' && !this.gameOver) {
            this.makeAIMove();
        }
    }

    startTimer() {
        this.startTime = Date.now();
        this.timer = setInterval(() => {
            if (!this.gameOver) {
                this.gameTime = Math.floor((Date.now() - this.startTime) / 1000);
                document.getElementById('gameTime').textContent = this.formatTime(this.gameTime);
            }
        }, 1000);
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    drawBoard() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制棋盘背景
        this.ctx.fillStyle = '#DEB887';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制网格线
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;

        for (let i = 0; i < this.boardSize; i++) {
            // 横线
            this.ctx.beginPath();
            this.ctx.moveTo(this.margin, this.margin + i * this.cellSize);
            this.ctx.lineTo(this.margin + (this.boardSize - 1) * this.cellSize, this.margin + i * this.cellSize);
            this.ctx.stroke();

            // 竖线
            this.ctx.beginPath();
            this.ctx.moveTo(this.margin + i * this.cellSize, this.margin);
            this.ctx.lineTo(this.margin + i * this.cellSize, this.margin + (this.boardSize - 1) * this.cellSize);
            this.ctx.stroke();
        }

        // 绘制天元和星位
        const stars = [
            [3, 3], [11, 3], [7, 7], [3, 11], [11, 11]
        ];
        stars.forEach(([x, y]) => {
            this.ctx.beginPath();
            this.ctx.arc(
                this.margin + x * this.cellSize,
                this.margin + y * this.cellSize,
                4, 0, Math.PI * 2
            );
            this.ctx.fillStyle = '#000';
            this.ctx.fill();
        });

        // 绘制所有已下的棋子
        for (let i = 0; i < this.boardSize; i++) {
            for (let j = 0; j < this.boardSize; j++) {
                if (this.board[i][j]) {
                    this.drawPiece(i, j, this.board[i][j]);
                }
            }
        }

        // 绘制最后一手棋的标记
        if (this.moveHistory.length > 0) {
            const lastMove = this.moveHistory[this.moveHistory.length - 1];
            this.drawLastMoveMarker(lastMove.row, lastMove.col);
        }
    }

    drawPiece(row, col, color) {
        const x = this.margin + col * this.cellSize;
        const y = this.margin + row * this.cellSize;
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.cellSize * 0.4, 0, Math.PI * 2);
        
        // 绘制棋子渐变效果
        const gradient = this.ctx.createRadialGradient(
            x - this.cellSize * 0.2, y - this.cellSize * 0.2,
            this.cellSize * 0.1,
            x, y,
            this.cellSize * 0.4
        );
        
        if (color === 'black') {
            gradient.addColorStop(0, '#666');
            gradient.addColorStop(1, '#000');
        } else {
            gradient.addColorStop(0, '#fff');
            gradient.addColorStop(1, '#ccc');
        }
        
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        // 绘制棋子边框
        this.ctx.strokeStyle = color === 'black' ? '#000' : '#999';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }

    drawLastMoveMarker(row, col) {
        const x = this.margin + col * this.cellSize;
        const y = this.margin + row * this.cellSize;
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, 4, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ff0000';
        this.ctx.fill();
    }

    handleMouseMove(event) {
        if (this.gameOver || (this.gameMode === 'ai' && this.currentPlayer === 'white')) return;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;

        // 计算最近的交叉点
        const col = Math.round((x - this.margin) / this.cellSize);
        const row = Math.round((y - this.margin) / this.cellSize);

        // 清除上一次的预览
        this.drawBoard();

        // 检查位置是否有效且未被占用
        if (row >= 0 && row < this.boardSize && col >= 0 && col < this.boardSize && !this.board[row][col]) {
            // 绘制半透明的预览棋子
            this.ctx.globalAlpha = 0.3;
            this.drawPiece(row, col, this.currentPlayer);
            this.ctx.globalAlpha = 1.0;
        }
    }

    handleClick(event) {
        if (this.gameOver || (this.gameMode === 'ai' && this.currentPlayer === 'white')) return;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;

        // 计算落子的行列位置
        const col = Math.round((x - this.margin) / this.cellSize);
        const row = Math.round((y - this.margin) / this.cellSize);

        // 检查位置是否有效且未被占用
        if (row >= 0 && row < this.boardSize && col >= 0 && col < this.boardSize && !this.board[row][col]) {
            this.makeMove(row, col);
        }
    }

    undo() {
        if (this.moveHistory.length === 0 || this.gameOver) return;

        if (this.gameMode === 'ai') {
            // AI模式下悔棋两步（玩家和AI的最后一步）
            for (let i = 0; i < 2; i++) {
                if (this.moveHistory.length > 0) {
                    const lastMove = this.moveHistory.pop();
                    this.board[lastMove.row][lastMove.col] = null;
                    this.moveCount--;
                }
            }
            this.currentPlayer = 'black'; // 返回到玩家回合
        } else {
            // 双人模式下只悔一步
            const lastMove = this.moveHistory.pop();
            this.board[lastMove.row][lastMove.col] = null;
            this.moveCount--;
            this.currentPlayer = lastMove.player; // 返回到上一个玩家
        }
        
        document.getElementById('moveCount').textContent = this.moveCount;
        document.getElementById('playerTurn').textContent = `当前玩家: ${this.currentPlayer === 'black' ? '黑子' : '白子'}`;
        this.drawBoard();
    }

    checkWin(row, col) {
        const directions = [
            [1, 0],  // 水平
            [0, 1],  // 垂直
            [1, 1],  // 对角线
            [1, -1]  // 反对角线
        ];

        return directions.some(([dx, dy]) => {
            let count = 1;
            const color = this.board[row][col];

            // 正向检查
            for (let i = 1; i < 5; i++) {
                const newRow = row + dx * i;
                const newCol = col + dy * i;
                if (!this.isValidPosition(newRow, newCol) || this.board[newRow][newCol] !== color) break;
                count++;
            }

            // 反向检查
            for (let i = 1; i < 5; i++) {
                const newRow = row - dx * i;
                const newCol = col - dy * i;
                if (!this.isValidPosition(newRow, newCol) || this.board[newRow][newCol] !== color) break;
                count++;
            }

            return count >= 5;
        });
    }

    showWinnerModal() {
        const winnerModal = document.getElementById('winnerModal');
        const overlay = document.getElementById('overlay');
        const winnerText = document.getElementById('winnerText');
        const finalMoveCount = document.getElementById('finalMoveCount');
        const finalGameTime = document.getElementById('finalGameTime');
        const playAgainBtn = document.getElementById('playAgainBtn');
        const backToHomeBtn = winnerModal.querySelector('a.control-button');

        // 移除返回首页按钮
        if (backToHomeBtn) {
            backToHomeBtn.remove();
        }

        winnerText.textContent = `${this.currentPlayer === 'black' ? '黑子' : '白子'}获胜！`;
        finalMoveCount.textContent = this.moveCount;
        finalGameTime.textContent = document.getElementById('gameTime').textContent;

        // 修改"再玩一次"按钮文本
        playAgainBtn.textContent = '返回模式选择';

        overlay.style.display = 'block';
        winnerModal.style.display = 'block';
    }

    isValidPosition(row, col) {
        return row >= 0 && row < this.boardSize && col >= 0 && col < this.boardSize;
    }

    restart() {
        // 重置游戏状态
        document.getElementById('difficultyScreen').style.display = 'block';
        document.getElementById('gameContainer').style.display = 'none';
        document.getElementById('overlay').style.display = 'none';
        document.getElementById('winnerModal').style.display = 'none';
        
        // 重置选择状态
        document.querySelectorAll('.mode-button').forEach(btn => btn.classList.remove('selected'));
        document.querySelectorAll('.difficulty-button').forEach(btn => btn.classList.remove('selected'));
        document.getElementById('difficultyOptions').classList.remove('show');
        document.getElementById('startGameBtn').disabled = true;
        document.getElementById('modeDescription').textContent = '请选择游戏模式';
        
        // 重置游戏数据
        this.gameMode = null;
        this.difficulty = null;
        this.board = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(null));
        this.currentPlayer = 'black';
        this.gameOver = false;
        this.moveCount = 0;
        this.moveHistory = [];
        document.getElementById('moveCount').textContent = '0';
        document.getElementById('playerTurn').textContent = '当前玩家: 黑子';
        clearInterval(this.timer);
    }
}

// 游戏初始化
window.onload = () => {
    new Gomoku();
}; 