// 存储每个难度的最高分
let highScores = {
    easy: localStorage.getItem('tetris_easy') || 0,
    normal: localStorage.getItem('tetris_normal') || 0,
    hard: localStorage.getItem('tetris_hard') || 0
};

// 选择的难度
let selectedDifficulty = 'normal';

// 更新显示的最高分
function updateHighScores() {
    document.getElementById('easy-score').textContent = highScores.easy;
    document.getElementById('normal-score').textContent = highScores.normal;
    document.getElementById('hard-score').textContent = highScores.hard;
}

// 选择难度
function selectDifficulty(difficulty) {
    console.log('Selecting difficulty:', difficulty);
    // 移除所有卡片的active类
    document.querySelectorAll('.difficulty-card').forEach(card => {
        card.classList.remove('active');
    });
    
    // 为选中的卡片添加active类
    const selectedCard = document.querySelector(`.difficulty-card[data-difficulty="${difficulty}"]`);
    if (selectedCard) {
        selectedCard.classList.add('active');
        selectedDifficulty = difficulty;
        console.log('Difficulty selected:', selectedDifficulty);
    } else {
        console.error('Could not find card for difficulty:', difficulty);
    }
}

// 显示规则
function showRules() {
    const rulesModal = document.getElementById('rulesModal');
    rulesModal.style.display = 'flex';
}

// 隐藏规则
function hideRules() {
    const rulesModal = document.getElementById('rulesModal');
    rulesModal.style.display = 'none';
}

// 开始游戏
function startGame() {
    try {
        console.log('Starting game with difficulty:', selectedDifficulty);
        // 将选择的难度存储到 localStorage
        localStorage.setItem('tetris_difficulty', selectedDifficulty);
        // 跳转到游戏页面
        window.location.href = './game.html';
    } catch (error) {
        console.error('Error starting game:', error);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    
    // 更新最高分显示
    updateHighScores();
    
    // 为难度卡片添加点击事件
    document.querySelectorAll('.difficulty-card').forEach(card => {
        card.addEventListener('click', () => {
            const difficulty = card.dataset.difficulty;
            console.log('Difficulty card clicked:', difficulty);
            selectDifficulty(difficulty);
        });
    });
    
    // 为开始游戏按钮添加点击事件
    const startButton = document.querySelector('.start-button');
    if (startButton) {
        startButton.addEventListener('click', startGame);
    }
    
    // 点击模态框外部关闭
    const rulesModal = document.getElementById('rulesModal');
    rulesModal.addEventListener('click', (e) => {
        if (e.target === rulesModal) {
            hideRules();
        }
    });
    
    // 默认选中普通难度
    selectDifficulty('normal');
    
    // 添加全局错误处理
    window.onerror = function(msg, url, line, col, error) {
        console.error('Global error:', {msg, url, line, col, error});
        return false;
    };
});

// 开始游戏按钮点击事件
document.getElementById('start-btn').addEventListener('click', function() {
    // 隐藏菜单容器
    document.getElementById('menu-container').style.display = 'none';
    // 显示游戏画布容器
    document.getElementById('game-play-container').style.display = 'block';
    // 初始化游戏
    if (typeof initGame === 'function') {
        console.log('Starting game with difficulty:', selectedDifficulty);
        initGame(selectedDifficulty);
    } else {
        console.error('Game initialization function not found!');
    }
});

// 在页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    initMenu();
}); 