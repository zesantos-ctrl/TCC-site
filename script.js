/* =============================================================
   NeuroGame — main.js  (refatorado)
   - Estado centralizado com padrão Proxy para reatividade
   - Módulos bem separados por responsabilidade
   - Zero uso de alert() — toasts animados no lugar
   - Tratamento de erros consistente
   - Funções puras onde possível
   - Drag & Drop com API moderna
   - Tema com prefers-color-scheme como padrão inicial
   ============================================================= */

'use strict';

// ─────────────────────────────────────────────
// 1. CONSTANTES E CONFIGURAÇÕES
// ─────────────────────────────────────────────

const CONFIG = {
    POMODORO_MINUTES: 25,
    POMODORO_SECONDS: 0,
    MAX_MOOD_HISTORY: 7,
    TOAST_DURATION: 4000,
    BOT_RESPONSE_DELAY: 500,
    ACHIEVEMENT_DISPLAY_DELAY: 4000,
};

const STORAGE_KEYS = {
    KANBAN_TODO:        'neuroKanbanTodo',
    KANBAN_DOING:       'neuroKanbanDoing',
    KANBAN_DONE:        'neuroKanbanDone',
    PROGRESS:           'neuroProgress',
    THEME:              'siteTheme',
    MOOD_HISTORY:       'moodHistory',
    NOTES:              'quickNotes',
    PROGRESS_HISTORY:   'progressHistory',
};

const ACHIEVEMENTS_REGISTRY = [
    {
        id: 'first_game',
        name: 'Primeiro Jogo',
        description: 'Jogue seu primeiro jogo',
        icon: 'fas fa-medal',
        condition: p => p.gamesPlayed >= 1,
    },
    {
        id: 'pomodoro_streak',
        name: 'Sequência de 3',
        description: 'Complete 3 Pomodoros seguidos',
        icon: 'fas fa-fire',
        condition: p => p.pomodorosCompleted >= 3,
    },
    {
        id: 'task_master',
        name: 'Organizador',
        description: 'Complete 10 tarefas',
        icon: 'fas fa-star',
        condition: p => p.tasksCompleted >= 10,
    },
];

// ─────────────────────────────────────────────
// 2. CAMADA DE PERSISTÊNCIA
// ─────────────────────────────────────────────

const Storage = {
    get(key, fallback = null) {
        try {
            const raw = localStorage.getItem(key);
            return raw !== null ? JSON.parse(raw) : fallback;
        } catch {
            return fallback;
        }
    },
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.warn('Storage.set falhou:', e);
        }
    },
};

// ─────────────────────────────────────────────
// 3. ESTADO GLOBAL
// ─────────────────────────────────────────────

const State = {
    isNeuroBotOpen: false,
    authMode: 'login',

    kanban: {
        todo:  Storage.get(STORAGE_KEYS.KANBAN_TODO,  []),
        doing: Storage.get(STORAGE_KEYS.KANBAN_DOING, []),
        done:  Storage.get(STORAGE_KEYS.KANBAN_DONE,  []),
    },

    progress: Storage.get(STORAGE_KEYS.PROGRESS, {
        gamesPlayed:        0,
        pomodorosCompleted: 0,
        tasksCompleted:     0,
        achievements:       [],
    }),

    pomodoro: {
        minutes:   CONFIG.POMODORO_MINUTES,
        seconds:   CONFIG.POMODORO_SECONDS,
        isRunning: false,
        _interval: null,
    },

    // Jogos
    colorGame:    { target: '', score: 0 },
    trueFalse:    { index: 0, score: 0 },
    memoryPairs:  { board: [], firstTile: null, secondTile: null, attempts: 0 },
    wordSearch:   { currentWord: '', gridLetters: [], selectedIndexes: [] },
    sequence:     { currentLevel: 0 },
    organize:     { timerInterval: null, elapsed: 0 },
};

// ─────────────────────────────────────────────
// 4. UTILITÁRIOS
// ─────────────────────────────────────────────

const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

function padZero(n) {
    return String(n).padStart(2, '0');
}

function formatTime(seconds) {
    return `${padZero(Math.floor(seconds / 60))}:${padZero(seconds % 60)}`;
}

function shuffle(arr) {
    return [...arr].sort(() => Math.random() - 0.5);
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─────────────────────────────────────────────
// 5. SISTEMA DE TOAST (substitui alert())
// ─────────────────────────────────────────────

const Toast = (() => {
    let container;

    function ensureContainer() {
        if (container) return;
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed; top: 20px; right: 20px;
            display: flex; flex-direction: column; gap: 10px;
            z-index: 99999; pointer-events: none;
        `;
        document.body.appendChild(container);
    }

    function show(message, type = 'info', duration = CONFIG.TOAST_DURATION) {
        ensureContainer();

        const colors = {
            info:    { bg: 'linear-gradient(135deg,#6366f1,#8b5cf6)', text: '#fff' },
            success: { bg: 'linear-gradient(135deg,#10b981,#059669)',  text: '#fff' },
            error:   { bg: 'linear-gradient(135deg,#ef4444,#dc2626)',  text: '#fff' },
            warning: { bg: 'linear-gradient(135deg,#f59e0b,#d97706)',  text: '#1e1b4b' },
            gold:    { bg: 'linear-gradient(135deg,#fbbf24,#f59e0b)',  text: '#1e1b4b' },
        };

        const c = colors[type] || colors.info;
        const toast = document.createElement('div');
        toast.style.cssText = `
            background: ${c.bg}; color: ${c.text};
            padding: 14px 20px; border-radius: 14px;
            box-shadow: 0 8px 28px rgba(0,0,0,0.22);
            font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 500;
            max-width: 320px; pointer-events: auto;
            animation: toastIn .35s cubic-bezier(.34,1.56,.64,1) both;
            line-height: 1.5;
        `;
        toast.innerHTML = message;

        container.appendChild(toast);

        const dismiss = () => {
            toast.style.animation = 'toastOut .3s ease forwards';
            toast.addEventListener('animationend', () => toast.remove(), { once: true });
        };

        toast.addEventListener('click', dismiss);
        setTimeout(dismiss, duration);
    }

    // Injeta keyframes na primeira chamada
    const style = document.createElement('style');
    style.textContent = `
        @keyframes toastIn  { from { transform: translateX(110%) scale(.9); opacity: 0 } to { transform: none; opacity: 1 } }
        @keyframes toastOut { from { opacity: 1; transform: none } to { opacity: 0; transform: translateX(110%) scale(.9) } }
    `;
    document.head.appendChild(style);

    return { show };
})();

// ─────────────────────────────────────────────
// 6. MÓDULO DE TEMA
// ─────────────────────────────────────────────

const Theme = {
    apply(theme) {
        const body = document.body;
        body.classList.toggle('dark-mode',  theme === 'dark');
        body.classList.toggle('light-mode', theme === 'light');

        const moon = $('theme-icon-moon');
        const sun  = $('theme-icon-sun');
        if (moon) moon.style.display = theme === 'dark'  ? 'block' : 'none';
        if (sun)  sun.style.display  = theme === 'light' ? 'block' : 'none';

        Storage.set(STORAGE_KEYS.THEME, theme);
    },

    toggle() {
        const isDark = document.body.classList.contains('dark-mode');
        this.apply(isDark ? 'light' : 'dark');
    },

    init() {
        const saved = Storage.get(STORAGE_KEYS.THEME);
        // Se não houver preferência salva, respeita a preferência do sistema
        if (saved) {
            this.apply(saved);
        } else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.apply(prefersDark ? 'dark' : 'light');
        }
    },
};

// ─────────────────────────────────────────────
// 7. MÓDULO DE MODAIS
// ─────────────────────────────────────────────

const Modal = {
    open(id) {
        const el = $(id);
        if (!el) return;
        el.style.display = 'flex';
        el.setAttribute('aria-hidden', 'false');
        // Foca o primeiro elemento focável dentro do modal
        requestAnimationFrame(() => {
            const focusable = el.querySelector('button, [href], input, select, textarea');
            focusable?.focus();
        });
    },

    close(id) {
        const el = $(id);
        if (!el) return;
        el.style.display = 'none';
        el.setAttribute('aria-hidden', 'true');
    },

    closeOnBackdrop(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    },
};

// ─────────────────────────────────────────────
// 8. SISTEMA DE CONQUISTAS
// ─────────────────────────────────────────────

const Achievements = {
    check() {
        const p = State.progress;
        let updated = false;

        ACHIEVEMENTS_REGISTRY.forEach(a => {
            if (!p.achievements.includes(a.id) && a.condition(p)) {
                p.achievements.push(a.id);
                updated = true;
                this._notify(a);
            }
        });

        if (updated) {
            Progress.save();
            Progress.renderAchievements();
        }
    },

    _notify(achievement) {
        Toast.show(`
            <div style="display:flex;align-items:center;gap:12px;">
                <i class="${achievement.icon}" style="font-size:1.6rem;flex-shrink:0;"></i>
                <div>
                    <div style="font-weight:700;margin-bottom:2px;">🏆 Conquista Desbloqueada!</div>
                    <div>${achievement.name}</div>
                    <div style="font-size:12px;opacity:.85;">${achievement.description}</div>
                </div>
            </div>
        `, 'gold', CONFIG.ACHIEVEMENT_DISPLAY_DELAY);
    },
};

// ─────────────────────────────────────────────
// 9. MÓDULO DE PROGRESSO
// ─────────────────────────────────────────────

const Progress = {
    save() {
        Storage.set(STORAGE_KEYS.PROGRESS, State.progress);
        this._logHistory();
    },

    _logHistory() {
        const today = new Date().toISOString().split('T')[0];
        const history = Storage.get(STORAGE_KEYS.PROGRESS_HISTORY, {});
        history[today] = {
            tasks:     State.progress.tasksCompleted,
            pomodoros: State.progress.pomodorosCompleted,
            games:     State.progress.gamesPlayed,
        };
        Storage.set(STORAGE_KEYS.PROGRESS_HISTORY, history);
    },

    incrementGames() {
        State.progress.gamesPlayed++;
        this.save();
        Achievements.check();
        this.updateDisplay();
    },

    incrementPomodoros() {
        State.progress.pomodorosCompleted++;
        this.save();
        Achievements.check();
        this.updateDisplay();
    },

    incrementTasks() {
        State.progress.tasksCompleted++;
        this.save();
        Achievements.check();
        this.updateDisplay();
    },

    updateDisplay() {
        const set = (id, val) => { const el = $(id); if (el) el.textContent = val; };
        set('gamesPlayed',        State.progress.gamesPlayed);
        set('pomodorosCompleted', State.progress.pomodorosCompleted);
        set('tasksCompleted',     State.progress.tasksCompleted);
        this.renderAchievements();
    },

    renderAchievements() {
        const list = $('achievementList');
        if (!list) return;

        list.innerHTML = ACHIEVEMENTS_REGISTRY.map(a => {
            const unlocked = State.progress.achievements.includes(a.id);
            return `
                <div class="achievement ${unlocked ? 'unlocked' : 'locked'}" title="${a.description}">
                    <i class="${a.icon}"></i>
                    <div>
                        <strong>${a.name}</strong>
                        <div style="font-size:.85em;opacity:.8;">${a.description}</div>
                    </div>
                </div>
            `;
        }).join('');
    },

    open() {
        Modal.open('progressModal');
        this.updateDisplay();
    },
};

// ─────────────────────────────────────────────
// 10. MÓDULO POMODORO
// ─────────────────────────────────────────────

const Pomodoro = {
    start() {
        if (State.pomodoro.isRunning) return;
        State.pomodoro.isRunning = true;
        State.pomodoro._interval = setInterval(() => this._tick(), 1000);
        this._render();
    },

    pause() {
        State.pomodoro.isRunning = false;
        clearInterval(State.pomodoro._interval);
        this._render();
    },

    reset() {
        this.pause();
        State.pomodoro.minutes = CONFIG.POMODORO_MINUTES;
        State.pomodoro.seconds = CONFIG.POMODORO_SECONDS;
        this._render();
    },

    _tick() {
        const p = State.pomodoro;
        if (p.seconds > 0) {
            p.seconds--;
        } else if (p.minutes > 0) {
            p.minutes--;
            p.seconds = 59;
        } else {
            this.reset();
            Progress.incrementPomodoros();
            Toast.show('🎉 <strong>Pomodoro completo!</strong><br>Parabéns! Faça uma pausa de 5 minutos. ☕', 'success');
            // Notificação nativa (se permitido)
            if (Notification.permission === 'granted') {
                new Notification('NeuroGame', { body: '⏰ Pomodoro completo! Hora da pausa.' });
            }
        }
        this._render();
    },

    _render() {
        const el = document.querySelector('.timer-display');
        if (el) el.textContent = `${padZero(State.pomodoro.minutes)}:${padZero(State.pomodoro.seconds)}`;
    },
};

// ─────────────────────────────────────────────
// 11. MÓDULO KANBAN
// ─────────────────────────────────────────────

const Kanban = {
    open() {
        Modal.open('kanbanModal');
        this.render();
    },

    addTask(column) {
        const input = $('newTaskInput');
        const text  = input?.value.trim();
        if (!text) return;

        State.kanban[column].push({ id: Date.now(), text, createdAt: new Date().toISOString() });
        this._persist(column);
        input.value = '';
        this.render();
        this._updateBadge();
    },

    deleteTask(column, id) {
        State.kanban[column] = State.kanban[column].filter(t => t.id !== id);
        this._persist(column);
        this.render();
        this._updateBadge();
    },

    moveTask(id, from, to) {
        if (from === to) return;
        const idx = State.kanban[from].findIndex(t => t.id == id);
        if (idx === -1) return;

        const [task] = State.kanban[from].splice(idx, 1);
        State.kanban[to].push(task);
        this._persist(from);
        this._persist(to);

        if (to === 'done') Progress.incrementTasks();

        this.render();
        this._updateBadge();
    },

    _persist(column) {
        const key = `neuroKanban${column.charAt(0).toUpperCase() + column.slice(1)}`;
        Storage.set(key, State.kanban[column]);
    },

    render() {
        ['todo', 'doing', 'done'].forEach(col => {
            const container = $(`${col}Tasks`);
            if (!container) return;

            // Preserva o input do "todo"
            const existingInput = container.querySelector('.task-input');
            container.innerHTML = '';
            if (existingInput) container.appendChild(existingInput);

            State.kanban[col].forEach(task => {
                const div = document.createElement('div');
                div.className = 'kanban-task';
                div.draggable = true;
                div.dataset.taskId = task.id;
                div.dataset.column = col;
                div.innerHTML = `
                    <span>${task.text}</span>
                    <button
                        aria-label="Remover tarefa"
                        onclick="Kanban.deleteTask('${col}', ${task.id})"
                        style="float:right;background:#ef4444;color:#fff;border:none;border-radius:50%;
                               width:22px;height:22px;font-size:13px;cursor:pointer;line-height:1;
                               display:inline-flex;align-items:center;justify-content:center;"
                    >×</button>
                `;

                div.addEventListener('dragstart', e => {
                    e.dataTransfer.setData('taskId',  task.id);
                    e.dataTransfer.setData('fromCol', col);
                    e.dataTransfer.effectAllowed = 'move';
                    div.style.opacity = '0.5';
                });
                div.addEventListener('dragend', () => div.style.opacity = '');

                container.appendChild(div);
            });

            // Drop zone
            container.addEventListener('dragover', e => {
                e.preventDefault();
                container.style.outline = '2px dashed var(--bg-gradient-start)';
            });
            container.addEventListener('dragleave', () => container.style.outline = '');
            container.addEventListener('drop', e => {
                e.preventDefault();
                container.style.outline = '';
                const id   = e.dataTransfer.getData('taskId');
                const from = e.dataTransfer.getData('fromCol');
                Kanban.moveTask(id, from, col);
            });
        });
    },

    _updateBadge() {
        const badge   = $('neuroBotBadge');
        if (!badge) return;
        const pending = State.kanban.todo.length + State.kanban.doing.length;
        badge.textContent    = pending;
        badge.style.display  = pending > 0 ? 'flex' : 'none';
    },
};

// ─────────────────────────────────────────────
// 12. MÓDULO NEUROBOT
// ─────────────────────────────────────────────

const BOT_KNOWLEDGE = {
    'o que é tdah':     'TDAH é um transtorno neurobiológico que afeta concentração, controle de impulsos e atividade. É comum em crianças e adolescentes.',
    'sintomas tdah':    'Principais sintomas: dificuldade de concentração, hiperatividade, impulsividade, desorganização e esquecimento.',
    'como lidar tdah':  'Estratégias: rotinas estruturadas, técnica Pomodoro, jogos cognitivos, exercícios físicos e apoio profissional.',
    'pomodoro':         'A técnica Pomodoro usa blocos de 25 min de foco + 5 min de pausa. Ótimo para TDAH!',
    'organização':      'Use ferramentas visuais como Kanban, divida tarefas grandes em pequenas e celebre cada conquista! 🎉',
    'jogo':             'Jogos cognitivos ajudam a desenvolver atenção, memória e funções executivas. Acesse a seção Jogos! 🎮',
    'memória':          'O Jogo da Memória treina memória visual e concentração — ótimo para atenção sustentada.',
    'kanban':           'Kanban organiza tarefas em: Para Fazer → Fazendo → Feito. Visualize seu progresso!',
};

const BOT_GREETINGS = {
    'oi':        'Olá! Sou o NeuroBot 🤖✨ Como posso ajudar você hoje?',
    'olá':       'Oi! Estou aqui para ajudar com jogos, organização e dicas para TDAH. O que você quer fazer?',
    'obrigado':  'De nada! Pequenos passos levam a grandes conquistas 🌟',
    'tchau':     'Até logo! Continue praticando. Você está indo muito bem! 🚀',
    'ajuda':     'Posso ajudar com:<br>🎮 Sugestões de jogos cognitivos<br>⏰ Técnica Pomodoro<br>📝 Organização de tarefas<br>💡 Dicas sobre TDAH<br>📊 Seu progresso',
};

const BOT_FALLBACK = [
    'Interessante! Para TDAH, recomendo técnicas visuais e dividir tarefas em pequenos passos. 🎯',
    'Que tal experimentar nossos jogos cognitivos ou a técnica Pomodoro? São muito eficazes! 🧠',
    'Para TDAH, organização visual e rotinas estruturadas são fundamentais. Vamos trabalhar nisso! 📝',
    'Verifique suas conquistas ou organize suas tarefas. Pequenos passos fazem diferença! ✨',
];

const NeuroBot = {
    open() {
        State.isNeuroBotOpen = true;
        $('neuroBotToggle').style.display  = 'none';
        $('neuroBotContainer').style.display = 'flex';
        const badge = $('neuroBotBadge');
        if (badge) badge.style.display = 'none';
        setTimeout(() => $('neuroBotInput')?.focus(), 300);
    },

    close() {
        State.isNeuroBotOpen = false;
        $('neuroBotContainer').style.display = 'none';
        $('neuroBotToggle').style.display    = 'flex';
    },

    toggle() {
        State.isNeuroBotOpen ? this.close() : this.open();
    },

    send() {
        const input   = $('neuroBotInput');
        const message = input?.value.trim();
        if (!message) return;

        this._addMessage(message, 'user');
        input.value = '';

        setTimeout(() => {
            this._addMessage(this._respond(message), 'bot');
        }, CONFIG.BOT_RESPONSE_DELAY);
    },

    quickAction(action) {
        this._addMessage(action, 'user');
        setTimeout(() => {
            this._addMessage(this._handleQuickAction(action), 'bot');
        }, CONFIG.BOT_RESPONSE_DELAY);
    },

    _addMessage(text, sender) {
        const container = $('neuroBotMessages');
        if (!container) return;

        const div = document.createElement('div');
        div.className = `message ${sender}-message`;
        div.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-${sender === 'bot' ? 'robot' : 'user'}"></i>
            </div>
            <div class="message-content"><p>${text}</p></div>
        `;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    },

    _respond(message) {
        const lower = message.toLowerCase();

        for (const [key, reply] of Object.entries(BOT_GREETINGS)) {
            if (lower.includes(key)) return reply;
        }

        for (const [key, reply] of Object.entries(BOT_KNOWLEDGE)) {
            if (lower.includes(key)) return reply;
        }

        if (lower.includes('jogar') || lower.includes('jogo')) {
            return 'Que tal o Jogo da Memória? É ótimo para concentração! Acesse a seção Jogos no menu. 🎮';
        }
        if (lower.includes('pomodoro') || lower.includes('foco')) {
            Pomodoro.start();
            return '⏰ Pomodoro iniciado! 25 minutos de foco. Você consegue! 💪';
        }
        if (lower.includes('tarefa') || lower.includes('organizar')) {
            Kanban.open();
            return '📋 Abrindo seu Kanban! Visualize e organize suas tarefas.';
        }
        if (lower.includes('progresso') || lower.includes('conquista')) {
            Progress.open();
            return '📊 Aqui está seu progresso! Continue assim! 🌟';
        }

        return BOT_FALLBACK[randomInt(0, BOT_FALLBACK.length - 1)];
    },

    _handleQuickAction(action) {
        switch (action) {
            case 'Sugerir jogo': {
                const games = ['Jogo da Memória', 'Foco Rápido', 'Organize a Rotina', 'Sequência Lógica'];
                const pick  = games[randomInt(0, games.length - 1)];
                return `🎮 Recomendo <strong>${pick}</strong>! Perfeito para treinar habilidades cognitivas.`;
            }
            case 'Iniciar Pomodoro':
                Pomodoro.start();
                return '⏰ Pomodoro iniciado! Elimine distrações e foque. 💪';
            case 'Dicas TDAH':
                Modal.open('tipsModal');
                return '💡 Abrindo dicas especializadas para TDAH!';
            default:
                return 'Como posso ajudar você com isso? 🌟';
        }
    },
};

// ─────────────────────────────────────────────
// 13. MÓDULO DE AUTENTICAÇÃO
// ─────────────────────────────────────────────

// Usuários simulados (em produção, substituir por chamada de API)
const MOCK_USERS = [
    { email: 'adulto@teste.com',  password: 'senha123', name: 'Adulto' },
    { email: 'crianca@teste.com', password: 'senha123', name: 'Criança' },
];

const Auth = {
    setup() {
        State.authMode = 'login';
        this._updateUI();
        this._clearForm();
        this._validate();
    },

    toggleMode(e) {
        e.preventDefault();
        State.authMode = State.authMode === 'login' ? 'register' : 'login';
        this._updateUI();
        this._validate();
        $('authMessage').textContent = '';
    },

    _updateUI() {
        const isLogin = State.authMode === 'login';
        const show    = el => { if ($('auth' + el)) { $('auth' + el).style.display = 'block'; $('auth' + el).setAttribute('required', ''); } };
        const hide    = el => { if ($('auth' + el)) { $('auth' + el).style.display = 'none';  $('auth' + el).removeAttribute('required'); } };

        $('authModalTitle').textContent = isLogin ? '🔐 Login' : '📝 Cadastro';
        $('authSubmitButton').textContent = isLogin ? 'Entrar' : 'Cadastrar';
        $('toggleAuthText').textContent = isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?';
        $('toggleAuthLink').textContent = isLogin ? 'Cadastre-se' : 'Faça login';

        if (isLogin) {
            hide('NameLabel'); hide('Name'); hide('ConfirmPasswordLabel'); hide('ConfirmPassword');
        } else {
            show('NameLabel'); show('Name'); show('ConfirmPasswordLabel'); show('ConfirmPassword');
        }
    },

    _clearForm() {
        ['authEmail', 'authPassword', 'authName', 'authConfirmPassword'].forEach(id => {
            const el = $(id);
            if (el) el.value = '';
        });
    },

    _validate() {
        const email    = $('authEmail')?.value.trim()    || '';
        const password = $('authPassword')?.value.trim() || '';
        const name     = $('authName')?.value.trim()     || '';
        const confirm  = $('authConfirmPassword')?.value.trim() || '';
        const msgEl    = $('authMessage');
        const btn      = $('authSubmitButton');

        const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        const passOk  = password.length >= 6;

        let valid = emailOk && passOk;

        if (State.authMode === 'register') {
            valid = valid && name.length > 0 && confirm.length > 0;
            if (password && confirm && password !== confirm) {
                if (msgEl) { msgEl.textContent = 'As senhas não coincidem.'; msgEl.style.color = 'var(--error-color)'; }
            } else {
                if (msgEl) msgEl.textContent = '';
            }
            valid = valid && (password === confirm);
        } else {
            if (msgEl) msgEl.textContent = '';
        }

        if (btn) btn.disabled = !valid;
    },

    perform() {
        const email    = $('authEmail')?.value.trim()    || '';
        const password = $('authPassword')?.value.trim() || '';
        const name     = $('authName')?.value.trim()     || '';
        const msgEl    = $('authMessage');

        const setMsg = (text, ok) => {
            if (!msgEl) return;
            msgEl.textContent = text;
            msgEl.style.color = ok ? 'var(--success-color)' : 'var(--error-color)';
        };

        if (State.authMode === 'login') {
            const user = MOCK_USERS.find(u => u.email === email && u.password === password);
            if (user) {
                setMsg(`Bem-vindo(a), ${user.name}! ✅`, true);
                setTimeout(() => Modal.close('loginModal'), 1500);
            } else {
                setMsg('Email ou senha incorretos.', false);
            }
        } else {
            if (MOCK_USERS.some(u => u.email === email)) {
                setMsg('Este email já está em uso.', false);
            } else {
                setMsg(`Cadastro de ${name} realizado! Faça login. ✅`, true);
                setTimeout(() => {
                    State.authMode = 'login';
                    this._updateUI();
                    $('authEmail').value = email;
                    $('authPassword').value = '';
                    this._validate();
                }, 1500);
            }
        }
    },
};

// ─────────────────────────────────────────────
// 14. MÓDULO HUMOR (MOOD TRACKER)
// ─────────────────────────────────────────────

const MoodTracker = {
    open() {
        Modal.open('moodModal');
        this.render();
    },

    save(mood) {
        const entry   = `${new Date().toLocaleDateString('pt-BR')} — ${mood}`;
        const history = Storage.get(STORAGE_KEYS.MOOD_HISTORY, []);
        history.unshift(entry);
        if (history.length > CONFIG.MAX_MOOD_HISTORY) history.pop();
        Storage.set(STORAGE_KEYS.MOOD_HISTORY, history);
        this.render();
        Toast.show(`Humor registrado! ${mood}`, 'success', 2500);
    },

    render() {
        const list = $('moodHistory');
        if (!list) return;
        const history = Storage.get(STORAGE_KEYS.MOOD_HISTORY, []);
        list.innerHTML = history.length
            ? history.map(e => `<li style="padding:6px 0;border-bottom:1px solid var(--border-color)">${e}</li>`).join('')
            : '<li style="opacity:.6">Nenhum registro ainda.</li>';
    },
};

// ─────────────────────────────────────────────
// 15. MÓDULO NOTAS
// ─────────────────────────────────────────────

const Notes = {
    open() {
        Modal.open('notesModal');
        this.render();
    },

    save() {
        const input = $('newNote');
        const text  = input?.value.trim();
        if (!text) return;

        const notes = Storage.get(STORAGE_KEYS.NOTES, []);
        notes.unshift(text);
        Storage.set(STORAGE_KEYS.NOTES, notes);
        input.value = '';
        this.render();
    },

    delete(index) {
        const notes = Storage.get(STORAGE_KEYS.NOTES, []);
        notes.splice(index, 1);
        Storage.set(STORAGE_KEYS.NOTES, notes);
        this.render();
    },

    render() {
        const list  = $('notesList');
        if (!list) return;
        const notes = Storage.get(STORAGE_KEYS.NOTES, []);
        list.innerHTML = notes.length
            ? notes.map((note, i) => `
                <li style="display:flex;justify-content:space-between;align-items:start;
                           padding:8px 0;border-bottom:1px solid var(--border-color);gap:10px;">
                    <span style="flex:1;line-height:1.5">${note}</span>
                    <button onclick="Notes.delete(${i})"
                            aria-label="Apagar nota"
                            style="background:#ef4444;color:#fff;border:none;border-radius:6px;
                                   padding:2px 8px;cursor:pointer;font-size:12px;flex-shrink:0;">
                        ✕
                    </button>
                </li>
            `).join('')
            : '<li style="opacity:.6">Nenhuma nota ainda.</li>';
    },
};

// ─────────────────────────────────────────────
// 16. JOGOS
// ─────────────────────────────────────────────

// 16.1 — Jogo das Cores
const ColorGame = {
    COLORS: ['red', 'blue', 'green', 'yellow'],

    open() {
        Modal.open('colorGameModal');
        this.start();
    },

    start() {
        State.colorGame.target = this.COLORS[randomInt(0, this.COLORS.length - 1)];
        State.colorGame.score  = 0;
        this._render();
    },

    _nextRound() {
        State.colorGame.target = this.COLORS[randomInt(0, this.COLORS.length - 1)];
        this._render();
    },

    check(color) {
        if (color === State.colorGame.target) {
            State.colorGame.score++;
            this._render();
            Progress.incrementGames();
            this._nextRound();
        } else {
            Toast.show('Ops! Cor errada. Tente de novo! 😅', 'error', 2000);
        }
    },

    _render() {
        const el = $('targetColor');
        if (el) el.textContent = `Clique na cor: ${State.colorGame.target.toUpperCase()}`;
        const scoreEl = $('colorGameScore');
        if (scoreEl) scoreEl.textContent = State.colorGame.score;
    },
};

// 16.2 — Verdadeiro ou Falso
const TrueFalseGame = {
    QUESTIONS: [
        { q: 'Estudar com música sempre melhora o foco.',        correct: 'false', exp: 'Depende da pessoa. Para alguns pode atrapalhar.' },
        { q: 'Fazer pausas curtas pode aumentar a produtividade.', correct: 'true', exp: 'Técnicas como Pomodoro incentivam pequenas pausas.' },
        { q: 'Dormir pouco melhora o rendimento.',               correct: 'false', exp: 'Dormir mal reduz foco e memória.' },
        { q: 'Organizar suas tarefas ajuda a reduzir o estresse.', correct: 'true', exp: 'Ter um plano reduz ansiedade e aumenta clareza.' },
    ],

    open() {
        Modal.open('trueFalseGameModal');
        this.start();
    },

    start() {
        State.trueFalse = { index: 0, score: 0 };
        this._showQuestion();
    },

    answer(userAnswer) {
        const q = this.QUESTIONS[State.trueFalse.index];
        const correct = userAnswer === q.correct;
        if (correct) State.trueFalse.score++;

        const fb = $('trueFalseFeedback');
        if (fb) fb.textContent = correct ? `✅ Correto! ${q.exp}` : `❌ Errado! ${q.exp}`;

        State.trueFalse.index++;
        setTimeout(() => this._showQuestion(), 2000);
    },

    _showQuestion() {
        const qs = this.QUESTIONS;
        if (State.trueFalse.index >= qs.length) {
            $('trueFalseQuestion').textContent = 'Fim do jogo!';
            $('trueFalseFeedback').textContent = `Você acertou ${State.trueFalse.score} de ${qs.length}!`;
            $('trueFalseScore').textContent    = '';
            Progress.incrementGames();
            return;
        }
        const q = qs[State.trueFalse.index];
        $('trueFalseQuestion').textContent = q.q;
        $('trueFalseFeedback').textContent = '';
        $('trueFalseScore').textContent    = `Pergunta ${State.trueFalse.index + 1} de ${qs.length}`;
    },
};

// 16.3 — Pares de Memória
const MemoryPairsGame = {
    open() {
        Modal.open('memoryPairsGameModal');
        this.start();
    },

    start() {
        State.memoryPairs = { board: [], firstTile: null, secondTile: null, attempts: 0 };
        const fb = $('memoryPairsFeedback');
        if (fb) fb.textContent = '';
        const board = $('memoryPairsBoard');
        if (!board) return;
        board.innerHTML = '';

        const values = shuffle([1, 1, 2, 2, 3, 3, 4, 4]);
        values.forEach((value, i) => {
            const tile = document.createElement('div');
            tile.classList.add('memory-tile');
            tile.dataset.value = value;
            tile.dataset.index = i;
            tile.addEventListener('click', () => this._reveal(tile));
            board.appendChild(tile);
            State.memoryPairs.board.push(tile);
        });
    },

    _reveal(tile) {
        const mp = State.memoryPairs;
        if (tile.classList.contains('revealed') || mp.secondTile) return;

        tile.classList.add('revealed');
        tile.textContent = tile.dataset.value;

        if (!mp.firstTile) {
            mp.firstTile = tile;
        } else {
            mp.secondTile = tile;
            mp.attempts++;

            if (mp.firstTile.dataset.value === mp.secondTile.dataset.value) {
                mp.firstTile = null;
                mp.secondTile = null;
                const total   = mp.board.length;
                const matched = mp.board.filter(t => t.classList.contains('revealed')).length;
                if (matched === total) {
                    $('memoryPairsFeedback').textContent = `✅ Parabéns! Todos os pares em ${mp.attempts} tentativas!`;
                    Progress.incrementGames();
                }
            } else {
                const [a, b] = [mp.firstTile, mp.secondTile];
                mp.firstTile = null;
                mp.secondTile = null;
                setTimeout(() => {
                    a.classList.remove('revealed'); a.textContent = '';
                    b.classList.remove('revealed'); b.textContent = '';
                }, 800);
            }
        }
    },
};

// 16.4 — Caça-Palavras
const WordSearchGame = {
    WORDS: ['FOCO', 'ATENÇÃO', 'ORGANIZAÇÃO', 'MEMÓRIA', 'DISCIPLINA', 'PLANEJAMENTO', 'CONCENTRAÇÃO', 'TEMPO', 'PRODUTIVIDADE', 'OBJETIVO'],
    GRID_SIZE: 36,
    COLS: 6,

    open() {
        Modal.open('wordSearchModal');
        this.start();
    },

    start() {
        State.wordSearch.selectedIndexes = [];
        State.wordSearch.currentWord     = this.WORDS[randomInt(0, this.WORDS.length - 1)];

        const letters = Array.from({ length: this.GRID_SIZE }, () =>
            'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.charAt(randomInt(0, 25))
        );

        // Insere a palavra em posição aleatória na linha
        const word  = State.wordSearch.currentWord;
        const start = randomInt(0, this.GRID_SIZE - word.length);
        word.split('').forEach((ch, i) => { letters[start + i] = ch; });

        State.wordSearch.gridLetters = letters;

        const grid = $('wordGrid');
        if (!grid) return;
        grid.innerHTML = '';

        letters.forEach((letter, i) => {
            const cell = document.createElement('div');
            cell.classList.add('word-cell');
            cell.textContent = letter;
            cell.addEventListener('click', () => this._select(i));
            grid.appendChild(cell);
        });

        const fb = $('wordSearchFeedback');
        if (fb) { fb.textContent = `Encontre a palavra: ${word}`; fb.className = ''; }
    },

    _select(index) {
        const ws = State.wordSearch;
        if (ws.selectedIndexes.includes(index)) return;

        ws.selectedIndexes.push(index);
        $$('.word-cell')[index]?.classList.add('selected');

        if (ws.selectedIndexes.length === ws.currentWord.length) {
            const formed  = ws.selectedIndexes.map(i => ws.gridLetters[i]).join('');
            const fb      = $('wordSearchFeedback');
            if (formed === ws.currentWord) {
                if (fb) { fb.textContent = `✅ "${ws.currentWord}" encontrada!`; fb.className = 'success'; }
                Progress.incrementGames();
            } else {
                if (fb) { fb.textContent = `❌ Você formou "${formed}". Tente de novo!`; fb.className = 'error'; }
            }
            setTimeout(() => this.start(), 2000);
        }
    },
};

// 16.5 — Sequência Numérica
const SequenceGame = {
    SEQUENCES: [
        { seq: [2, 4, 6,  '?'], answer: 8  },
        { seq: [1, 3, 5,  '?'], answer: 7  },
        { seq: [5, 10, 15,'?'], answer: 20 },
        { seq: [10, 9, 8, '?'], answer: 7  },
        { seq: [2, 6, 18, '?'], answer: 54 },
        { seq: [1, 4, 9,  '?'], answer: 16 },
    ],

    open() {
        Modal.open('sequenceGameModal');
        State.sequence.currentLevel = 0;
        this._render();
    },

    _render() {
        const lvl = State.sequence.currentLevel % this.SEQUENCES.length;
        const s   = this.SEQUENCES[lvl];

        const fb = $('sequenceFeedback');
        if (fb) { fb.textContent = ''; fb.className = 'sequence-feedback'; }

        const levelEl = $('sequenceLevel');
        if (levelEl) levelEl.textContent = `Nível: ${State.sequence.currentLevel + 1}`;

        const questionEl = $('sequenceQuestion');
        if (questionEl) questionEl.textContent = s.seq.join(' → ');

        const opts    = this._generateOptions(s.answer);
        const optsDiv = $('sequenceOptions');
        if (!optsDiv) return;
        optsDiv.innerHTML = '';
        opts.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'sequence-option-btn';
            btn.textContent = opt;
            btn.addEventListener('click', () => this._answer(opt));
            optsDiv.appendChild(btn);
        });
    },

    _generateOptions(correct) {
        const opts = new Set([correct]);
        while (opts.size < 4) {
            const delta = randomInt(1, 8) * (Math.random() > 0.5 ? 1 : -1);
            const fake  = correct + delta;
            if (fake > 0) opts.add(fake);
        }
        return shuffle([...opts]);
    },

    _answer(selected) {
        const s  = this.SEQUENCES[State.sequence.currentLevel % this.SEQUENCES.length];
        const fb = $('sequenceFeedback');

        if (selected === s.answer) {
            if (fb) { fb.textContent = '✅ Correto!'; fb.className = 'sequence-feedback correct'; }
            State.sequence.currentLevel++;
            Progress.incrementGames();
            setTimeout(() => this._render(), 1500);
        } else {
            if (fb) { fb.textContent = `❌ Errado! A resposta era ${s.answer}.`; fb.className = 'sequence-feedback wrong'; }
        }
    },
};

// 16.6 — Organizar Rotina (Drag & Drop)
const OrganizeGame = {
    TASKS: ['Estudar', 'Jogar', 'Lavar a louça', 'Fazer exercícios', 'Assistir TV', 'Ler um livro'],

    open() {
        Modal.open('organizeGameModal');
        this.start();
    },

    start() {
        const taskList = $('taskListToDrag');
        if (!taskList) return;
        taskList.innerHTML = '';

        clearInterval(State.organize.timerInterval);
        State.organize.elapsed = 0;
        this._updateTimer();

        this.TASKS.forEach((task, i) => {
            const btn = document.createElement('button');
            btn.textContent    = task;
            btn.id             = `otask-${i}`;
            btn.setAttribute('draggable', 'true');
            btn.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', btn.id));
            taskList.appendChild(btn);
        });

        ['priorityHigh', 'priorityMedium', 'priorityLow'].forEach(id => {
            const el = $(id);
            if (el) el.innerHTML = '';
        });

        const result = $('organizeGameResult');
        if (result) result.textContent = '';

        State.organize.timerInterval = setInterval(() => {
            State.organize.elapsed++;
            this._updateTimer();
        }, 1000);
    },

    allowDrop(e) { e.preventDefault(); },

    drop(e, priority) {
        e.preventDefault();
        const id  = e.dataTransfer.getData('text/plain');
        const el  = $(id);
        if (!el) return;

        const map = { High: 'priorityHigh', Medium: 'priorityMedium', Low: 'priorityLow' };
        const ul  = $(map[priority]);
        if (!ul) return;

        const li = document.createElement('li');
        li.textContent = el.textContent;
        ul.appendChild(li);
        el.remove();
    },

    finish() {
        const total = $$('#priorityHigh li, #priorityMedium li, #priorityLow li').length;
        const result = $('organizeGameResult');

        if (total < this.TASKS.length) {
            if (result) result.textContent = '📌 Organize todas as tarefas antes de finalizar!';
            return;
        }

        clearInterval(State.organize.timerInterval);
        if (result) result.textContent = `✅ Parabéns! Rotina organizada em ${formatTime(State.organize.elapsed)}!`;
        Progress.incrementGames();
    },

    _updateTimer() {
        const el = $('organizeTimer');
        if (el) el.textContent = formatTime(State.organize.elapsed);
    },
};

// ─────────────────────────────────────────────
// 17. FUNÇÃO DE ABERTURA DE JOGOS (ponto único)
// ─────────────────────────────────────────────

function openGame(name) {
    const map = {
        organize:    () => OrganizeGame.open(),
        trueFalse:   () => TrueFalseGame.open(),
        memoryPairs: () => MemoryPairsGame.open(),
        wordSearch:  () => WordSearchGame.open(),
        sequence:    () => SequenceGame.open(),
        color:       () => ColorGame.open(),
    };
    (map[name] || (() => Toast.show('Jogo em desenvolvimento! Em breve disponível. 🚧', 'info')))();
}

// ─────────────────────────────────────────────
// 18. NAVEGAÇÃO
// ─────────────────────────────────────────────

function scrollToSection(id) {
    $(id)?.scrollIntoView({ behavior: 'smooth' });
}

function toggleMobileMenu() {
    document.querySelector('.nav-menu')?.classList.toggle('active');
}

// ─────────────────────────────────────────────
// 19. INICIALIZAÇÃO
// ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    // Tema
    Theme.init();

    // Pedido de permissão para notificações nativas
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }

    // Navegação
    document.querySelector('.hamburger')
        ?.addEventListener('click', toggleMobileMenu);

    // Tema
    $('theme-toggle-btn')
        ?.addEventListener('click', () => Theme.toggle());

    // NeuroBot — input Enter
    $('neuroBotInput')
        ?.addEventListener('keydown', e => { if (e.key === 'Enter') NeuroBot.send(); });

    // Auth fields
    ['authEmail', 'authPassword', 'authName', 'authConfirmPassword'].forEach(id => {
        $(id)?.addEventListener('input', () => Auth._validate());
    });
    $('authSubmitButton')?.addEventListener('click', () => Auth.perform());
    $('toggleAuthLink')  ?.addEventListener('click', e  => Auth.toggleMode(e));

    // Fechar modal ao clicar no backdrop
    window.addEventListener('click', Modal.closeOnBackdrop);

    // Fechar modal com tecla ESC
    window.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            $$('.modal').forEach(m => { m.style.display = 'none'; });
        }
    });

    // Kanban — drop zones para as colunas (drag from outside)
    ['todoTasks', 'doingTasks', 'doneTasks'].forEach(id => {
        const el = $(id);
        if (!el) return;
        el.addEventListener('dragover',  e => { e.preventDefault(); el.style.outline = '2px dashed var(--bg-gradient-start)'; });
        el.addEventListener('dragleave', () => el.style.outline = '');
    });

    // Render inicial
    Kanban.render();
    Kanban._updateBadge();
    Progress.updateDisplay();

    // Injetar estilos de menu mobile e animações dinâmicas
    const dynStyle = document.createElement('style');
    dynStyle.textContent = `
        .nav-menu.active {
            display: flex; flex-direction: column;
            position: absolute; top: 100%; left: 0; width: 100%;
            background: linear-gradient(135deg, var(--bg-gradient-start), var(--bg-gradient-end));
            padding: 1rem; box-shadow: 0 8px 24px rgba(0,0,0,.2);
            gap: 0.75rem;
        }
        @media (max-width: 768px) { .nav-menu { display: none; } }
    `;
    document.head.appendChild(dynStyle);
});

// ─────────────────────────────────────────────
// 20. EXPOSIÇÃO GLOBAL (chamadas via HTML onclick)
// ─────────────────────────────────────────────
// Apenas as funções necessárias no HTML ficam no escopo global.

Object.assign(window, {
    // Navegação
    scrollToSection,
    toggleMobileMenu,

    // NeuroBot
    openNeuroBot:      () => NeuroBot.open(),
    closeNeuroBot:     () => NeuroBot.close(),
    toggleNeuroBot:    () => NeuroBot.toggle(),
    sendNeuroBotMessage: () => NeuroBot.send(),
    sendQuickMessage:  (a) => NeuroBot.quickAction(a),

    // Pomodoro
    startPomodoro:  () => Pomodoro.start(),
    pausePomodoro:  () => Pomodoro.pause(),
    resetPomodoro:  () => Pomodoro.reset(),

    // Modais genéricos
    openModal:   (id) => Modal.open(id),
    closeModal:  (id) => Modal.close(id),
    openTips:    () => Modal.open('tipsModal'),
    openProgress:() => Progress.open(),

    // Kanban
    openKanban:      () => Kanban.open(),
    addKanbanTask:   (col) => Kanban.addTask(col),
    deleteKanbanTask: (col, id) => Kanban.deleteTask(col, id),

    // Auth
    setupLoginModal: () => Auth.setup(),
    toggleAuthMode:  (e) => Auth.toggleMode(e),
    validateLoginForm: () => Auth._validate(),
    performAuth:     () => Auth.perform(),

    // Mood
    openMoodTracker: () => MoodTracker.open(),
    saveMood:        (m) => MoodTracker.save(m),

    // Notes
    openNotes: () => Notes.open(),
    saveNote:  () => Notes.save(),
    deleteNote:(i) => Notes.delete(i),

    // Jogos
    openGame,
    openColorGame:    () => ColorGame.open(),
    checkColor:       (c) => ColorGame.check(c),
    answerTrueFalse:  (a) => TrueFalseGame.answer(a),
    startWordSearch:  () => WordSearchGame.start(),
    startSequenceGame:() => SequenceGame._render(),
    selectOption:     (v) => SequenceGame._answer(v),
    allowDrop:        (e) => OrganizeGame.allowDrop(e),
    drop:             (e, p) => OrganizeGame.drop(e, p),
    finishOrganizeGame: () => OrganizeGame.finish(),

    // Expose modules for advanced use
    Kanban, NeuroBot, Notes, MoodTracker, Progress, Pomodoro, Theme, Toast,
});
