// Estado global do NeuroGame
let neuroGameState = {
    isNeuroBotOpen: false,
    messages: [],
    kanbanTasks: {
        todo: JSON.parse(localStorage.getItem('neuroKanbanTodo')) || [],
        doing: JSON.parse(localStorage.getItem('neuroKanbanDoing')) || [],
        done: JSON.parse(localStorage.getItem('neuroKanbanDone')) || []
    },
    progress: JSON.parse(localStorage.getItem('neuroProgress')) || {
        gamesPlayed: 0,
        pomodorosCompleted: 0,
        tasksCompleted: 0,
        achievements: []
    },
    pomodoroTimer: {
        minutes: 25,
        seconds: 0,
        isRunning: false,
        interval: null
    }
};

// Base de conhecimento específica para TDAH
const neuroBotKnowledge = {
    tdah: {
        'o que é tdah': 'TDAH (Transtorno de Déficit de Atenção e Hiperatividade) é um transtorno neurobiológico que afeta a capacidade de concentração, controle de impulsos e níveis de atividade. É comum em crianças e adolescentes.',
        'sintomas tdah': 'Os principais sintomas incluem: dificuldade de concentração, hiperatividade, impulsividade, desorganização, esquecimento e dificuldade para completar tarefas.',
        'como lidar tdah': 'Estratégias eficazes incluem: rotinas estruturadas, técnicas de organização, exercícios físicos, técnica Pomodoro, jogos cognitivos e apoio profissional.',
        'jogos tdah': 'Jogos cognitivos ajudam a desenvolver atenção, memória e funções executivas. Recomendo começar com o Jogo da Memória ou Foco Rápido!',
        'pomodoro tdah': 'A técnica Pomodoro é excelente para TDAH: 25 minutos de foco + 5 minutos de pausa. Ajuda a manter a concentração sem sobrecarregar.',
        'organização tdah': 'Use ferramentas visuais como Kanban, listas coloridas, lembretes e divida tarefas grandes em pequenas. A organização visual é fundamental!'
    },
    jogos: {
        'jogo memória': 'O Jogo da Memória desenvolve memória visual e concentração. Ideal para treinar a atenção sustentada, uma habilidade importante para quem tem TDAH.',
        'foco rápido': 'O Foco Rápido treina atenção seletiva e velocidade de processamento. Ajuda a melhorar a capacidade de filtrar distrações.',
        'organize rotina': 'O jogo Organize a Rotina ensina planejamento e priorização de tarefas, habilidades executivas essenciais para o TDAH.',
        'sequência lógica': 'Sequência Lógica desenvolve raciocínio sequencial e memória de trabalho, fundamentais para organização mental.'
    },
    ferramentas: {
        'pomodoro': 'A técnica Pomodoro divide o trabalho em blocos de 25 minutos com pausas de 5 minutos. Perfeita para manter o foco sem se cansar!',
        'kanban': 'O Kanban é um método visual de organização com colunas: Para Fazer, Fazendo e Feito. Ajuda a visualizar o progresso das tarefas.',
        'dicas organização': 'Use cores, símbolos visuais, alarmes e lembretes. Divida tarefas grandes em pequenas e celebre cada conquista!'
    }
};

// Respostas automáticas do NeuroBot
const neuroBotResponses = {
    'oi': 'Olá! Sou o NeuroBot, seu assistente especializado em TDAH! 🤖✨ Como posso ajudar você hoje?',
    'olá': 'Oi! Estou aqui para ajudar com jogos, organização e dicas para TDAH. O que você gostaria de fazer?',
    'ajuda': 'Posso ajudar você com: 🎮 Sugestões de jogos cognitivos, ⏰ Técnica Pomodoro, 📝 Organização de tarefas, 💡 Dicas para TDAH, 📊 Acompanhamento de progresso!',
    'obrigado': 'De nada! Estou sempre aqui para apoiar você. Lembre-se: pequenos passos levam a grandes conquistas! 🌟',
    'tchau': 'Até logo! Continue praticando e se organizando. Você está indo muito bem! 🚀'
};

// Inicialização do NeuroGame
document.addEventListener('DOMContentLoaded', function() {
    initializeNeuroGame();
    updateProgressDisplay();
    updateNeuroBotBadge();
});

function initializeNeuroGame() {
    // Event listeners para navegação
    document.querySelector('.hamburger').addEventListener('click', toggleMobileMenu);
    
    // Event listeners para o NeuroBot
    document.getElementById('neuroBotInput').addEventListener('keypress', handleNeuroBotKeyPress);
    
    // Carregar dados salvos
    renderKanbanBoard();
    updatePomodoroDisplay();
}

// Funções de navegação
function scrollToSection(sectionId) {
    document.getElementById(sectionId).scrollIntoView({
        behavior: 'smooth'
    });
}

function toggleMobileMenu() {
    const navMenu = document.querySelector('.nav-menu');
    navMenu.classList.toggle('active');
}

// Funções do NeuroBot
function openNeuroBot() {
    neuroGameState.isNeuroBotOpen = true;
    document.getElementById('neuroBotToggle').style.display = 'none';
    document.getElementById('neuroBotContainer').style.display = 'flex';
    document.getElementById('neuroBotBadge').style.display = 'none';
    
    setTimeout(() => {
        document.getElementById('neuroBotInput').focus();
    }, 300);
}

function closeNeuroBot() {
    neuroGameState.isNeuroBotOpen = false;
    document.getElementById('neuroBotContainer').style.display = 'none';
    document.getElementById('neuroBotToggle').style.display = 'flex';
}

function toggleNeuroBot() {
    if (neuroGameState.isNeuroBotOpen) {
        closeNeuroBot();
    } else {
        openNeuroBot();
    }
}

function handleNeuroBotKeyPress(event) {
    if (event.key === 'Enter') {
        sendNeuroBotMessage();
    }
}

function sendNeuroBotMessage() {
    const input = document.getElementById('neuroBotInput');
    const message = input.value.trim();
    
    if (message === '') return;
    
    addNeuroBotMessage(message, 'user');
    input.value = '';
    
    setTimeout(() => {
        const response = processNeuroBotMessage(message);
        addNeuroBotMessage(response, 'bot');
    }, 500);
}

function sendQuickMessage(message) {
    addNeuroBotMessage(message, 'user');
    
    setTimeout(() => {
        const response = processQuickAction(message);
        addNeuroBotMessage(response, 'bot');
    }, 500);
}

function addNeuroBotMessage(content, sender) {
    const messagesContainer = document.getElementById('neuroBotMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    avatarDiv.innerHTML = sender === 'bot' ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = `<p>${content}</p>`;
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    neuroGameState.messages.push({
        content: content,
        sender: sender,
        timestamp: new Date()
    });
}

function processNeuroBotMessage(message) {
    const lowerMessage = message.toLowerCase();
    
    // Verificar respostas automáticas
    for (const [key, response] of Object.entries(neuroBotResponses)) {
        if (lowerMessage.includes(key)) {
            return response;
        }
    }
    
    // Buscar na base de conhecimento
    const knowledgeResponse = searchNeuroBotKnowledge(lowerMessage);
    if (knowledgeResponse) {
        return knowledgeResponse;
    }
    
    // Comandos específicos
    if (lowerMessage.includes('jogo') || lowerMessage.includes('jogar')) {
        return 'Que tal experimentar nossos jogos cognitivos? 🎮 Recomendo começar com o Jogo da Memória - é ótimo para treinar concentração! Clique em "Jogos" no menu acima.';
    }
    
    if (lowerMessage.includes('pomodoro') || lowerMessage.includes('foco')) {
        startPomodoro();
        return '⏰ Iniciando seu Pomodoro! 25 minutos de foco total. Você consegue! 💪';
    }
    
    if (lowerMessage.includes('tarefa') || lowerMessage.includes('organizar')) {
        openKanban();
        return '📋 Abrindo seu organizador de tarefas! Use o método Kanban para visualizar seu progresso.';
    }
    
    if (lowerMessage.includes('progresso') || lowerMessage.includes('conquista')) {
        openProgress();
        return '📊 Aqui está seu progresso! Continue assim, você está indo muito bem! 🌟';
    }
    
    // Resposta padrão inteligente
    return generateSmartNeuroBotResponse(message);
}

function searchNeuroBotKnowledge(message) {
    for (const [category, items] of Object.entries(neuroBotKnowledge)) {
        for (const [key, value] of Object.entries(items)) {
            if (message.includes(key) || key.split(' ').some(word => message.includes(word))) {
                return value;
            }
        }
    }
    return null;
}

function generateSmartNeuroBotResponse(message) {
    const responses = [
        'Interessante! Para TDAH, recomendo usar técnicas visuais e dividir tarefas em pequenos passos. Posso ajudar você com isso! 🎯',
        'Ótima pergunta! Que tal experimentar nossos jogos cognitivos ou a técnica Pomodoro? São ferramentas muito eficazes para TDAH! 🧠',
        'Entendo sua dúvida! Para pessoas com TDAH, a organização visual e rotinas estruturadas são fundamentais. Vamos trabalhar nisso juntos! 📝',
        'Vou anotar isso! Enquanto isso, que tal verificar suas conquistas ou organizar suas tarefas? Pequenos passos fazem a diferença! ✨'
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
}

function processQuickAction(action) {
    switch (action) {
        case 'Sugerir jogo':
            const games = ['Jogo da Memória', 'Foco Rápido', 'Organize a Rotina', 'Sequência Lógica'];
            const randomGame = games[Math.floor(Math.random() * games.length)];
            return `🎮 Recomendo o "${randomGame}"! É perfeito para treinar suas habilidades cognitivas. Vá para a seção Jogos e divirta-se!`;
        
        case 'Iniciar Pomodoro':
            startPomodoro();
            return '⏰ Pomodoro iniciado! 25 minutos de foco total. Elimine distrações e concentre-se na sua tarefa. Você consegue! 💪';
        
        case 'Dicas TDAH':
            openTips();
            return '💡 Abrindo dicas especializadas para TDAH! Lembre-se: organização visual, rotinas estruturadas e pausas regulares são suas melhores amigas!';
        
        default:
            return 'Como posso ajudar você com isso? Estou aqui para apoiar seu desenvolvimento cognitivo! 🌟';
    }
}

// Funções dos jogos
function openGame(gameType) {
    neuroGameState.progress.gamesPlayed++;
    updateProgress();
    
    switch (gameType) {
        case 'memory':
            alert('🧠 Jogo da Memória em desenvolvimento! Em breve você poderá treinar sua memória visual aqui.');
            break;
        case 'focus':
            alert('🎯 Foco Rápido em desenvolvimento! Em breve você poderá treinar sua atenção aqui.');
            break;
        case 'organize':
            alert('📋 Organize a Rotina em desenvolvimento! Em breve você poderá praticar organização aqui.');
            break;
        case 'sequence':
            alert('🔢 Sequência Lógica em desenvolvimento! Em breve você poderá treinar raciocínio lógico aqui.');
            break;
    }
    
    checkAchievements();
}

// Funções do Pomodoro
function startPomodoro() {
    if (neuroGameState.pomodoroTimer.isRunning) return;
    
    neuroGameState.pomodoroTimer.isRunning = true;
    neuroGameState.pomodoroTimer.interval = setInterval(updatePomodoroTimer, 1000);
    
    updatePomodoroDisplay();
}

function pausePomodoro() {
    neuroGameState.pomodoroTimer.isRunning = false;
    clearInterval(neuroGameState.pomodoroTimer.interval);
    updatePomodoroDisplay();
}

function resetPomodoro() {
    neuroGameState.pomodoroTimer.isRunning = false;
    clearInterval(neuroGameState.pomodoroTimer.interval);
    neuroGameState.pomodoroTimer.minutes = 25;
    neuroGameState.pomodoroTimer.seconds = 0;
    updatePomodoroDisplay();
}

function updatePomodoroTimer() {
    if (neuroGameState.pomodoroTimer.seconds > 0) {
        neuroGameState.pomodoroTimer.seconds--;
    } else if (neuroGameState.pomodoroTimer.minutes > 0) {
        neuroGameState.pomodoroTimer.minutes--;
        neuroGameState.pomodoroTimer.seconds = 59;
    } else {
        // Pomodoro completo
        neuroGameState.pomodoroTimer.isRunning = false;
        clearInterval(neuroGameState.pomodoroTimer.interval);
        neuroGameState.progress.pomodorosCompleted++;
        updateProgress();
        checkAchievements();
        
        alert('🎉 Pomodoro completo! Parabéns! Faça uma pausa de 5 minutos.');
        resetPomodoro();
        return;
    }
    
    updatePomodoroDisplay();
}

function updatePomodoroDisplay() {
    const display = document.querySelector('.timer-display');
    const minutes = String(neuroGameState.pomodoroTimer.minutes).padStart(2, '0');
    const seconds = String(neuroGameState.pomodoroTimer.seconds).padStart(2, '0');
    display.textContent = `${minutes}:${seconds}`;
}

// Funções do Kanban
function openKanban() {
    openModal('kanbanModal');
    renderKanbanBoard();
}

function addKanbanTask(column) {
    const input = document.getElementById('newTaskInput');
    const text = input.value.trim();
    
    if (text === '') return;
    
    const task = {
        id: Date.now(),
        text: text,
        createdAt: new Date()
    };
    
    neuroGameState.kanbanTasks[column].push(task);
    localStorage.setItem(`neuroKanban${column.charAt(0).toUpperCase() + column.slice(1)}`, 
                         JSON.stringify(neuroGameState.kanbanTasks[column]));
    
    input.value = '';
    renderKanbanBoard();
    updateNeuroBotBadge();
}

function renderKanbanBoard() {
    const columns = ['todo', 'doing', 'done'];
    
    columns.forEach(column => {
        const container = document.getElementById(`${column}Tasks`);
        const tasks = neuroGameState.kanbanTasks[column];
        
        // Limpar container (exceto input para todo)
        if (column === 'todo') {
            const taskElements = container.querySelectorAll('.kanban-task');
            taskElements.forEach(el => el.remove());
        } else {
            container.innerHTML = '';
        }
        
        tasks.forEach(task => {
            const taskDiv = document.createElement('div');
            taskDiv.className = 'kanban-task';
            taskDiv.draggable = true;
            taskDiv.dataset.taskId = task.id;
            taskDiv.dataset.column = column;
            
            taskDiv.innerHTML = `
                <div>${task.text}</div>
                <button onclick="deleteKanbanTask('${column}', ${task.id})" style="float: right; background: #ef4444; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; font-size: 12px; cursor: pointer;">×</button>
            `;
            
            // Event listeners para drag and drop
            taskDiv.addEventListener('dragstart', handleDragStart);
            taskDiv.addEventListener('dragover', handleDragOver);
            taskDiv.addEventListener('drop', handleDrop);
            
            container.appendChild(taskDiv);
        });
    });
}

function deleteKanbanTask(column, taskId) {
    neuroGameState.kanbanTasks[column] = neuroGameState.kanbanTasks[column].filter(task => task.id !== taskId);
    localStorage.setItem(`neuroKanban${column.charAt(0).toUpperCase() + column.slice(1)}`, 
                         JSON.stringify(neuroGameState.kanbanTasks[column]));
    renderKanbanBoard();
    updateNeuroBotBadge();
}

function moveKanbanTask(taskId, fromColumn, toColumn) {
    const taskIndex = neuroGameState.kanbanTasks[fromColumn].findIndex(task => task.id == taskId);
    if (taskIndex === -1) return;
    
    const task = neuroGameState.kanbanTasks[fromColumn].splice(taskIndex, 1)[0];
    neuroGameState.kanbanTasks[toColumn].push(task);
    
    // Salvar no localStorage
    localStorage.setItem(`neuroKanban${fromColumn.charAt(0).toUpperCase() + fromColumn.slice(1)}`, 
                         JSON.stringify(neuroGameState.kanbanTasks[fromColumn]));
    localStorage.setItem(`neuroKanban${toColumn.charAt(0).toUpperCase() + toColumn.slice(1)}`, 
                         JSON.stringify(neuroGameState.kanbanTasks[toColumn]));
    
    // Se moveu para "done", incrementar contador
    if (toColumn === 'done') {
        neuroGameState.progress.tasksCompleted++;
        updateProgress();
        checkAchievements();
    }
    
    renderKanbanBoard();
    updateNeuroBotBadge();
}

// Drag and Drop handlers
let draggedElement = null;

function handleDragStart(e) {
    draggedElement = e.target;
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDrop(e) {
    e.preventDefault();
    
    if (!draggedElement) return;
    
    const dropTarget = e.target.closest('.kanban-tasks');
    if (!dropTarget) return;
    
    const fromColumn = draggedElement.dataset.column;
    const taskId = draggedElement.dataset.taskId;
    
    let toColumn;
    if (dropTarget.id === 'todoTasks') toColumn = 'todo';
    else if (dropTarget.id === 'doingTasks') toColumn = 'doing';
    else if (dropTarget.id === 'doneTasks') toColumn = 'done';
    
    if (fromColumn !== toColumn) {
        moveKanbanTask(taskId, fromColumn, toColumn);
    }
    
    draggedElement = null;
}

// Funções de modais
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function openTips() {
    openModal('tipsModal');
}

function openProgress() {
    openModal('progressModal');
    updateProgressDisplay();
}

// Funções de progresso e conquistas
function updateProgress() {
    localStorage.setItem('neuroProgress', JSON.stringify(neuroGameState.progress));
}

function updateProgressDisplay() {
    document.getElementById('gamesPlayed').textContent = neuroGameState.progress.gamesPlayed;
    document.getElementById('pomodorosCompleted').textContent = neuroGameState.progress.pomodorosCompleted;
    document.getElementById('tasksCompleted').textContent = neuroGameState.progress.tasksCompleted;
    
    updateAchievementsDisplay();
}

function checkAchievements() {
    const achievements = [
        {
            id: 'first_game',
            name: 'Primeiro Jogo',
            description: 'Jogue seu primeiro jogo',
            condition: () => neuroGameState.progress.gamesPlayed >= 1,
            icon: 'fas fa-medal'
        },
        {
            id: 'pomodoro_streak',
            name: 'Sequência de 3',
            description: 'Complete 3 Pomodoros seguidos',
            condition: () => neuroGameState.progress.pomodorosCompleted >= 3,
            icon: 'fas fa-fire'
        },
        {
            id: 'task_master',
            name: 'Organizador',
            description: 'Complete 10 tarefas',
            condition: () => neuroGameState.progress.tasksCompleted >= 10,
            icon: 'fas fa-star'
        }
    ];
    
    achievements.forEach(achievement => {
        if (achievement.condition() && !neuroGameState.progress.achievements.includes(achievement.id)) {
            neuroGameState.progress.achievements.push(achievement.id);
            updateProgress();
            showAchievementNotification(achievement);
        }
    });
    
    updateAchievementsDisplay();
}

function updateAchievementsDisplay() {
    const achievementList = document.getElementById('achievementList');
    const achievements = [
        { id: 'first_game', name: 'Primeiro Jogo', description: 'Jogue seu primeiro jogo', icon: 'fas fa-medal' },
        { id: 'pomodoro_streak', name: 'Sequência de 3', description: 'Complete 3 Pomodoros seguidos', icon: 'fas fa-fire' },
        { id: 'task_master', name: 'Organizador', description: 'Complete 10 tarefas', icon: 'fas fa-star' }
    ];
    
    achievementList.innerHTML = '';
    
    achievements.forEach(achievement => {
        const isUnlocked = neuroGameState.progress.achievements.includes(achievement.id);
        const achievementDiv = document.createElement('div');
        achievementDiv.className = `achievement ${isUnlocked ? 'unlocked' : 'locked'}`;
        
        achievementDiv.innerHTML = `
            <i class="${achievement.icon}"></i>
            <span>${achievement.name} (${achievement.description})</span>
        `;
        
        achievementList.appendChild(achievementDiv);
    });
}

function showAchievementNotification(achievement) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
        color: #333;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 8px 25px rgba(255, 215, 0, 0.4);
        z-index: 10000;
        font-family: 'Poppins', sans-serif;
        font-size: 14px;
        max-width: 300px;
        animation: slideInRight 0.3s ease-out;
    `;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="${achievement.icon}" style="font-size: 1.5rem;"></i>
            <div>
                <div style="font-weight: 600;">🏆 Conquista Desbloqueada!</div>
                <div>${achievement.name}</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 4000);
}

function updateNeuroBotBadge() {
    const badge = document.getElementById('neuroBotBadge');
    const pendingTasks = neuroGameState.kanbanTasks.todo.length + neuroGameState.kanbanTasks.doing.length;
    
    if (pendingTasks > 0) {
        badge.textContent = pendingTasks;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// Fechar modais clicando fora
window.addEventListener('click', function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
});

// Adicionar estilos para animações de notificação
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .nav-menu.active {
        display: flex;
        flex-direction: column;
        position: absolute;
        top: 100%;
        left: 0;
        width: 100%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 1rem;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    
    @media (max-width: 768px) {
        .nav-menu {
            display: none;
        }
    }
`;
document.head.appendChild(style);




