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
    },
    authMode: 'login' // 'login' ou 'register'
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
    applySavedTheme(); // Aplicar o tema salvo ao carregar
});

function initializeNeuroGame() {
    // Event listeners para navegação
    document.querySelector('.hamburger').addEventListener('click', toggleMobileMenu);
    
    // Event listeners para o NeuroBot
    document.getElementById('neuroBotInput').addEventListener('keypress', handleNeuroBotKeyPress);
    
    // Carregar dados salvos
    renderKanbanBoard();
    updatePomodoroDisplay();

    // Event listeners para o Modal de Login/Cadastro
    document.getElementById('authEmail').addEventListener('input', validateLoginForm);
    document.getElementById('authPassword').addEventListener('input', validateLoginForm);
    document.getElementById('authName').addEventListener('input', validateLoginForm);
    document.getElementById('authConfirmPassword').addEventListener('input', validateLoginForm);
    document.getElementById('authSubmitButton').addEventListener('click', performAuth);
    document.getElementById('toggleAuthLink').addEventListener('click', toggleAuthMode);

    // Event listener para o botão de tema
    document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);
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
    if (modalId === 'loginModal') {
        setupLoginModal();
    }
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
        background: linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%);
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

// Funções de Tema (Claro/Escuro)
function toggleTheme() {
    const body = document.body;
    const themeIconMoon = document.getElementById('theme-icon-moon');
    const themeIconSun = document.getElementById('theme-icon-sun');

    if (body.classList.contains('light-mode')) {
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
        localStorage.setItem('siteTheme', 'dark');
        themeIconMoon.style.display = 'block';
        themeIconSun.style.display = 'none';
    } else {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
        localStorage.setItem('siteTheme', 'light');
        themeIconMoon.style.display = 'none';
        themeIconSun.style.display = 'block';
    }
}

function applySavedTheme() {
    const savedTheme = localStorage.getItem('siteTheme');
    const body = document.body;
    const themeIconMoon = document.getElementById('theme-icon-moon');
    const themeIconSun = document.getElementById('theme-icon-sun');

    if (savedTheme === 'light') {
        body.classList.add('light-mode');
        themeIconMoon.style.display = 'none';
        themeIconSun.style.display = 'block';
    } else {
        // Padrão para dark-mode se não houver tema salvo ou se for "dark"
        body.classList.add('dark-mode');
        themeIconMoon.style.display = 'block';
        themeIconSun.style.display = 'none';
    }
}

// Funções de Login/Cadastro
function setupLoginModal() {
    neuroGameState.authMode = 'login';
    updateAuthModalUI();
    validateLoginForm();
    document.getElementById('authEmail').value = '';
    document.getElementById('authPassword').value = '';
    document.getElementById('authName').value = '';
    document.getElementById('authConfirmPassword').value = '';
    document.getElementById('authMessage').textContent = '';
}

function toggleAuthMode(event) {
    event.preventDefault();
    neuroGameState.authMode = neuroGameState.authMode === 'login' ? 'register' : 'login';
    updateAuthModalUI();
    validateLoginForm(); // Revalidar ao mudar o modo
    document.getElementById('authMessage').textContent = ''; // Limpar mensagens de status
}

function updateAuthModalUI() {
    const title = document.getElementById('authModalTitle');
    const nameLabel = document.getElementById('authNameLabel');
    const nameInput = document.getElementById('authName');
    const confirmPasswordLabel = document.getElementById('authConfirmPasswordLabel');
    const confirmPasswordInput = document.getElementById('authConfirmPassword');
    const submitButton = document.getElementById('authSubmitButton');
    const toggleAuthText = document.getElementById('toggleAuthText');
    const toggleAuthLink = document.getElementById('toggleAuthLink');

    if (neuroGameState.authMode === 'login') {
        title.textContent = '🔐 Login';
        nameLabel.style.display = 'none';
        nameInput.style.display = 'none';
        nameInput.removeAttribute('required');
        confirmPasswordLabel.style.display = 'none';
        confirmPasswordInput.style.display = 'none';
        confirmPasswordInput.removeAttribute('required');
        submitButton.textContent = 'Entrar';
        toggleAuthText.textContent = 'Não tem uma conta?';
        toggleAuthLink.textContent = 'Cadastre-se';
    } else {
        title.textContent = '📝 Cadastro';
        nameLabel.style.display = 'block';
        nameInput.style.display = 'block';
        nameInput.setAttribute('required', 'required');
        confirmPasswordLabel.style.display = 'block';
        confirmPasswordInput.style.display = 'block';
        confirmPasswordInput.setAttribute('required', 'required');
        submitButton.textContent = 'Cadastrar';
        toggleAuthText.textContent = 'Já tem uma conta?';
        toggleAuthLink.textContent = 'Faça login';
    }
}

function validateLoginForm() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    const name = document.getElementById('authName').value.trim();
    const confirmPassword = document.getElementById('authConfirmPassword').value.trim();
    const submitButton = document.getElementById('authSubmitButton');
    const authMessage = document.getElementById('authMessage');

    let isValid = true;
    authMessage.textContent = ''; // Limpar mensagens de erro anteriores

    if (email === '' || !email.includes('@') || !email.includes('.')) {
        isValid = false;
    }
    if (password === '' || password.length < 6) {
        isValid = false;
    }

    if (neuroGameState.authMode === 'register') {
        if (name === '') {
            isValid = false;
        }
        if (confirmPassword === '' || password !== confirmPassword) {
            isValid = false;
            if (password !== confirmPassword && password !== '' && confirmPassword !== '') {
                 authMessage.textContent = 'As senhas não coincidem.';
                 authMessage.style.color = 'red';
            }
        }
    }

    submitButton.disabled = !isValid;
}

function performAuth() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    const name = document.getElementById('authName').value.trim();
    const authMessage = document.getElementById('authMessage');

    // Simulação de autenticação
    if (neuroGameState.authMode === 'login') {
        if ((email === 'adulto@teste.com' || email === 'crianca@teste.com') && password === 'senha123') {
            authMessage.textContent = 'Login realizado com sucesso! Bem-vindo(a)!';
            authMessage.style.color = 'green';
            // Em um ambiente real, você redirecionaria o usuário ou fecharia o modal
            setTimeout(() => closeModal('loginModal'), 1500);
        } else {
            authMessage.textContent = 'Email ou senha incorretos.';
            authMessage.style.color = 'red';
        }
    } else { // Register mode
        // Simulação de registro
        if (email === 'adulto@teste.com' || email === 'crianca@teste.com') {
            authMessage.textContent = 'Este email já está em uso.';
            authMessage.style.color = 'red';
        } else {
            authMessage.textContent = `Cadastro de ${name} realizado com sucesso! Faça login para continuar.`;
            authMessage.style.color = 'green';
            // Após o registro, pode-se automaticamente mudar para o modo de login
            setTimeout(() => {
                neuroGameState.authMode = 'login';
                updateAuthModalUI();
                document.getElementById('authEmail').value = email; // Preencher email para login
                document.getElementById('authPassword').value = '';
                validateLoginForm();
            }, 1500);
        }
    }
}

function openMoodTracker() {
    openModal('moodModal');
    renderMoodHistory();
}

function saveMood(mood) {
    const today = new Date().toLocaleDateString();
    const moodEntry = `${today} - ${mood}`;

    let moodHistory = JSON.parse(localStorage.getItem('moodHistory')) || [];
    moodHistory.unshift(moodEntry);
    if (moodHistory.length > 7) moodHistory.pop(); // Limitar a 7 dias

    localStorage.setItem('moodHistory', JSON.stringify(moodHistory));
    renderMoodHistory();
    alert('Humor registrado com sucesso! 😄');
}

function renderMoodHistory() {
    const moodHistory = JSON.parse(localStorage.getItem('moodHistory')) || [];
    const list = document.getElementById('moodHistory');
    list.innerHTML = '';

    moodHistory.forEach(entry => {
        const li = document.createElement('li');
        li.textContent = entry;
        list.appendChild(li);
    });
}
function openNotes() {
    openModal('notesModal');
    renderNotes();
}

function saveNote() {
    const noteText = document.getElementById('newNote').value.trim();
    if (noteText === '') return;

    let notes = JSON.parse(localStorage.getItem('quickNotes')) || [];
    notes.unshift(noteText);
    localStorage.setItem('quickNotes', JSON.stringify(notes));

    document.getElementById('newNote').value = '';
    renderNotes();
}

function renderNotes() {
    const notes = JSON.parse(localStorage.getItem('quickNotes')) || [];
    const list = document.getElementById('notesList');
    list.innerHTML = '';

    notes.forEach((note, index) => {
        const li = document.createElement('li');
        li.style.marginBottom = '8px';
        li.innerHTML = `
            ${note}
            <button style="margin-left:10px; color:white; background:red; border:none; border-radius:4px; padding:2px 6px; cursor:pointer;"
                onclick="deleteNote(${index})">X</button>
        `;
        list.appendChild(li);
    });
}

function deleteNote(index) {
    let notes = JSON.parse(localStorage.getItem('quickNotes')) || [];
    notes.splice(index, 1);
    localStorage.setItem('quickNotes', JSON.stringify(notes));
    renderNotes();
}
// Ao atualizar progresso, adicione um timestamp e salve no histórico:
function logProgressHistory() {
  const today = new Date().toISOString().split('T')[0]; // “2025-06-22”
  const history = JSON.parse(localStorage.getItem('progressHistory')) || {};
  history[today] = {
    tasks: savedState.tasksCompleted,
    pomodoros: savedState.pomodorosCompleted,
    games: savedState.gamesPlayed
  };
  localStorage.setItem('progressHistory', JSON.stringify(history));
}
let targetColor = '';
let colorGameScore = 0;

function openColorGame() {
    openModal('colorGameModal');
    startColorGame();
}

function startColorGame() {
    const colors = ['red', 'blue', 'green', 'yellow'];
    targetColor = colors[Math.floor(Math.random() * colors.length)];
    document.getElementById('targetColor').textContent = `Clique na cor: ${targetColor.toUpperCase()}`;
    colorGameScore = 0;
    document.getElementById('colorGameScore').textContent = colorGameScore;
}

function checkColor(selectedColor) {
    if (selectedColor === targetColor) {
        colorGameScore++;
        document.getElementById('colorGameScore').textContent = colorGameScore;

        // Se quiser, atualizar progresso:
        if (typeof neuroGameState !== 'undefined') {
            neuroGameState.progress.gamesPlayed++;
            updateProgress();
            checkAchievements();
        }

        startColorGame(); // Próxima rodada
    } else {
        alert('Ops! Cor errada. 😅 Tente de novo!');
    }
}
//fim do jogo da atenção às cores

/// Variáveis do jogo de organizar a rotina
let organizeTimerInterval;
let organizeTimeElapsed = 0;

// Variáveis do jogo de verdadeiro ou falso
const trueFalseQuestions = [
    { question: "Estudar com música sempre melhora o foco.", correct: "false", explanation: "Depende da pessoa. Para alguns, pode atrapalhar." },
    { question: "Fazer pausas curtas pode aumentar a produtividade.", correct: "true", explanation: "Técnicas como Pomodoro incentivam pequenas pausas." },
    { question: "Dormir pouco melhora o rendimento.", correct: "false", explanation: "Dormir mal reduz foco e memória." },
    { question: "Organizar suas tarefas ajuda a reduzir o estresse.", correct: "true", explanation: "Ter um plano reduz a ansiedade e aumenta a clareza." }
];
let currentTFIndex = 0;
let trueFalseScore = 0;

// Variáveis do jogo de pares de memória
let memoryPairsBoard = [];
let firstTile = null;
let secondTile = null;
let attempts = 0;

// Variáveis do jogo de caça-palavras
const wordList = [
  "FOCO",
  "ATENÇÃO",
  "ORGANIZAÇÃO",
  "MEMÓRIA",
  "DISCIPLINA",
  "PLANEJAMENTO",
  "CONCENTRAÇÃO",
  "TEMPO",
  "PRODUTIVIDADE",
  "OBJETIVO"
];
let currentWord = "";
let gridLetters = [];
let selectedIndexes = [];

// Variáveis do jogo de sequência numérica
const sequences = [
  { sequence: [2, 4, 6, null], answer: 8 },
  { sequence: [1, 3, 5, null], answer: 7 },
  { sequence: [5, 10, 15, null], answer: 20 },
  { sequence: [10, 9, 8, null], answer: 7 },
  { sequence: [2, 6, 18, null], answer: 54 },
  { sequence: [1, 4, 9, null], answer: 16 },
];
let currentLevel = 0;

// Função geral para abrir os jogos
function openGame(gameName) {
    if (gameName === 'organize') {
        openModal('organizeGameModal');
        startOrganizeDragGame();
    } else if (gameName === 'trueFalse') {
        openModal('trueFalseGameModal');
        startTrueFalseGame();
    } else if (gameName === 'memoryPairs') {
        openModal('memoryPairsGameModal');
        startMemoryPairsGame();
    } else if (gameName === 'wordSearch') {
        openModal('wordSearchModal');
        startWordSearch();
    } else if (gameName === 'sequence') {
        openModal('sequenceGameModal');
        startSequenceGame();
    }
}

// ------------------ Jogo: Organizar a Rotina ------------------

function startOrganizeDragGame() {
    const tasks = ["Estudar", "Jogar", "Lavar a louça", "Fazer exercícios", "Assistir TV", "Ler um livro"];
    const taskList = document.getElementById('taskListToDrag');
    taskList.innerHTML = '';

    tasks.forEach((task, index) => {
        const btn = document.createElement('button');
        btn.textContent = task;
        btn.setAttribute('draggable', true);
        btn.id = 'task-' + index;
        btn.ondragstart = (event) => {
            event.dataTransfer.setData('text/plain', btn.id);
        };
        taskList.appendChild(btn);
    });

    document.getElementById('priorityHigh').innerHTML = '';
    document.getElementById('priorityMedium').innerHTML = '';
    document.getElementById('priorityLow').innerHTML = '';
    document.getElementById('organizeGameResult').innerText = '';

    startOrganizeTimer();
}

function allowDrop(event) {
    event.preventDefault();
}

function drop(event, priority) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('text/plain');
    const taskElement = document.getElementById(taskId);

    const targetList = document.getElementById(
        priority === 'High' ? 'priorityHigh' :
        priority === 'Medium' ? 'priorityMedium' :
        'priorityLow'
    );

    const li = document.createElement('li');
    li.textContent = taskElement.textContent;
    targetList.appendChild(li);

    taskElement.remove();
}

// Cronômetro
function startOrganizeTimer() {
    organizeTimeElapsed = 0;
    document.getElementById('organizeTimer').textContent = formatTime(organizeTimeElapsed);

    organizeTimerInterval = setInterval(() => {
        organizeTimeElapsed++;
        document.getElementById('organizeTimer').textContent = formatTime(organizeTimeElapsed);
    }, 1000);
}

function stopOrganizeTimer() {
    clearInterval(organizeTimerInterval);
}

function formatTime(seconds) {
    const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
}

function finishOrganizeGame() {
    const totalTasks = document.querySelectorAll('#priorityHigh li, #priorityMedium li, #priorityLow li').length;
    if (totalTasks < 6) {
        document.getElementById('organizeGameResult').innerText = "📌 Você ainda não organizou todas as tarefas!";
    } else {
        stopOrganizeTimer();
        document.getElementById('organizeGameResult').innerText = `✅ Parabéns! Você organizou sua rotina em ${formatTime(organizeTimeElapsed)}!`;

        if (typeof neuroGameState !== 'undefined') {
            neuroGameState.progress.gamesPlayed++;
            updateProgress();
            checkAchievements();
        }
    }
}

// ------------------ Jogo: Verdadeiro ou Falso ------------------

function startTrueFalseGame() {
    currentTFIndex = 0;
    trueFalseScore = 0;
    showNextTFQuestion();
}

function showNextTFQuestion() {
    if (currentTFIndex >= trueFalseQuestions.length) {
        document.getElementById('trueFalseQuestion').innerText = "Fim do jogo!";
        document.getElementById('trueFalseFeedback').innerText = `Você acertou ${trueFalseScore} de ${trueFalseQuestions.length} perguntas!`;
        if (typeof neuroGameState !== 'undefined') {
            neuroGameState.progress.gamesPlayed++;
            updateProgress();
            checkAchievements();
        }
        return;
    }

    const q = trueFalseQuestions[currentTFIndex];
    document.getElementById('trueFalseQuestion').innerText = q.question;
    document.getElementById('trueFalseFeedback').innerText = '';
    document.getElementById('trueFalseScore').innerText = `Pergunta ${currentTFIndex + 1} de ${trueFalseQuestions.length}`;
}

function answerTrueFalse(userAnswer) {
    const q = trueFalseQuestions[currentTFIndex];
    if (userAnswer === q.correct) {
        trueFalseScore++;
        document.getElementById('trueFalseFeedback').innerText = `✅ Correto! ${q.explanation}`;
    } else {
        document.getElementById('trueFalseFeedback').innerText = `❌ Errado! ${q.explanation}`;
    }
    currentTFIndex++;
    setTimeout(showNextTFQuestion, 2000);
}

// ------------------ Jogo: Pares de Memória ------------------

function startMemoryPairsGame() {
    memoryPairsBoard = [];
    firstTile = null;
    secondTile = null;
    attempts = 0;
    document.getElementById('memoryPairsFeedback').innerText = '';
    const board = document.getElementById('memoryPairsBoard');
    board.innerHTML = '';

    const values = [1, 1, 2, 2, 3, 3, 4, 4];
    values.sort(() => Math.random() - 0.5);

    values.forEach((value, index) => {
        const tile = document.createElement('div');
        tile.classList.add('memory-tile');
        tile.dataset.value = value;
        tile.dataset.index = index;
        tile.onclick = () => revealTile(tile);
        board.appendChild(tile);
        memoryPairsBoard.push(tile);
    });
}

function revealTile(tile) {
    if (tile.classList.contains('revealed') || secondTile) return;

    tile.classList.add('revealed');
    tile.innerText = tile.dataset.value;

    if (!firstTile) {
        firstTile = tile;
    } else {
        secondTile = tile;
        attempts++;

        if (firstTile.dataset.value === secondTile.dataset.value) {
            firstTile = null;
            secondTile = null;

            if (document.querySelectorAll('.memory-tile.revealed').length === memoryPairsBoard.length) {
                document.getElementById('memoryPairsFeedback').innerText = `✅ Parabéns! Você encontrou todos os pares em ${attempts} tentativas!`;
                if (typeof neuroGameState !== 'undefined') {
                    neuroGameState.progress.gamesPlayed++;
                    updateProgress();
                    checkAchievements();
                }
            }
        } else {
            setTimeout(() => {
                firstTile.classList.remove('revealed');
                secondTile.classList.remove('revealed');
                firstTile.innerText = '';
                secondTile.innerText = '';
                firstTile = null;
                secondTile = null;
            }, 800);
        }
    }
}

// ------------------ Jogo: Caça-Palavras ------------------

function startWordSearch() {
    const grid = document.getElementById('wordGrid');
    grid.innerHTML = '';
    gridLetters = [];
    selectedIndexes = [];

    currentWord = wordList[Math.floor(Math.random() * wordList.length)];
    document.getElementById('wordSearchFeedback').innerText = `Clique nas letras da palavra: ${currentWord}`;

    const possibleLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const totalCells = 36; // Grid 6x6

    // Preenche o grid com letras aleatórias
    for (let i = 0; i < totalCells; i++) {
        let letter = possibleLetters.charAt(Math.floor(Math.random() * possibleLetters.length));
        gridLetters.push(letter);
    }

    // Insere a palavra na linha horizontal em uma posição aleatória
    const maxStartPos = totalCells - currentWord.length;
    const startPosition = Math.floor(Math.random() * maxStartPos);

    for (let i = 0; i < currentWord.length; i++) {
        gridLetters[startPosition + i] = currentWord.charAt(i);
    }

    // Renderiza o grid
    gridLetters.forEach((letter, index) => {
        const cell = document.createElement('div');
        cell.classList.add('word-cell');
        cell.innerText = letter;
        cell.onclick = () => selectLetter(index);
        grid.appendChild(cell);
    });
}

function selectLetter(index) {
    selectedIndexes.push(index);
    const cell = document.getElementsByClassName('word-cell')[index];
    cell.classList.add('selected');

    if (selectedIndexes.length === currentWord.length) {
        let formedWord = selectedIndexes.map(i => gridLetters[i]).join('');
        const feedback = document.getElementById('wordSearchFeedback');
        feedback.classList.remove('success', 'error');

        if (formedWord === currentWord) {
            feedback.innerText = `✅ Parabéns! Você encontrou a palavra "${currentWord}"!`;
            feedback.classList.add('success');

            if (typeof neuroGameState !== 'undefined') {
                neuroGameState.progress.gamesPlayed++;
                updateProgress();
                checkAchievements();
            }
        } else {
            feedback.innerText = `❌ Você formou "${formedWord}". Tente novamente!`;
            feedback.classList.add('error');
        }

        setTimeout(() => startWordSearch(), 2000);
    }
}

// ------------------ Jogo: Sequências Numéricas ------------------

function startSequenceGame() {
    const feedback = document.getElementById('sequenceFeedback');
    feedback.innerText = '';
    feedback.className = 'sequence-feedback';

    if (currentLevel >= sequences.length) {
        currentLevel = 0;
    }

    const level = currentLevel + 1;
    document.getElementById('sequenceLevel').innerText = `Nível: ${level}`;

    const currentSequence = sequences[currentLevel];
    const sequenceDisplay = currentSequence.sequence.map(n => (n === null ? '...' : n)).join(', ');
    document.getElementById('sequenceQuestion').innerText = sequenceDisplay;

    const optionsDiv = document.getElementById('sequenceOptions');
    optionsDiv.innerHTML = '';

    const correctAnswer = currentSequence.answer;
    let options = [correctAnswer];

    while (options.length < 4) {
        const randomOffset = Math.floor(Math.random() * 6) + 1;
        const addOrSub = Math.random() > 0.5 ? 1 : -1;
        const fakeOption = correctAnswer + addOrSub * randomOffset;
        if (!options.includes(fakeOption) && fakeOption > 0) {
            options.push(fakeOption);
        }
    }

    options.sort(() => Math.random() - 0.5);

    options.forEach(option => {
        const btn = document.createElement('button');
        btn.classList.add('sequence-option-btn');
        btn.innerText = option;
        btn.onclick = () => selectOption(option);
        optionsDiv.appendChild(btn);
    });
}

function selectOption(selected) {
    const currentSequence = sequences[currentLevel];
    const feedback = document.getElementById('sequenceFeedback');

    if (selected === currentSequence.answer) {
        feedback.innerText = '✅ Correto!';
        feedback.className = 'sequence-feedback correct';
        currentLevel++;
        setTimeout(() => {
            startSequenceGame();
        }, 1500);
    } else {
        feedback.innerText = `❌ Errado! A resposta correta era ${currentSequence.answer}.`;
        feedback.className = 'sequence-feedback wrong';
        // currentLevel = 0; // Se quiser reiniciar ao errar, descomente
    }
}
