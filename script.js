/* =============================================================
   NeuroGame — script-improved.js
   Melhorias: arquitetura modular, UX fluida, sem alert(),
   animações de notificação, toast system, drag-and-drop robusto,
   tema corrigido, validação em tempo real e código limpo.
   ============================================================= */

'use strict';

// ─────────────────────────────────────────────
// 1. UTILITÁRIOS
// ─────────────────────────────────────────────

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const storage = {
    get: (key, fallback = null) => {
        try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
        catch { return fallback; }
    },
    set: (key, value) => {
        try { localStorage.setItem(key, JSON.stringify(value)); }
        catch (e) { console.warn('localStorage indisponível:', e); }
    }
};

function formatTime(seconds) {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
}

// ─────────────────────────────────────────────
// 2. SISTEMA DE TOAST (substitui alert())
// ─────────────────────────────────────────────

const Toast = (() => {
    let container = null;

    function getContainer() {
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            Object.assign(container.style, {
                position: 'fixed',
                top: '24px',
                right: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                zIndex: '99999',
                pointerEvents: 'none'
            });
            document.body.appendChild(container);
        }
        return container;
    }

    const ICONS = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️',
        achievement: '🏆'
    };

    const COLORS = {
        success: 'linear-gradient(135deg, #10b981, #059669)',
        error: 'linear-gradient(135deg, #ef4444, #dc2626)',
        info: 'linear-gradient(135deg, #6366f1, #4f46e5)',
        warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
        achievement: 'linear-gradient(135deg, #fbbf24, #f59e0b)'
    };

    function show(message, type = 'info', duration = 3500) {
        const c = getContainer();
        const toast = document.createElement('div');

        Object.assign(toast.style, {
            background: COLORS[type] || COLORS.info,
            color: '#fff',
            padding: '14px 20px',
            borderRadius: '14px',
            boxShadow: '0 8px 28px rgba(0,0,0,0.25)',
            fontSize: '14px',
            fontFamily: "'Outfit', sans-serif",
            fontWeight: '500',
            maxWidth: '320px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            pointerEvents: 'auto',
            opacity: '0',
            transform: 'translateX(40px)',
            transition: 'opacity 0.3s cubic-bezier(0.4,0,0.2,1), transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            cursor: 'pointer'
        });

        toast.innerHTML = `<span style="font-size:1.2rem">${ICONS[type] || '•'}</span><span>${message}</span>`;
        toast.addEventListener('click', () => dismiss(toast));
        c.appendChild(toast);

        // Forçar reflow para animar entrada
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                toast.style.opacity = '1';
                toast.style.transform = 'translateX(0)';
            });
        });

        const timer = setTimeout(() => dismiss(toast), duration);
        toast._timer = timer;
    }

    function dismiss(toast) {
        clearTimeout(toast._timer);
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(40px)';
        setTimeout(() => toast.remove(), 320);
    }

    return { show };
})();

// ─────────────────────────────────────────────
// 3. ESTADO GLOBAL
// ─────────────────────────────────────────────

const State = {
    neuroBot: { isOpen: false, messages: [] },

    kanban: {
        todo:  storage.get('neuroKanbanTodo', []),
        doing: storage.get('neuroKanbanDoing', []),
        done:  storage.get('neuroKanbanDone', [])
    },

    progress: storage.get('neuroProgress', {
        gamesPlayed: 0,
        pomodorosCompleted: 0,
        tasksCompleted: 0,
        achievements: []
    }),

    pomodoro: {
        minutes: 25,
        seconds: 0,
        isRunning: false,
        _interval: null
    },

    auth: { mode: 'login' }, // 'login' | 'register'

    games: {
        // Cor
        targetColor: '',
        colorScore: 0,
        // Organizar
        organizeTimerInterval: null,
        organizeTimeElapsed: 0,
        // Verdadeiro/Falso
        currentTFIndex: 0,
        tfScore: 0,
        // Pares
        firstTile: null,
        secondTile: null,
        attempts: 0,
        // Caça-palavras
        currentWord: '',
        gridLetters: [],
        selectedIndexes: [],
        // Sequência
        currentLevel: 0
    }
};

// ─────────────────────────────────────────────
// 4. BASE DE CONHECIMENTO DO NEUROBOT
// ─────────────────────────────────────────────

const BOT_KNOWLEDGE = {
    'o que é tdah': 'TDAH é um transtorno neurobiológico que afeta concentração, controle de impulsos e níveis de atividade. É comum em crianças, adolescentes e adultos.',
    'sintomas tdah': 'Os principais sintomas são: dificuldade de concentração, hiperatividade, impulsividade, desorganização e esquecimento frequente.',
    'como lidar tdah': 'Estratégias eficazes: rotinas estruturadas, técnica Pomodoro, jogos cognitivos, exercícios físicos e apoio profissional.',
    'jogo memória': 'O Jogo da Memória desenvolve memória visual e atenção sustentada — habilidades essenciais para quem tem TDAH.',
    'foco rápido': 'O Foco Rápido treina atenção seletiva e velocidade de processamento, ajudando a filtrar distrações.',
    'pomodoro': 'A técnica Pomodoro divide o trabalho em blocos de 25 minutos com pausas de 5. Perfeita para manter o foco sem se sobrecarregar!',
    'kanban': 'O Kanban é um método visual com colunas: Para Fazer, Fazendo e Feito. Ótimo para visualizar o progresso das suas tarefas.',
    'organização': 'Use cores, símbolos visuais, alarmes e lembretes. Divida tarefas grandes em pequenas e celebre cada conquista!',
    'sequência lógica': 'Sequência Lógica desenvolve raciocínio sequencial e memória de trabalho — fundamentos da organização mental.'
};

const BOT_QUICK = {
    'oi': 'Olá! Sou o NeuroBot, seu assistente para TDAH! 🤖✨ Como posso ajudar você hoje?',
    'olá': 'Oi! Estou aqui para ajudar com jogos, organização e dicas para TDAH. O que você quer fazer?',
    'ajuda': 'Posso ajudar com:\n🎮 Sugestão de jogos cognitivos\n⏰ Técnica Pomodoro\n📝 Organização de tarefas\n💡 Dicas para TDAH\n📊 Acompanhamento de progresso',
    'obrigado': 'De nada! Lembre-se: pequenos passos levam a grandes conquistas! 🌟',
    'obrigada': 'De nada! Estou sempre aqui. Você está indo muito bem! 🌟',
    'tchau': 'Até logo! Continue praticando e se organizando. 🚀'
};

const BOT_FALLBACKS = [
    'Para TDAH, recomendo técnicas visuais e dividir tarefas em pequenos passos. Posso ajudar com isso! 🎯',
    'Que tal experimentar nossos jogos cognitivos ou a técnica Pomodoro? São ferramentas muito eficazes! 🧠',
    'Para pessoas com TDAH, organização visual e rotinas estruturadas são fundamentais. Vamos trabalhar nisso! 📝',
    'Que tal verificar suas conquistas ou organizar suas tarefas? Pequenos passos fazem a diferença! ✨'
];

// ─────────────────────────────────────────────
// 5. NEUROBOT
// ─────────────────────────────────────────────

const NeuroBot = {
    open() {
        State.neuroBot.isOpen = true;
        $('#neuroBotToggle').style.display = 'none';
        $('#neuroBotContainer').style.display = 'flex';
        $('#neuroBotBadge').style.display = 'none';
        setTimeout(() => $('#neuroBotInput')?.focus(), 300);
    },

    close() {
        State.neuroBot.isOpen = false;
        $('#neuroBotContainer').style.display = 'none';
        $('#neuroBotToggle').style.display = 'flex';
    },

    toggle() {
        State.neuroBot.isOpen ? this.close() : this.open();
    },

    addMessage(content, sender) {
        const container = $('#neuroBotMessages');
        const wrap = document.createElement('div');
        wrap.className = `message ${sender}-message`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = sender === 'bot'
            ? '<i class="fas fa-robot"></i>'
            : '<i class="fas fa-user"></i>';

        const bubble = document.createElement('div');
        bubble.className = 'message-content';
        // Suporte a quebras de linha no texto
        bubble.innerHTML = `<p>${content.replace(/\n/g, '<br>')}</p>`;

        wrap.appendChild(avatar);
        wrap.appendChild(bubble);
        container.appendChild(wrap);
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });

        State.neuroBot.messages.push({ content, sender, timestamp: new Date() });
    },

    send() {
        const input = $('#neuroBotInput');
        const message = input.value.trim();
        if (!message) return;

        this.addMessage(message, 'user');
        input.value = '';

        // Simula "digitando..."
        setTimeout(() => {
            const response = this._process(message);
            this.addMessage(response, 'bot');
        }, 500);
    },

    sendQuick(text) {
        this.addMessage(text, 'user');
        setTimeout(() => {
            this.addMessage(this._processQuick(text), 'bot');
        }, 500);
    },

    _process(message) {
        const lower = message.toLowerCase();

        // Respostas rápidas
        for (const [key, resp] of Object.entries(BOT_QUICK)) {
            if (lower.includes(key)) return resp;
        }

        // Base de conhecimento
        for (const [key, resp] of Object.entries(BOT_KNOWLEDGE)) {
            if (lower.includes(key) || key.split(' ').some(w => lower.includes(w))) return resp;
        }

        // Comandos de ação
        if (lower.includes('jogo') || lower.includes('jogar'))
            return '🎮 Recomendo começar com o Jogo da Memória — ótimo para treinar concentração! Vá para a seção Jogos.';

        if (lower.includes('pomodoro') || lower.includes('foco')) {
            Pomodoro.start();
            return '⏰ Pomodoro iniciado! 25 minutos de foco total. Você consegue! 💪';
        }

        if (lower.includes('tarefa') || lower.includes('organizar')) {
            Modal.open('kanbanModal');
            Kanban.render();
            return '📋 Abrindo seu organizador de tarefas! Use o Kanban para visualizar seu progresso.';
        }

        if (lower.includes('progresso') || lower.includes('conquista')) {
            Modal.open('progressModal');
            Progress.updateDisplay();
            return '📊 Aqui está seu progresso! Continue assim! 🌟';
        }

        return BOT_FALLBACKS[Math.floor(Math.random() * BOT_FALLBACKS.length)];
    },

    _processQuick(action) {
        const gameNames = ['Jogo da Memória', 'Foco Rápido', 'Organize a Rotina', 'Sequência Lógica'];
        switch (action) {
            case 'Sugerir jogo':
                return `🎮 Recomendo o "${gameNames[Math.floor(Math.random() * gameNames.length)]}"! Vá para a seção Jogos e divirta-se!`;
            case 'Iniciar Pomodoro':
                Pomodoro.start();
                return '⏰ Pomodoro iniciado! Elimine distrações e foque na sua tarefa. 💪';
            case 'Dicas TDAH':
                Modal.open('tipsModal');
                return '💡 Abrindo dicas para TDAH! Organização visual e pausas regulares são suas melhores amigas!';
            default:
                return 'Como posso ajudar? Estou aqui para apoiar seu desenvolvimento cognitivo! 🌟';
        }
    },

    updateBadge() {
        const badge = $('#neuroBotBadge');
        if (!badge) return;
        const pending = State.kanban.todo.length + State.kanban.doing.length;
        badge.textContent = pending;
        badge.style.display = pending > 0 ? 'flex' : 'none';
    }
};

// ─────────────────────────────────────────────
// 6. POMODORO
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
        State.pomodoro.isRunning = false;
        clearInterval(State.pomodoro._interval);
        State.pomodoro.minutes = 25;
        State.pomodoro.seconds = 0;
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
            this._complete();
            return;
        }
        this._render();
    },

    _complete() {
        this.reset();
        State.progress.pomodorosCompleted++;
        Progress.save();
        Achievements.check();
        Toast.show('🎉 Pomodoro completo! Parabéns! Faça uma pausa de 5 minutos.', 'success', 5000);
    },

    _render() {
        const p = State.pomodoro;
        const display = $('.timer-display');
        if (display) {
            display.textContent = `${String(p.minutes).padStart(2,'0')}:${String(p.seconds).padStart(2,'0')}`;
        }
    }
};

// ─────────────────────────────────────────────
// 7. KANBAN
// ─────────────────────────────────────────────

const Kanban = {
    addTask(column) {
        const input = $('#newTaskInput');
        const text = input?.value.trim();
        if (!text) return;

        State.kanban[column].push({ id: Date.now(), text, createdAt: new Date().toISOString() });
        this._saveColumn(column);
        input.value = '';
        this.render();
        NeuroBot.updateBadge();
    },

    deleteTask(column, id) {
        State.kanban[column] = State.kanban[column].filter(t => t.id !== id);
        this._saveColumn(column);
        this.render();
        NeuroBot.updateBadge();
    },

    moveTask(id, from, to) {
        const idx = State.kanban[from].findIndex(t => t.id == id);
        if (idx === -1) return;
        const [task] = State.kanban[from].splice(idx, 1);
        State.kanban[to].push(task);
        this._saveColumn(from);
        this._saveColumn(to);

        if (to === 'done') {
            State.progress.tasksCompleted++;
            Progress.save();
            Achievements.check();
            Toast.show('✅ Tarefa concluída! Parabéns!', 'success');
        }

        this.render();
        NeuroBot.updateBadge();
    },

    render() {
        ['todo', 'doing', 'done'].forEach(col => {
            const container = $(`#${col}Tasks`);
            if (!container) return;

            // Remove tasks existentes mas preserva o input de "todo"
            $$('.kanban-task', container).forEach(el => el.remove());

            State.kanban[col].forEach(task => {
                const div = document.createElement('div');
                div.className = 'kanban-task';
                div.draggable = true;
                div.dataset.taskId = task.id;
                div.dataset.column = col;

                div.innerHTML = `
                    <span>${task.text}</span>
                    <button class="kanban-delete-btn" title="Remover tarefa"
                        onclick="Kanban.deleteTask('${col}', ${task.id})"
                        style="float:right;background:#ef4444;color:#fff;border:none;
                               border-radius:50%;width:22px;height:22px;font-size:13px;
                               cursor:pointer;display:inline-flex;align-items:center;
                               justify-content:center;transition:background .2s;">×</button>
                `;

                div.addEventListener('dragstart', DnD.start.bind(DnD));
                container.appendChild(div);
            });

            // Zona de drop
            container.addEventListener('dragover', DnD.over.bind(DnD));
            container.addEventListener('drop', DnD.drop.bind(DnD));
        });
    },

    _saveColumn(col) {
        const key = `neuroKanban${col.charAt(0).toUpperCase() + col.slice(1)}`;
        storage.set(key, State.kanban[col]);
    }
};

// ─────────────────────────────────────────────
// 8. DRAG AND DROP
// ─────────────────────────────────────────────

const DnD = {
    _dragged: null,

    start(e) {
        this._dragged = e.currentTarget;
        e.dataTransfer.effectAllowed = 'move';
        // Feedback visual suave
        requestAnimationFrame(() => {
            if (this._dragged) this._dragged.style.opacity = '0.5';
        });
    },

    over(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        e.currentTarget.style.background = 'var(--accent-color-light)';
    },

    drop(e) {
        e.preventDefault();
        e.currentTarget.style.background = '';

        if (!this._dragged) return;
        this._dragged.style.opacity = '1';

        const from = this._dragged.dataset.column;
        const id = this._dragged.dataset.taskId;

        const colMap = { todoTasks: 'todo', doingTasks: 'doing', doneTasks: 'done' };
        const to = colMap[e.currentTarget.id];

        if (to && from !== to) Kanban.moveTask(id, from, to);

        this._dragged = null;
    }
};

// ─────────────────────────────────────────────
// 9. MODAIS
// ─────────────────────────────────────────────

const Modal = {
    open(id) {
        const el = $(`#${id}`);
        if (!el) return;
        el.style.display = 'flex';
        if (id === 'loginModal') Auth.setup();
    },

    close(id) {
        const el = $(`#${id}`);
        if (el) el.style.display = 'none';
    }
};

// Fechar clicando no overlay
window.addEventListener('click', e => {
    $$('.modal').forEach(modal => {
        if (e.target === modal) modal.style.display = 'none';
    });
});

// ─────────────────────────────────────────────
// 10. PROGRESSO E CONQUISTAS
// ─────────────────────────────────────────────

const Progress = {
    save() {
        storage.set('neuroProgress', State.progress);
    },

    updateDisplay() {
        const set = (id, val) => { const el = $(`#${id}`); if (el) el.textContent = val; };
        set('gamesPlayed', State.progress.gamesPlayed);
        set('pomodorosCompleted', State.progress.pomodorosCompleted);
        set('tasksCompleted', State.progress.tasksCompleted);
        Achievements.renderList();
    }
};

const ACHIEVEMENT_DEFS = [
    { id: 'first_game',     name: 'Primeiro Jogo',   desc: 'Jogue seu primeiro jogo',   icon: 'fas fa-medal',  cond: () => State.progress.gamesPlayed >= 1 },
    { id: 'pomodoro_x3',    name: 'Sequência de 3',  desc: 'Complete 3 Pomodoros',       icon: 'fas fa-fire',   cond: () => State.progress.pomodorosCompleted >= 3 },
    { id: 'task_master',    name: 'Organizador',     desc: 'Complete 10 tarefas',        icon: 'fas fa-star',   cond: () => State.progress.tasksCompleted >= 10 },
    { id: 'game_addict',    name: 'Jogador Dedicado',desc: 'Jogue 5 jogos diferentes',   icon: 'fas fa-gamepad',cond: () => State.progress.gamesPlayed >= 5 }
];

const Achievements = {
    check() {
        ACHIEVEMENT_DEFS.forEach(a => {
            if (a.cond() && !State.progress.achievements.includes(a.id)) {
                State.progress.achievements.push(a.id);
                Progress.save();
                this._notify(a);
                this.renderList();
            }
        });
    },

    _notify(achievement) {
        Toast.show(`🏆 Conquista desbloqueada: <strong>${achievement.name}</strong>`, 'achievement', 5000);
    },

    renderList() {
        const list = $('#achievementList');
        if (!list) return;
        list.innerHTML = '';

        ACHIEVEMENT_DEFS.forEach(a => {
            const unlocked = State.progress.achievements.includes(a.id);
            const div = document.createElement('div');
            div.className = `achievement ${unlocked ? 'unlocked' : 'locked'}`;
            div.innerHTML = `<i class="${a.icon}"></i><span>${a.name} — ${a.desc}</span>`;
            list.appendChild(div);
        });
    }
};

// ─────────────────────────────────────────────
// 11. TEMA
// ─────────────────────────────────────────────

const Theme = {
    apply(theme) {
        document.body.classList.remove('dark-mode', 'light-mode');
        document.body.classList.add(theme === 'light' ? 'light-mode' : 'dark-mode');
        storage.set('siteTheme', theme);
        this._updateIcon(theme);
    },

    toggle() {
        const isDark = document.body.classList.contains('dark-mode');
        this.apply(isDark ? 'light' : 'dark');
    },

    init() {
        const saved = storage.get('siteTheme', 'dark');
        this.apply(saved);
    },

    _updateIcon(theme) {
        const moon = $('#theme-icon-moon');
        const sun  = $('#theme-icon-sun');
        if (!moon || !sun) return;
        moon.style.display = theme === 'dark' ? 'block' : 'none';
        sun.style.display  = theme === 'light' ? 'block' : 'none';
    }
};

// ─────────────────────────────────────────────
// 12. AUTENTICAÇÃO
// ─────────────────────────────────────────────

const Auth = {
    setup() {
        State.auth.mode = 'login';
        this._updateUI();
        this._validate();
        ['authEmail', 'authPassword', 'authName', 'authConfirmPassword'].forEach(id => {
            const el = $(`#${id}`);
            if (el) el.value = '';
        });
        const msg = $('#authMessage');
        if (msg) msg.textContent = '';
    },

    toggle(e) {
        e.preventDefault();
        State.auth.mode = State.auth.mode === 'login' ? 'register' : 'login';
        this._updateUI();
        this._validate();
        const msg = $('#authMessage');
        if (msg) msg.textContent = '';
    },

    _updateUI() {
        const isLogin = State.auth.mode === 'login';
        const show = (id, visible) => {
            const el = $(`#${id}`);
            if (el) el.style.display = visible ? 'block' : 'none';
        };

        const title = $('#authModalTitle');
        if (title) title.textContent = isLogin ? '🔐 Login' : '📝 Cadastro';

        show('authNameLabel', !isLogin);
        show('authName', !isLogin);
        show('authConfirmPasswordLabel', !isLogin);
        show('authConfirmPassword', !isLogin);

        const btn = $('#authSubmitButton');
        if (btn) btn.textContent = isLogin ? 'Entrar' : 'Cadastrar';

        const txt = $('#toggleAuthText');
        const lnk = $('#toggleAuthLink');
        if (txt) txt.textContent = isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?';
        if (lnk) lnk.textContent = isLogin ? 'Cadastre-se' : 'Faça login';

        // Ajustar required
        const name = $('#authName');
        const confirm = $('#authConfirmPassword');
        if (name) isLogin ? name.removeAttribute('required') : name.setAttribute('required', '');
        if (confirm) isLogin ? confirm.removeAttribute('required') : confirm.setAttribute('required', '');
    },

    _validate() {
        const email = $('#authEmail')?.value.trim() || '';
        const password = $('#authPassword')?.value.trim() || '';
        const name = $('#authName')?.value.trim() || '';
        const confirm = $('#authConfirmPassword')?.value.trim() || '';
        const msg = $('#authMessage');
        const btn = $('#authSubmitButton');

        let valid = email.includes('@') && email.includes('.') && password.length >= 6;
        if (msg) msg.textContent = '';

        if (State.auth.mode === 'register') {
            if (!name) valid = false;
            if (password !== confirm) {
                valid = false;
                if (password && confirm && msg) {
                    msg.textContent = 'As senhas não coincidem.';
                    msg.style.color = 'var(--error-color)';
                }
            }
        }

        if (btn) btn.disabled = !valid;
    },

    perform() {
        const email = $('#authEmail')?.value.trim();
        const password = $('#authPassword')?.value.trim();
        const name = $('#authName')?.value.trim();
        const msg = $('#authMessage');
        if (!msg) return;

        if (State.auth.mode === 'login') {
            const valid =
                (email === 'adulto@teste.com' || email === 'crianca@teste.com') &&
                password === 'senha123';

            if (valid) {
                msg.textContent = 'Login realizado com sucesso! Bem-vindo(a)!';
                msg.style.color = 'var(--success-color)';
                Toast.show('Bem-vindo(a) ao NeuroGame! 🎉', 'success');
                setTimeout(() => Modal.close('loginModal'), 1400);
            } else {
                msg.textContent = 'Email ou senha incorretos.';
                msg.style.color = 'var(--error-color)';
            }
        } else {
            const taken = email === 'adulto@teste.com' || email === 'crianca@teste.com';
            if (taken) {
                msg.textContent = 'Este email já está em uso.';
                msg.style.color = 'var(--error-color)';
            } else {
                msg.textContent = `Cadastro de ${name} realizado! Faça login para continuar.`;
                msg.style.color = 'var(--success-color)';
                setTimeout(() => {
                    State.auth.mode = 'login';
                    this._updateUI();
                    const emailEl = $('#authEmail');
                    if (emailEl) emailEl.value = email;
                    const passEl = $('#authPassword');
                    if (passEl) passEl.value = '';
                    this._validate();
                }, 1500);
            }
        }
    }
};

// ─────────────────────────────────────────────
// 13. HUMOR (MOOD TRACKER)
// ─────────────────────────────────────────────

const Mood = {
    open() {
        Modal.open('moodModal');
        this.render();
    },

    save(mood) {
        const today = new Date().toLocaleDateString('pt-BR');
        let history = storage.get('moodHistory', []);
        history = [`${today} — ${mood}`, ...history].slice(0, 7);
        storage.set('moodHistory', history);
        this.render();
        Toast.show(`Humor "${mood}" registrado! 😊`, 'success');
    },

    render() {
        const list = $('#moodHistory');
        if (!list) return;
        const history = storage.get('moodHistory', []);
        list.innerHTML = history.length
            ? history.map(e => `<li style="padding:6px 0;border-bottom:1px solid var(--border-color)">${e}</li>`).join('')
            : '<li style="color:var(--text-tertiary)">Nenhum humor registrado ainda.</li>';
    }
};

// ─────────────────────────────────────────────
// 14. NOTAS RÁPIDAS
// ─────────────────────────────────────────────

const Notes = {
    open() {
        Modal.open('notesModal');
        this.render();
    },

    save() {
        const input = $('#newNote');
        const text = input?.value.trim();
        if (!text) return;
        const notes = [text, ...storage.get('quickNotes', [])];
        storage.set('quickNotes', notes);
        if (input) input.value = '';
        this.render();
    },

    delete(index) {
        const notes = storage.get('quickNotes', []);
        notes.splice(index, 1);
        storage.set('quickNotes', notes);
        this.render();
    },

    render() {
        const list = $('#notesList');
        if (!list) return;
        const notes = storage.get('quickNotes', []);
        list.innerHTML = notes.length
            ? notes.map((n, i) => `
                <li style="display:flex;justify-content:space-between;align-items:center;
                           padding:8px 0;border-bottom:1px solid var(--border-color);gap:8px">
                    <span>${n}</span>
                    <button onclick="Notes.delete(${i})"
                        style="background:#ef4444;color:#fff;border:none;border-radius:6px;
                               padding:3px 8px;cursor:pointer;font-size:12px;flex-shrink:0;">×</button>
                </li>`).join('')
            : '<li style="color:var(--text-tertiary)">Nenhuma nota ainda.</li>';
    }
};

// ─────────────────────────────────────────────
// 15. JOGOS
// ─────────────────────────────────────────────

function _incrementGame() {
    State.progress.gamesPlayed++;
    Progress.save();
    Achievements.check();
}

// ── Jogo: Atenção às Cores ──────────────────

const ColorGame = {
    open() {
        Modal.open('colorGameModal');
        this.start();
    },

    start() {
        const colors = ['red', 'blue', 'green', 'yellow'];
        State.games.targetColor = colors[Math.floor(Math.random() * colors.length)];
        State.games.colorScore = 0;
        const el = $('#targetColor');
        const score = $('#colorGameScore');
        if (el) el.textContent = `Clique na cor: ${State.games.targetColor.toUpperCase()}`;
        if (score) score.textContent = 0;
    },

    check(selected) {
        if (selected === State.games.targetColor) {
            State.games.colorScore++;
            const score = $('#colorGameScore');
            if (score) score.textContent = State.games.colorScore;
            _incrementGame();
            this.start();
        } else {
            Toast.show('Ops! Cor errada. 😅 Tente de novo!', 'error', 2000);
        }
    }
};

// ── Jogo: Organizar a Rotina ─────────────────

const OrganizeGame = {
    open() {
        Modal.open('organizeGameModal');
        this.start();
    },

    start() {
        const tasks = ['Estudar', 'Jogar', 'Lavar a louça', 'Fazer exercícios', 'Assistir TV', 'Ler um livro'];
        const list = $('#taskListToDrag');
        if (list) {
            list.innerHTML = '';
            tasks.forEach((task, i) => {
                const btn = document.createElement('button');
                btn.textContent = task;
                btn.draggable = true;
                btn.id = `org-task-${i}`;
                btn.ondragstart = e => e.dataTransfer.setData('text/plain', btn.id);
                list.appendChild(btn);
            });
        }

        ['priorityHigh', 'priorityMedium', 'priorityLow'].forEach(id => {
            const el = $(`#${id}`);
            if (el) el.innerHTML = '';
        });

        const result = $('#organizeGameResult');
        if (result) result.textContent = '';

        this._startTimer();
    },

    allowDrop(e) { e.preventDefault(); },

    drop(e, priority) {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain');
        const taskEl = $(`#${id}`);
        if (!taskEl) return;

        const map = { High: 'priorityHigh', Medium: 'priorityMedium', Low: 'priorityLow' };
        const target = $(` #${map[priority]}`);
        if (!target) return;

        const li = document.createElement('li');
        li.textContent = taskEl.textContent;
        target.appendChild(li);
        taskEl.remove();
    },

    finish() {
        const total = $$('#priorityHigh li, #priorityMedium li, #priorityLow li').length;
        const result = $('#organizeGameResult');
        if (total < 6) {
            if (result) result.textContent = '📌 Você ainda não organizou todas as tarefas!';
        } else {
            this._stopTimer();
            const time = formatTime(State.games.organizeTimeElapsed);
            if (result) result.textContent = `✅ Parabéns! Você organizou sua rotina em ${time}!`;
            _incrementGame();
            Toast.show(`🎉 Rotina organizada em ${time}!`, 'success', 4000);
        }
    },

    _startTimer() {
        clearInterval(State.games.organizeTimerInterval);
        State.games.organizeTimeElapsed = 0;
        const el = $('#organizeTimer');
        if (el) el.textContent = '00:00';

        State.games.organizeTimerInterval = setInterval(() => {
            State.games.organizeTimeElapsed++;
            if (el) el.textContent = formatTime(State.games.organizeTimeElapsed);
        }, 1000);
    },

    _stopTimer() {
        clearInterval(State.games.organizeTimerInterval);
    }
};

// ── Jogo: Verdadeiro ou Falso ────────────────

const TF_QUESTIONS = [
    { q: 'Estudar com música sempre melhora o foco.',     correct: 'false', exp: 'Depende da pessoa — para alguns pode atrapalhar.' },
    { q: 'Fazer pausas curtas pode aumentar a produtividade.', correct: 'true',  exp: 'Técnicas como Pomodoro incentivam pequenas pausas.' },
    { q: 'Dormir pouco melhora o rendimento.',            correct: 'false', exp: 'Dormir mal reduz foco e memória.' },
    { q: 'Organizar suas tarefas ajuda a reduzir o estresse.', correct: 'true', exp: 'Ter um plano reduz a ansiedade e aumenta a clareza.' }
];

const TrueFalseGame = {
    open() {
        Modal.open('trueFalseGameModal');
        this.start();
    },

    start() {
        State.games.currentTFIndex = 0;
        State.games.tfScore = 0;
        this._show();
    },

    answer(userAnswer) {
        const q = TF_QUESTIONS[State.games.currentTFIndex];
        const feedback = $('#trueFalseFeedback');
        if (userAnswer === q.correct) {
            State.games.tfScore++;
            if (feedback) feedback.textContent = `✅ Correto! ${q.exp}`;
        } else {
            if (feedback) feedback.textContent = `❌ Errado! ${q.exp}`;
        }
        State.games.currentTFIndex++;
        setTimeout(() => this._show(), 2000);
    },

    _show() {
        const qEl = $('#trueFalseQuestion');
        const fb = $('#trueFalseFeedback');
        const sc = $('#trueFalseScore');

        if (State.games.currentTFIndex >= TF_QUESTIONS.length) {
            if (qEl) qEl.textContent = 'Fim do jogo!';
            if (fb) fb.textContent = `Você acertou ${State.games.tfScore} de ${TF_QUESTIONS.length} perguntas!`;
            _incrementGame();
            return;
        }

        const q = TF_QUESTIONS[State.games.currentTFIndex];
        if (qEl) qEl.textContent = q.q;
        if (fb) fb.textContent = '';
        if (sc) sc.textContent = `Pergunta ${State.games.currentTFIndex + 1} de ${TF_QUESTIONS.length}`;
    }
};

// ── Jogo: Pares de Memória ───────────────────

const MemoryPairs = {
    board: [],
    first: null,
    second: null,
    attempts: 0,

    open() {
        Modal.open('memoryPairsGameModal');
        this.start();
    },

    start() {
        this.board = [];
        this.first = null;
        this.second = null;
        this.attempts = 0;

        const container = $('#memoryPairsBoard');
        const fb = $('#memoryPairsFeedback');
        if (container) container.innerHTML = '';
        if (fb) fb.textContent = '';

        const values = [1, 1, 2, 2, 3, 3, 4, 4].sort(() => Math.random() - 0.5);
        values.forEach((val, i) => {
            const tile = document.createElement('div');
            tile.className = 'memory-tile';
            tile.dataset.value = val;
            tile.dataset.index = i;
            tile.addEventListener('click', () => this._reveal(tile));
            container?.appendChild(tile);
            this.board.push(tile);
        });
    },

    _reveal(tile) {
        if (tile.classList.contains('revealed') || this.second) return;

        tile.classList.add('revealed');
        tile.textContent = tile.dataset.value;

        if (!this.first) {
            this.first = tile;
            return;
        }

        this.second = tile;
        this.attempts++;

        if (this.first.dataset.value === this.second.dataset.value) {
            this.first = null;
            this.second = null;

            const allRevealed = this.board.every(t => t.classList.contains('revealed'));
            if (allRevealed) {
                const fb = $('#memoryPairsFeedback');
                if (fb) fb.textContent = `✅ Parabéns! Todos os pares em ${this.attempts} tentativas!`;
                _incrementGame();
                Toast.show(`🧠 Jogo da Memória concluído em ${this.attempts} tentativas!`, 'success', 4000);
            }
        } else {
            setTimeout(() => {
                [this.first, this.second].forEach(t => {
                    if (t) { t.classList.remove('revealed'); t.textContent = ''; }
                });
                this.first = null;
                this.second = null;
            }, 800);
        }
    }
};

// ── Jogo: Caça-Palavras ──────────────────────

const WORD_LIST = ['FOCO', 'ATENÇÃO', 'ORGANIZAÇÃO', 'MEMÓRIA', 'DISCIPLINA',
                   'PLANEJAMENTO', 'CONCENTRAÇÃO', 'TEMPO', 'PRODUTIVIDADE', 'OBJETIVO'];

const WordSearch = {
    open() {
        Modal.open('wordSearchModal');
        this.start();
    },

    start() {
        const g = State.games;
        g.gridLetters = [];
        g.selectedIndexes = [];
        g.currentWord = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];

        const grid = $('#wordGrid');
        const fb = $('#wordSearchFeedback');
        if (grid) grid.innerHTML = '';
        if (fb) { fb.className = 'word-search-feedback'; fb.textContent = `Encontre: ${g.currentWord}`; }

        const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const TOTAL = 36;

        for (let i = 0; i < TOTAL; i++)
            g.gridLetters.push(ALPHA[Math.floor(Math.random() * ALPHA.length)]);

        const maxStart = TOTAL - g.currentWord.length;
        const start = Math.floor(Math.random() * maxStart);
        for (let i = 0; i < g.currentWord.length; i++)
            g.gridLetters[start + i] = g.currentWord[i];

        g.gridLetters.forEach((letter, idx) => {
            const cell = document.createElement('div');
            cell.className = 'word-cell';
            cell.textContent = letter;
            cell.addEventListener('click', () => this._select(idx));
            grid?.appendChild(cell);
        });
    },

    _select(index) {
        const g = State.games;
        if (g.selectedIndexes.includes(index)) return;

        g.selectedIndexes.push(index);
        const cells = $$('.word-cell');
        if (cells[index]) cells[index].classList.add('selected');

        if (g.selectedIndexes.length !== g.currentWord.length) return;

        const formed = g.selectedIndexes.map(i => g.gridLetters[i]).join('');
        const fb = $('#wordSearchFeedback');

        if (formed === g.currentWord) {
            if (fb) { fb.className = 'word-search-feedback success'; fb.textContent = `✅ Encontrou "${g.currentWord}"!`; }
            _incrementGame();
            Toast.show(`🔤 Palavra "${g.currentWord}" encontrada!`, 'success');
        } else {
            if (fb) { fb.className = 'word-search-feedback error'; fb.textContent = `❌ Formou "${formed}". Tente novamente!`; }
        }

        setTimeout(() => this.start(), 2000);
    }
};

// ── Jogo: Sequência Numérica ─────────────────

const SEQUENCES = [
    { seq: [2, 4, 6, '?'],   answer: 8  },
    { seq: [1, 3, 5, '?'],   answer: 7  },
    { seq: [5, 10, 15, '?'], answer: 20 },
    { seq: [10, 9, 8, '?'],  answer: 7  },
    { seq: [2, 6, 18, '?'],  answer: 54 },
    { seq: [1, 4, 9, '?'],   answer: 16 }
];

const SequenceGame = {
    open() {
        Modal.open('sequenceGameModal');
        State.games.currentLevel = 0;
        this.start();
    },

    start() {
        const fb = $('#sequenceFeedback');
        if (fb) { fb.textContent = ''; fb.className = 'sequence-feedback'; }

        if (State.games.currentLevel >= SEQUENCES.length) State.games.currentLevel = 0;

        const level = State.games.currentLevel;
        const levelEl = $('#sequenceLevel');
        const qEl = $('#sequenceQuestion');
        const optsEl = $('#sequenceOptions');

        if (levelEl) levelEl.textContent = `Nível: ${level + 1}`;
        if (qEl) qEl.textContent = SEQUENCES[level].seq.join(', ');

        if (!optsEl) return;
        optsEl.innerHTML = '';

        const correct = SEQUENCES[level].answer;
        const options = [correct];
        while (options.length < 4) {
            const offset = (Math.floor(Math.random() * 6) + 1) * (Math.random() > 0.5 ? 1 : -1);
            const fake = correct + offset;
            if (!options.includes(fake) && fake > 0) options.push(fake);
        }
        options.sort(() => Math.random() - 0.5);

        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'sequence-option-btn';
            btn.textContent = opt;
            btn.addEventListener('click', () => this._answer(opt));
            optsEl.appendChild(btn);
        });
    },

    _answer(selected) {
        const fb = $('#sequenceFeedback');
        const correct = SEQUENCES[State.games.currentLevel].answer;

        if (selected === correct) {
            if (fb) { fb.textContent = '✅ Correto!'; fb.className = 'sequence-feedback correct'; }
            State.games.currentLevel++;
            _incrementGame();
            setTimeout(() => this.start(), 1500);
        } else {
            if (fb) { fb.textContent = `❌ Errado! A resposta era ${correct}.`; fb.className = 'sequence-feedback wrong'; }
        }
    }
};

// ─────────────────────────────────────────────
// 16. FUNÇÃO GERAL openGame()
// ─────────────────────────────────────────────

function openGame(name) {
    const map = {
        organize:    () => OrganizeGame.open(),
        trueFalse:   () => TrueFalseGame.open(),
        memoryPairs: () => MemoryPairs.open(),
        wordSearch:  () => WordSearch.open(),
        sequence:    () => SequenceGame.open(),
        color:       () => ColorGame.open()
    };
    if (map[name]) map[name]();
    else Toast.show('Jogo em desenvolvimento! Em breve. 🚧', 'info');
}

// ─────────────────────────────────────────────
// 17. NAVEGAÇÃO
// ─────────────────────────────────────────────

function scrollToSection(id) {
    const el = $(`#${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function toggleMobileMenu() {
    $('.nav-menu')?.classList.toggle('active');
}

// ─────────────────────────────────────────────
// 18. FUNÇÕES GLOBAIS (chamadas via HTML)
//     Mantidas para compatibilidade com o HTML
// ─────────────────────────────────────────────

// NeuroBot
const openNeuroBot  = () => NeuroBot.open();
const closeNeuroBot = () => NeuroBot.close();
const toggleNeuroBot= () => NeuroBot.toggle();
const sendNeuroBotMessage = () => NeuroBot.send();
const sendQuickMessage    = t => NeuroBot.sendQuick(t);

// Pomodoro
const startPomodoro = () => Pomodoro.start();
const pausePomodoro = () => Pomodoro.pause();
const resetPomodoro = () => Pomodoro.reset();

// Kanban
const openKanban = () => { Modal.open('kanbanModal'); Kanban.render(); };
const addKanbanTask = col => Kanban.addTask(col);

// Modais
const openModal  = id => Modal.open(id);
const closeModal = id => Modal.close(id);
const openTips   = () => Modal.open('tipsModal');
const openProgress = () => { Modal.open('progressModal'); Progress.updateDisplay(); };

// Tema
const toggleTheme = () => Theme.toggle();

// Auth
const toggleAuthMode = e => Auth.toggle(e);
const validateLoginForm = () => Auth._validate();
const performAuth = () => Auth.perform();

// Humor / Notas
const openMoodTracker = () => Mood.open();
const saveMood = mood => Mood.save(mood);
const openNotes = () => Notes.open();
const saveNote  = () => Notes.save();
const deleteNote = i => Notes.delete(i);

// Color Game
const openColorGame = () => ColorGame.open();
const checkColor    = c  => ColorGame.check(c);
const startColorGame= () => ColorGame.start();

// Organize Game
const allowDrop = e => e.preventDefault();
const drop = (e, p) => OrganizeGame.drop(e, p);
const finishOrganizeGame = () => OrganizeGame.finish();

// TrueFalse
const answerTrueFalse = ans => TrueFalseGame.answer(ans);

// Sequence
const selectOption = opt => SequenceGame._answer(opt);

// ─────────────────────────────────────────────
// 19. INICIALIZAÇÃO
// ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    // Tema
    Theme.init();

    // Navegação mobile
    $('.hamburger')?.addEventListener('click', toggleMobileMenu);

    // NeuroBot input
    $('#neuroBotInput')?.addEventListener('keypress', e => {
        if (e.key === 'Enter') NeuroBot.send();
    });

    // Auth inputs — validação em tempo real
    ['authEmail', 'authPassword', 'authName', 'authConfirmPassword'].forEach(id => {
        $(`#${id}`)?.addEventListener('input', () => Auth._validate());
    });
    $('#authSubmitButton')?.addEventListener('click', () => Auth.perform());
    $('#toggleAuthLink')?.addEventListener('click', e => Auth.toggle(e));
    $('#theme-toggle-btn')?.addEventListener('click', () => Theme.toggle());

    // Kanban
    Kanban.render();

    // Pomodoro display inicial
    Pomodoro._render();

    // Badge do bot
    NeuroBot.updateBadge();

    // Animações de entrada para cards (Intersection Observer)
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });

    $$('.game-card, .tool-card, .stat-card').forEach((card, i) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(24px)';
        card.style.transition = `opacity 0.5s ease ${i * 0.07}s, transform 0.5s ease ${i * 0.07}s`;
        observer.observe(card);
    });

    // Estilos extras injetados
    injectStyles();
});

// ─────────────────────────────────────────────
// 20. ESTILOS INJETADOS (nav mobile + notifs)
// ─────────────────────────────────────────────

function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes slideOutRight {
            from { transform: translateX(0);    opacity: 1; }
            to   { transform: translateX(100%); opacity: 0; }
        }

        .nav-menu.active {
            display: flex !important;
            flex-direction: column;
            position: absolute;
            top: 100%;
            left: 0;
            width: 100%;
            background: linear-gradient(135deg, var(--bg-gradient-start), var(--bg-gradient-end));
            padding: 1rem 1.5rem;
            box-shadow: 0 8px 24px rgba(0,0,0,0.15);
            gap: 1rem;
            z-index: 999;
        }

        .kanban-task:active { cursor: grabbing; }

        .kanban-tasks.drag-over {
            background: var(--accent-color-light) !important;
        }

        .word-search-feedback { font-weight: 700; text-align: center; padding: 10px; font-size: 15px; transition: all .3s; }
        .word-search-feedback.success { color: var(--success-color); }
        .word-search-feedback.error   { color: var(--error-color); }
    `;
    document.head.appendChild(style);
}
