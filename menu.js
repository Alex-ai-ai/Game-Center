document.addEventListener('DOMContentLoaded', function() {
    const startButton = document.getElementById('start-button');
    
    startButton.addEventListener('click', startGame);
    
    // 添加键盘事件监听
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            startGame();
        }
    });
});

function startGame() {
    window.location.href = 'game.html';
} 