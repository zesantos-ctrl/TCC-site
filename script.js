/* ====================================================
   NEUROGAME — script.js
   ==================================================== */

// ── Estado Global ─────────────────────────────────────
const state = {
    isNeuroBotOpen: false,
    authMode: 'login',
    progress: JSON.parse(localStorage.getItem('neuroProgress')) || {
        gamesPlayed: 0,
        pomodorosCompleted: 0,
        tasksCompleted: 0,
        achievements: []
    }
};

// ── Inicialização ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    applySavedTheme();
    updateProgressDisplay();
    document.getElementById('hamburger').addEventListener('click', toggleMobileMenu);
    ['authEmail', 'authPassword', 'authName', 'authConfirmPassword'].forEach(id => {
        document.getElementById(id).addEventListener('input', validateAuthForm);
    });
    document.getElementById('authSubmitButton').addEventListener('click', performAuth);
    document.getElementById('toggleAuthLink').addEventListener('click', e => {
        e.preventDefault(); toggleAuthMode();
    });
    document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);

    // Sessão + scroll spy
    applySession();
    initScrollSpy();
});

// ── Navegação ──────────────────────────────────────────
function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

function toggleMobileMenu() {
    document.getElementById('navMenu').classList.toggle('active');
}

// ── Modais ─────────────────────────────────────────────
function openModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = 'flex';
    if (id === 'loginModal') setupLoginModal();
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
}

window.addEventListener('click', e => {
    document.querySelectorAll('.modal').forEach(m => {
        if (e.target === m) closeModal(m.id);
    });
});

// ── Tema ───────────────────────────────────────────────
function toggleTheme() {
    const body = document.body;
    const isDark = body.classList.contains('dark-mode');
    body.classList.toggle('dark-mode', !isDark);
    body.classList.toggle('light-mode', isDark);
    localStorage.setItem('siteTheme', isDark ? 'light' : 'dark');
    document.getElementById('theme-icon-moon').style.display = isDark ? 'block' : 'none';
    document.getElementById('theme-icon-sun').style.display = isDark ? 'none' : 'block';
}

function applySavedTheme() {
    const saved = localStorage.getItem('siteTheme') || 'dark';
    document.body.classList.add(saved === 'light' ? 'light-mode' : 'dark-mode');
    document.getElementById('theme-icon-moon').style.display = saved === 'light' ? 'none' : 'block';
    document.getElementById('theme-icon-sun').style.display = saved === 'light' ? 'block' : 'none';
}

// ── NeuroBot ───────────────────────────────────────────










// ── Scroll Spy ─────────────────────────────────────────
function initScrollSpy() {
    const sections = ['home', 'games', 'tools', 'about'].map(id => document.getElementById(id)).filter(Boolean);
    const links    = document.querySelectorAll('.nav-menu a[href^="#"]');

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const id = entry.target.id;
            links.forEach(a => {
                const isActive = a.getAttribute('href') === `#${id}`;
                a.classList.toggle('nav-spy-active', isActive);
            });
        });
    }, { threshold: 0.35, rootMargin: '-70px 0px -40% 0px' });

    sections.forEach(s => observer.observe(s));
}

// ── Progresso ──────────────────────────────────────────
function saveProgress() {
    localStorage.setItem('neuroProgress', JSON.stringify(state.progress));
}

function updateProgressDisplay() {
    // Lê dados reais do pomodoro (publicados pelo pomodoro.js via ng_pw_state)
    try {
        const pw = JSON.parse(localStorage.getItem('ng_pw_state'));
        if (pw && pw.everStarted) {
            if (pw.pomodorosCompleted > state.progress.pomodorosCompleted) {
                state.progress.pomodorosCompleted = pw.pomodorosCompleted;
            }
            if (pw.focusMinutes) {
                state.progress.focusMinutes = pw.focusMinutes;
            }
        }
    } catch {}

    // Tarefas do kanban concluídas
    try {
        const kanban = JSON.parse(localStorage.getItem('ng_kanban'));
        if (kanban && kanban.done) {
            const done = kanban.done.length;
            if (done > state.progress.tasksCompleted) {
                state.progress.tasksCompleted = done;
            }
        }
    } catch {}

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('gamesPlayed',         state.progress.gamesPlayed);
    set('pomodorosCompleted',  state.progress.pomodorosCompleted);
    set('tasksCompleted',      state.progress.tasksCompleted);

    // Linha de minutos de foco (se o elemento existir)
    const focusEl = document.getElementById('focusMinutesProgress');
    if (focusEl) focusEl.textContent = state.progress.focusMinutes || 0;

    renderAchievements();
}

const ACHIEVEMENTS = [
    { id: 'first_game', name: 'Primeiro Jogo', desc: 'Jogue seu primeiro jogo', icon: 'fas fa-medal', check: () => state.progress.gamesPlayed >= 1 },
    { id: 'five_games', name: 'Gamer Cognitivo', desc: 'Jogue 5 jogos', icon: 'fas fa-gamepad', check: () => state.progress.gamesPlayed >= 5 },
    { id: 'pomodoro_3', name: 'Foco Total', desc: 'Complete 3 Pomodoros', icon: 'fas fa-fire', check: () => state.progress.pomodorosCompleted >= 3 },
    { id: 'tasks_10', name: 'Organizador', desc: 'Complete 10 tarefas', icon: 'fas fa-star', check: () => state.progress.tasksCompleted >= 10 }
];

function checkAchievements() {
    ACHIEVEMENTS.forEach(a => {
        if (a.check() && !state.progress.achievements.includes(a.id)) {
            state.progress.achievements.push(a.id);
            saveProgress();
            showToast(`🏆 Conquista desbloqueada: ${a.name}!`);
        }
    });
    renderAchievements();
}

function renderAchievements() {
    const list = document.getElementById('achievementList');
    if (!list) return;
    list.innerHTML = '';
    ACHIEVEMENTS.forEach(a => {
        const unlocked = state.progress.achievements.includes(a.id);
        const div = document.createElement('div');
        div.className = `achievement ${unlocked ? 'unlocked' : 'locked'}`;
        div.innerHTML = `<i class="${a.icon}"></i><span>${a.name} — ${a.desc}</span>`;
        list.appendChild(div);
    });
}

function openTips() { openModal('tipsModal'); }
function openProgress() { openModal('progressModal'); updateProgressDisplay(); }

// ── Toast ──────────────────────────────────────────────
function showToast(msg) {
    const el = document.createElement('div');
    el.style.cssText = `
        position:fixed; top:20px; right:20px; z-index:99999;
        background:linear-gradient(135deg,#fbbf24,#f59e0b);
        color:#1e1b4b; padding:14px 20px; border-radius:12px;
        box-shadow:0 8px 24px rgba(251,191,36,.4);
        font-family:'Nunito',sans-serif; font-weight:800; font-size:.95rem;
        max-width:300px; animation:slideInRight .3s ease-out;
    `;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => {
        el.style.animation = 'slideOutRight .3s ease-out';
        setTimeout(() => el.remove(), 300);
    }, 3500);
}

// ── Auth / Login ───────────────────────────────────────
function setupLoginModal() {
    state.authMode = 'login';
    updateAuthUI();
    ['authEmail', 'authPassword', 'authName', 'authConfirmPassword'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('authMessage').textContent = '';
}

function toggleAuthMode() {
    state.authMode = state.authMode === 'login' ? 'register' : 'login';
    updateAuthUI();
    document.getElementById('authMessage').textContent = '';
}

function updateAuthUI() {
    const isLogin = state.authMode === 'login';
    document.getElementById('authModalTitle').textContent = isLogin ? '🔐 Login' : '📝 Cadastro';
    document.getElementById('authSubmitButton').textContent = isLogin ? 'Entrar' : 'Cadastrar';
    document.getElementById('toggleAuthText').textContent = isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?';
    document.getElementById('toggleAuthLink').textContent = isLogin ? 'Cadastre-se' : 'Faça login';
    document.getElementById('authNameGroup').style.display = isLogin ? 'none' : 'flex';
    document.getElementById('authConfirmGroup').style.display = isLogin ? 'none' : 'flex';
    validateAuthForm();
}

function validateAuthForm() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    const name = document.getElementById('authName').value.trim();
    const confirm = document.getElementById('authConfirmPassword').value.trim();
    const msg = document.getElementById('authMessage');
    const btn = document.getElementById('authSubmitButton');

    let valid = email.includes('@') && email.includes('.') && password.length >= 6;

    if (state.authMode === 'register') {
        if (!name) valid = false;
        if (password && confirm && password !== confirm) {
            msg.textContent = 'As senhas não coincidem.';
            msg.style.color = '#dc2626';
            valid = false;
        } else if (!confirm) {
            valid = false;
        } else {
            if (msg.textContent === 'As senhas não coincidem.') msg.textContent = '';
        }
    }
    btn.disabled = !valid;
}

// ── Auth com localStorage ─────────────────────────────────
const AUTH_KEY = 'ng_users';
const SESSION_KEY = 'ng_session';

function getUsers() {
    try { return JSON.parse(localStorage.getItem(AUTH_KEY)) || {}; } catch { return {}; }
}
function saveUsers(u) { localStorage.setItem(AUTH_KEY, JSON.stringify(u)); }

function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
}
function saveSession(user) { localStorage.setItem(SESSION_KEY, JSON.stringify(user)); }
function clearSession() { localStorage.removeItem(SESSION_KEY); }

function performAuth() {
    const email    = document.getElementById('authEmail').value.trim().toLowerCase();
    const password = document.getElementById('authPassword').value;
    const name     = document.getElementById('authName').value.trim();
    const msg      = document.getElementById('authMessage');
    const users    = getUsers();

    // Contas de teste pré-cadastradas
    if (!users['adulto@teste.com']) {
        users['adulto@teste.com'] = { name: 'Adulto Teste', password: 'senha123' };
        users['crianca@teste.com'] = { name: 'Criança Teste', password: 'senha123' };
        saveUsers(users);
    }

    if (state.authMode === 'login') {
        const user = users[email];
        if (user && user.password === password) {
            saveSession({ name: user.name, email });
            msg.textContent = `✅ Bem-vindo(a), ${user.name}!`;
            msg.style.color = '#16a34a';
            setTimeout(() => {
                closeModal('loginModal');
                applySession();
            }, 1000);
        } else {
            msg.textContent = '❌ Email ou senha incorretos.';
            msg.style.color = '#dc2626';
        }
    } else {
        if (users[email]) {
            msg.textContent = '❌ Este email já está cadastrado.';
            msg.style.color = '#dc2626';
        } else {
            users[email] = { name, password };
            saveUsers(users);
            saveSession({ name, email });
            msg.textContent = `✅ Conta criada! Bem-vindo(a), ${name}!`;
            msg.style.color = '#16a34a';
            setTimeout(() => {
                closeModal('loginModal');
                applySession();
            }, 1000);
        }
    }
}

// Aplica sessão na UI (header + modal)
function applySession() {
    const session = getSession();
    const loginLink = document.getElementById('navLoginLink');
    const userGreet = document.getElementById('navUserGreet');
    const userNameEl = document.getElementById('navUserName');
    const userAvatar = document.getElementById('navUserAvatar');

    if (session) {
        if (loginLink)  loginLink.style.display  = 'none';
        if (userGreet)  userGreet.style.display   = 'flex';
        if (userNameEl) userNameEl.textContent    = session.name.split(' ')[0];
        if (userAvatar) userAvatar.textContent    = session.name.charAt(0).toUpperCase();
    } else {
        if (loginLink)  loginLink.style.display  = 'list-item';
        if (userGreet)  userGreet.style.display   = 'none';
    }
}

function logoutUser() {
    clearSession();
    applySession();
    showToast('👋 Até logo! Sessão encerrada.');
}

// ── Mood Tracker ───────────────────────────────────────
function openMoodTracker() { openModal('moodModal'); renderMoodHistory(); }

function saveMood(mood) {
    const today = new Date().toLocaleDateString('pt-BR');
    let history = JSON.parse(localStorage.getItem('moodHistory')) || [];
    history.unshift(`${today} — ${mood}`);
    if (history.length > 7) history.pop();
    localStorage.setItem('moodHistory', JSON.stringify(history));
    renderMoodHistory();
    showToast(`Humor registrado: ${mood}`);
}

function renderMoodHistory() {
    const list = document.getElementById('moodHistory');
    if (!list) return;
    const history = JSON.parse(localStorage.getItem('moodHistory')) || [];
    list.innerHTML = history.length
        ? history.map(e => `<li>${e}</li>`).join('')
        : '<li style="color:var(--text-tertiary);font-style:italic">Nenhum registro ainda.</li>';
}

// ── Notas ──────────────────────────────────────────────
function openNotes() { openModal('notesModal'); renderNotes(); }

function saveNote() {
    const ta = document.getElementById('newNote');
    const text = ta.value.trim();
    if (!text) return;
    let notes = JSON.parse(localStorage.getItem('quickNotes')) || [];
    notes.unshift(text);
    localStorage.setItem('quickNotes', JSON.stringify(notes));
    ta.value = '';
    renderNotes();
}

function deleteNote(idx) {
    let notes = JSON.parse(localStorage.getItem('quickNotes')) || [];
    notes.splice(idx, 1);
    localStorage.setItem('quickNotes', JSON.stringify(notes));
    renderNotes();
}

function renderNotes() {
    const list = document.getElementById('notesList');
    if (!list) return;
    const notes = JSON.parse(localStorage.getItem('quickNotes')) || [];
    list.innerHTML = notes.length
        ? notes.map((n, i) => `
            <li>
                <span>${n}</span>
                <button class="note-del-btn" onclick="deleteNote(${i})">✕</button>
            </li>`).join('')
        : '<li style="color:var(--text-tertiary);font-style:italic">Nenhuma nota ainda.</li>';
}

// ── Dispatcher de Jogos ────────────────────────────────
function openGame(name) {
    const map = {
        memoryPairs: () => { openModal('memoryPairsGameModal'); startMemoryPairsGame(); },
        wordSearch:  () => { openModal('wordSearchModal');      startWordSearch(); },
        organize:    () => { openModal('organizeGameModal');    startOrganizeGame(); },
        sequence:    () => { openModal('sequenceGameModal');    startSequenceGame(); },
        trueFalse:   () => { openModal('trueFalseGameModal');   startTrueFalseGame(); },
        diffGame:    () => openDiffGame(),
    };
    if (map[name]) map[name]();
}

function openColorGame() { openModal('colorGameModal'); startColorGame(); }

function registerGame() {
    state.progress.gamesPlayed++;
    saveProgress();
    checkAchievements();
}

// ── JOGO: Atenção — Cores ──────────────────────────────
const COLOR_LIST = [
    { label: 'vermelho', hex: '#e74c3c' },
    { label: 'azul',     hex: '#3498db' },
    { label: 'verde',    hex: '#27ae60' },
    { label: 'amarelo',  hex: '#f1c40f' },
    { label: 'roxo',     hex: '#9b59b6' },
    { label: 'laranja',  hex: '#e67e22' }
];
let colorTarget = '';
let colorScore  = 0;
let colorRecord = parseInt(localStorage.getItem('colorRecord') || '0');

function startColorGame() {
    colorTarget = COLOR_LIST[Math.floor(Math.random() * COLOR_LIST.length)].label;
    document.getElementById('targetColorText').textContent = `Clique em: ${colorTarget.toUpperCase()}`;
    document.getElementById('colorGameFeedback').textContent = '';
    document.getElementById('colorGameRecord').textContent = colorRecord;
}

function checkColor(selected) {
    const fb = document.getElementById('colorGameFeedback');
    if (selected === colorTarget) {
        colorScore++;
        document.getElementById('colorGameScore').textContent = colorScore;
        if (colorScore > colorRecord) {
            colorRecord = colorScore;
            localStorage.setItem('colorRecord', colorRecord);
            document.getElementById('colorGameRecord').textContent = colorRecord;
        }
        fb.textContent = '✅ Certo!';
        fb.style.color = '#16a34a';
        registerGame();
        startColorGame();
    } else {
        fb.textContent = `❌ Era "${colorTarget.toUpperCase()}"! Pontuação: ${colorScore}`;
        fb.style.color = '#dc2626';
        colorScore = 0;
        document.getElementById('colorGameScore').textContent = 0;
        setTimeout(startColorGame, 1800);
    }
}

// ── JOGO: Organizar a Rotina ───────────────────────────
let organizeInterval = null;
let organizeElapsed  = 0;

const ORGANIZE_TASKS = [
    { text: '📚 Estudar para a prova', priority: 'High' },
    { text: '🏃 Fazer exercícios',      priority: 'High' },
    { text: '🍽️ Lavar a louça',         priority: 'Medium' },
    { text: '📖 Ler um livro',          priority: 'Medium' },
    { text: '🎮 Jogar videogame',       priority: 'Low' },
    { text: '📺 Assistir série',        priority: 'Low' }
];

function startOrganizeGame() {
    clearInterval(organizeInterval);
    organizeElapsed = 0;
    document.getElementById('organizeTimer').textContent = '00:00';
    document.getElementById('organizeGameResult').textContent = '';
    document.getElementById('priorityHigh').innerHTML = '';
    document.getElementById('priorityMedium').innerHTML = '';
    document.getElementById('priorityLow').innerHTML = '';

    const container = document.getElementById('taskListToDrag');
    container.innerHTML = '';
    const shuffled = [...ORGANIZE_TASKS].sort(() => Math.random() - 0.5);
    shuffled.forEach((task, i) => {
        const btn = document.createElement('button');
        btn.className = 'drag-task-btn';
        btn.textContent = task.text;
        btn.draggable = true;
        btn.id = `dtask-${i}`;
        btn.dataset.priority = task.priority;
        btn.addEventListener('dragstart', e => {
            e.dataTransfer.setData('taskText', task.text);
            e.dataTransfer.setData('taskPriority', task.priority);
            e.dataTransfer.setData('taskBtnId', btn.id);
        });
        container.appendChild(btn);
    });

    document.querySelectorAll('.drop-zone').forEach(zone => {
        zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
        zone.addEventListener('drop', e => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            const text  = e.dataTransfer.getData('taskText');
            const btnId = e.dataTransfer.getData('taskBtnId');
            const li = document.createElement('li');
            li.textContent = text;
            zone.querySelector('ul').appendChild(li);
            document.getElementById(btnId)?.remove();
        });
    });

    organizeInterval = setInterval(() => {
        organizeElapsed++;
        document.getElementById('organizeTimer').textContent = fmtTime(organizeElapsed);
    }, 1000);
}

function allowDrop(e) { e.preventDefault(); }

function drop(e, priority) {
    e.preventDefault();
    const text  = e.dataTransfer.getData('taskText');
    const btnId = e.dataTransfer.getData('taskBtnId');
    if (!text) return;
    const listId = { High: 'priorityHigh', Medium: 'priorityMedium', Low: 'priorityLow' }[priority];
    const li = document.createElement('li');
    li.textContent = text;
    document.getElementById(listId).appendChild(li);
    document.getElementById(btnId)?.remove();
}

function finishOrganizeGame() {
    const placed = document.querySelectorAll('#priorityHigh li, #priorityMedium li, #priorityLow li').length;
    const result = document.getElementById('organizeGameResult');
    if (placed < ORGANIZE_TASKS.length) {
        result.textContent = `⚠️ Organize todas as ${ORGANIZE_TASKS.length} tarefas antes de finalizar!`;
        result.style.color = '#d97706';
        result.style.background = '#fef3c7';
        return;
    }
    clearInterval(organizeInterval);
    let correct = 0;
    ORGANIZE_TASKS.forEach(task => {
        const listId = { High: 'priorityHigh', Medium: 'priorityMedium', Low: 'priorityLow' }[task.priority];
        const items = [...document.querySelectorAll(`#${listId} li`)];
        if (items.some(li => li.textContent === task.text)) correct++;
    });
    const pct = Math.round((correct / ORGANIZE_TASKS.length) * 100);
    result.textContent = `✅ Concluído em ${fmtTime(organizeElapsed)}! Acertos: ${correct}/${ORGANIZE_TASKS.length} (${pct}%)`;
    result.style.color = pct >= 60 ? '#16a34a' : '#dc2626';
    result.style.background = pct >= 60 ? '#dcfce7' : '#fee2e2';
    registerGame();
}

function fmtTime(s) {
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// ── JOGO: Verdadeiro ou Falso ──────────────────────────
const TF_BANK = [
    // TDAH e cognição
    { q: 'TDAH é um transtorno exclusivo de crianças.',                         a: false, exp: 'TDAH persiste na vida adulta em até 60% dos casos.' },
    { q: 'Exercício físico libera dopamina e melhora o foco.',                  a: true,  exp: 'Atividade física é uma das melhores intervenções naturais para TDAH.' },
    { q: 'Pessoas com TDAH não conseguem se concentrar em nada.',               a: false, exp: 'Em atividades de alto interesse, o foco pode ser intenso (hiperfoco).' },
    { q: 'Dormir pouco reduz memória, humor e concentração.',                   a: true,  exp: 'O sono é essencial para consolidar memórias e regular emoções.' },
    { q: 'TDAH afeta apenas meninos.',                                          a: false, exp: 'Meninas também têm TDAH, mas com sintomas diferentes e subdiagnosticados.' },
    { q: 'Medicação é o único tratamento eficaz para TDAH.',                    a: false, exp: 'Terapia, exercício, rotina e jogos cognitivos também são tratamentos válidos.' },
    { q: 'Hiperfoco é uma característica comum no TDAH.',                       a: true,  exp: 'Hiperfoco é concentração intensa em assuntos de alto interesse.' },
    // Produtividade e foco
    { q: 'Fazer pausas curtas aumenta a produtividade.',                        a: true,  exp: 'A técnica Pomodoro comprova isso com ciclos de 25+5 min.' },
    { q: 'Multitasking é mais eficiente que focar em uma tarefa.',              a: false, exp: 'Alternar tarefas reduz qualidade e aumenta o tempo total gasto.' },
    { q: 'Estudar com música sempre melhora o foco.',                           a: false, exp: 'Depende do tipo de música e da pessoa — letras podem distrair.' },
    { q: 'Escrever tarefas à mão melhora a memorização.',                       a: true,  exp: 'A escrita manual ativa mais áreas do cérebro do que digitar.' },
    { q: 'Listas de tarefas são inúteis para pessoas com TDAH.',                a: false, exp: 'Listas visuais são uma das ferramentas mais eficazes para TDAH.' },
    { q: 'Organizar o ambiente de estudo melhora a concentração.',              a: true,  exp: 'Ambientes desorganizados aumentam distração e ansiedade.' },
    { q: 'Revisar o conteúdo logo após aprender aumenta a retenção.',           a: true,  exp: 'A curva do esquecimento de Ebbinghaus mostra que revisões precoces fixam mais.' },
    { q: 'Procrastinar sempre indica preguiça.',                                a: false, exp: 'Procrastinação geralmente envolve regulação emocional e ansiedade, não preguiça.' },
    // Saúde mental e bem-estar
    { q: 'Celebrar pequenas conquistas motiva a continuar.',                    a: true,  exp: 'Recompensas ativam o sistema de dopamina e reforçam comportamentos positivos.' },
    { q: 'Ansiedade e TDAH nunca ocorrem juntos.',                              a: false, exp: 'Ansiedade é uma das comorbidades mais comuns no TDAH.' },
    { q: 'Respiração profunda pode reduzir o estresse rapidamente.',            a: true,  exp: 'Técnicas de respiração ativam o sistema nervoso parassimpático.' },
    { q: 'Redes sociais não afetam a atenção de jovens com TDAH.',              a: false, exp: 'Notificações e rolagem infinita são especialmente prejudiciais para TDAH.' },
    { q: 'Mindfulness pode ajudar a melhorar o foco em pessoas com TDAH.',      a: true,  exp: 'Estudos mostram redução de sintomas com prática regular de mindfulness.' },
    // Organização e rotina
    { q: 'Rotinas fixas ajudam pessoas com TDAH a se organizar.',               a: true,  exp: 'Previsibilidade reduz a carga cognitiva e facilita a execução.' },
    { q: 'Usar alarmes e lembretes é sinal de fraqueza.',                       a: false, exp: 'Ferramentas externas de memória são estratégias inteligentes e recomendadas.' },
    { q: 'Dividir tarefas grandes em etapas menores facilita a execução.',      a: true,  exp: 'Tarefas menores reduzem a paralisia por análise e o início é mais fácil.' },
    { q: 'A técnica Pomodoro usa blocos de 25 minutos de foco.',                a: true,  exp: 'O ciclo padrão é 25 min de foco + 5 min de pausa.' },
    { q: 'Priorizar tarefas é desnecessário se você tem boa memória.',          a: false, exp: 'Priorização é uma habilidade executiva essencial, independente da memória.' },
    // Curiosidades do cérebro
    { q: 'O cérebro humano usa apenas 10% de sua capacidade.',                  a: false, exp: 'Esse mito foi derrubado — usamos virtualmente todo o cérebro.' },
    { q: 'Aprender coisas novas cria novas conexões neurais.',                  a: true,  exp: 'Neuroplasticidade permite ao cérebro se reorganizar ao longo da vida.' },
    { q: 'Jogar games cognitivos pode melhorar memória de trabalho.',           a: true,  exp: 'Jogos que exigem atenção e memória fortalecem essas funções executivas.' },
    { q: 'A memória funciona como uma gravação perfeita dos eventos.',          a: false, exp: 'A memória é reconstrutiva e pode ser influenciada por emoções e contexto.' },
    { q: 'Emoções positivas facilitam o aprendizado e a memória.',              a: true,  exp: 'Emoções ativam a amígdala, que intensifica a consolidação de memórias.' },
];

// Embaralha o banco e pega 10 perguntas por rodada
let tfQueue    = [];
let tfIndex    = 0;
let tfScore    = 0;
let tfAnswered = false;
let tfTimer    = null;
let tfTimeLeft = 0;
const TF_TIME_PER_Q = 12; // segundos por pergunta

function startTrueFalseGame() {
    // Embaralha e sorteia 10 perguntas
    tfQueue    = [...TF_BANK].sort(() => Math.random() - 0.5).slice(0, 10);
    tfIndex    = 0;
    tfScore    = 0;
    tfAnswered = false;
    clearInterval(tfTimer);
    renderTFQuestion();
}

function renderTFQuestion() {
    const el      = document.getElementById('trueFalseQuestion');
    const fb      = document.getElementById('trueFalseFeedback');
    const sc      = document.getElementById('trueFalseScore');
    const pr      = document.getElementById('tfProgress');
    const barWrap = document.getElementById('tfTimerBar');
    const barFill = document.getElementById('tfTimerFill');
    tfAnswered = false;
    clearInterval(tfTimer);

    if (tfIndex >= tfQueue.length) {
        // Fim de jogo
        const pct = Math.round((tfScore / tfQueue.length) * 100);
        const medal = pct === 100 ? '🏆' : pct >= 70 ? '🥈' : pct >= 50 ? '🥉' : '💪';
        el.textContent  = `${medal} Fim do jogo!`;
        fb.textContent  = `Você acertou ${tfScore}/${tfQueue.length} (${pct}%)`;
        fb.style.background = pct >= 70 ? '#dcfce7' : pct >= 50 ? '#fef3c7' : '#fee2e2';
        fb.style.color      = pct >= 70 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';
        if (sc) sc.textContent = '';
        if (pr) pr.textContent = '';
        if (barWrap) barWrap.style.display = 'none';
        registerGame();
        return;
    }

    const q = tfQueue[tfIndex];
    el.textContent      = q.q;
    fb.textContent      = '';
    fb.style.background = 'transparent';
    fb.style.color      = '';
    if (sc) sc.textContent = `Pergunta ${tfIndex + 1} de ${tfQueue.length}`;
    if (pr) {
        // Bolinhas de progresso
        pr.innerHTML = tfQueue.map((_, i) => {
            if (i < tfIndex) {
                const wasCorrect = pr.dataset[`q${i}`] === '1';
                return `<span class="tf-dot ${wasCorrect ? 'dot-ok' : 'dot-err'}"></span>`;
            }
            return `<span class="tf-dot ${i === tfIndex ? 'dot-active' : ''}"></span>`;
        }).join('');
    }

    // Timer
    tfTimeLeft = TF_TIME_PER_Q;
    if (barWrap) barWrap.style.display = 'block';
    if (barFill) {
        barFill.style.transition = 'none';
        barFill.style.width = '100%';
        // Força reflow antes de animar
        barFill.offsetWidth;
        barFill.style.transition = `width ${TF_TIME_PER_Q}s linear`;
        barFill.style.width = '0%';
    }
    updateTFTimer();
    tfTimer = setInterval(() => {
        tfTimeLeft--;
        updateTFTimer();
        if (tfTimeLeft <= 0) {
            clearInterval(tfTimer);
            // Tempo esgotado — conta como erro
            if (!tfAnswered) {
                tfAnswered = true;
                const q2 = tfQueue[tfIndex];
                if (fb) {
                    fb.textContent  = `⏰ Tempo! A resposta era: ${q2.a ? 'Verdadeiro' : 'Falso'}. ${q2.exp}`;
                    fb.style.background = '#fee2e2';
                    fb.style.color      = '#dc2626';
                }
                if (pr) pr.dataset[`q${tfIndex}`] = '0';
                tfIndex++;
                setTimeout(renderTFQuestion, 2200);
            }
        }
    }, 1000);
}

function updateTFTimer() {
    const el = document.getElementById('tfTimerCount');
    if (el) {
        el.textContent = `${tfTimeLeft}s`;
        el.style.color = tfTimeLeft <= 4 ? '#ef4444' : 'var(--text-accent)';
    }
}

function answerTrueFalse(answer) {
    if (tfAnswered) return;
    tfAnswered = true;
    clearInterval(tfTimer);

    const q       = tfQueue[tfIndex];
    const correct = (answer === 'true') === q.a;
    const fb      = document.getElementById('trueFalseFeedback');
    const pr      = document.getElementById('tfProgress');

    // Para a barra visualmente
    const barFill = document.getElementById('tfTimerFill');
    if (barFill) {
        const cur = barFill.getBoundingClientRect().width / barFill.parentElement.getBoundingClientRect().width * 100;
        barFill.style.transition = 'none';
        barFill.style.width = `${cur}%`;
    }

    if (correct) {
        tfScore++;
        fb.textContent  = `✅ Correto! ${q.exp}`;
        fb.style.background = '#dcfce7';
        fb.style.color      = '#16a34a';
        if (pr) pr.dataset[`q${tfIndex}`] = '1';
    } else {
        fb.textContent  = `❌ Errado! A resposta era: ${q.a ? 'Verdadeiro' : 'Falso'}. ${q.exp}`;
        fb.style.background = '#fee2e2';
        fb.style.color      = '#dc2626';
        if (pr) pr.dataset[`q${tfIndex}`] = '0';
    }

    const sc = document.getElementById('trueFalseScore');
    if (sc) sc.textContent = `Pergunta ${tfIndex + 1} de ${tfQueue.length}`;

    tfIndex++;
    setTimeout(renderTFQuestion, 2400);
}

// ── JOGO: Memória — Pares ──────────────────────────────
// ── JOGO: Memória com Dificuldade Progressiva ─────────
const MEMORY_LEVELS = [
    { level: 1, pairs: 4,  cols: 4, label: 'Fácil',   emojis: ['🧠','⭐','🎯','🎮'] },
    { level: 2, pairs: 6,  cols: 4, label: 'Médio',   emojis: ['🧠','⭐','🎯','🎮','🚀','💡'] },
    { level: 3, pairs: 8,  cols: 4, label: 'Difícil', emojis: ['🧠','⭐','🎯','🎮','🚀','💡','🌈','🦋'] },
    { level: 4, pairs: 10, cols: 5, label: 'Expert',  emojis: ['🧠','⭐','🎯','🎮','🚀','💡','🌈','🦋','🔥','🎨'] },
    { level: 5, pairs: 12, cols: 6, label: 'Mestre',  emojis: ['🧠','⭐','🎯','🎮','🚀','💡','🌈','🦋','🔥','🎨','🏆','🦄'] },
];

let memLevel = 0;
let memFirst = null, memSecond = null, memAttempts = 0, memFound = 0;
let memTimerInterval = null, memTimerSec = 0;
let memLocked = false;

function startMemoryPairsGame(resetLevel = true) {
    if (resetLevel) memLevel = 0;
    memFirst = null; memSecond = null; memLocked = false;
    memAttempts = 0; memFound = 0; memTimerSec = 0;
    clearInterval(memTimerInterval);

    const lvl = MEMORY_LEVELS[memLevel];

    // Atualiza UI de nível
    const lvlEl = document.getElementById('memoryLevel');
    const pairsEl = document.getElementById('memoryFound');
    const totalEl = document.getElementById('memoryTotal');
    if (lvlEl)   lvlEl.textContent   = `Nível ${lvl.level} — ${lvl.label}`;
    if (pairsEl) pairsEl.textContent = '0';
    if (totalEl) totalEl.textContent = lvl.pairs;
    document.getElementById('memoryAttempts').textContent = '0';
    document.getElementById('memoryTime').textContent     = '0s';
    document.getElementById('memoryPairsFeedback').textContent = '';

    memTimerInterval = setInterval(() => {
        memTimerSec++;
        const t = document.getElementById('memoryTime');
        if (t) t.textContent = `${memTimerSec}s`;
    }, 1000);

    const board = document.getElementById('memoryPairsBoard');
    board.innerHTML = '';
    board.style.gridTemplateColumns = `repeat(${lvl.cols}, 1fr)`;

    const pairs = [...lvl.emojis, ...lvl.emojis].sort(() => Math.random() - 0.5);
    pairs.forEach(emoji => {
        const tile = document.createElement('div');
        tile.className = 'memory-tile';
        tile.innerHTML = `
            <div class="tile-inner">
                <div class="tile-front"></div>
                <div class="tile-back">${emoji}</div>
            </div>`;
        tile.dataset.val = emoji;
        tile.addEventListener('click', () => flipMemoryTile(tile));
        board.appendChild(tile);
    });
}

function flipMemoryTile(tile) {
    if (memLocked) return;
    if (tile.classList.contains('flipped') || tile.classList.contains('matched')) return;

    tile.classList.add('flipped');

    if (!memFirst) { memFirst = tile; return; }

    memSecond = tile;
    memLocked = true;
    memAttempts++;
    document.getElementById('memoryAttempts').textContent = memAttempts;

    if (memFirst.dataset.val === memSecond.dataset.val) {
        memFirst.classList.add('matched');
        memSecond.classList.add('matched');
        memFound++;
        document.getElementById('memoryFound').textContent = memFound;
        memFirst = null; memSecond = null;
        memLocked = false;

        const lvl = MEMORY_LEVELS[memLevel];
        if (memFound === lvl.pairs) {
            clearInterval(memTimerInterval);
            const isLast = memLevel === MEMORY_LEVELS.length - 1;
            const fb = document.getElementById('memoryPairsFeedback');

            if (!isLast) {
                fb.textContent = `✅ Nível ${lvl.level} completo em ${memTimerSec}s! Próximo nível em 2s...`;
                fb.style.color = '#16a34a';
                registerGame();
                memLevel++;
                setTimeout(() => startMemoryPairsGame(false), 2000);
            } else {
                fb.textContent = `🏆 Mestre da Memória! Todos os níveis em ${memAttempts} tentativas!`;
                fb.style.color = '#f59e0b';
                registerGame();
            }
        }
    } else {
        setTimeout(() => {
            memFirst.classList.remove('flipped');
            memSecond.classList.remove('flipped');
            memFirst = null; memSecond = null;
            memLocked = false;
        }, 900);
    }
}

// ── JOGO: Caça-Palavras ────────────────────────────────
// ── JOGO: Caça-Palavras (refatorado) ──────────────────
const WORD_LIST = [
    'FOCO', 'ATENCAO', 'MEMORIA', 'ESTUDO', 'PLANO', 'TEMPO',
    'META', 'HABITO', 'TAREFA', 'ROTINA', 'CALMA', 'FORCA',
    'MENTE', 'RITMO', 'TREINO', 'PAUSA', 'ORDEM', 'PRAZO',
    'IDEIA', 'LOGICA', 'ALERTA', 'DESAFIO', 'SOLUCAO', 'INICIO'
];

// Direções: [deltaRow, deltaCol]
const WS_DIRS = [
    [0,  1],   // →  horizontal
    [1,  0],   // ↓  vertical
    [1,  1],   // ↘  diagonal
    [1, -1],   // ↙  diagonal inversa
];

const WS_COLS  = 8;
const WS_ROWS  = 8;
const WS_TOTAL = WS_COLS * WS_ROWS;
const ALPHA    = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

let wsWord        = '';
let wsGrid        = [];       // letras da grade (flat array)
let wsWordIndices = new Set(); // índices que pertencem à palavra escondida
let wsSelected    = [];        // índices selecionados pelo jogador
let wsSelCells    = [];        // elementos DOM selecionados
let wsIsDragging  = false;
let wsScore       = 0;
let wsRound       = 0;

function startWordSearch() {
    // Escolhe palavra que não tenha sido usada recentemente
    wsRound++;
    const candidates = WORD_LIST.filter(w => w !== wsWord);
    wsWord = candidates[Math.floor(Math.random() * candidates.length)];

    wsGrid        = [];
    wsWordIndices = new Set();
    wsSelected    = [];
    wsSelCells    = [];
    wsIsDragging  = false;

    document.getElementById('wordSearchFeedback').textContent = '';
    document.getElementById('wordSearchHint').textContent     = `🔎 Encontre: ${wsWord}`;

    const scoreEl = document.getElementById('wsScore');
    const roundEl = document.getElementById('wsRound');
    if (scoreEl) scoreEl.textContent = wsScore;
    if (roundEl) roundEl.textContent = wsRound;

    // Preenche grade com letras aleatórias
    for (let i = 0; i < WS_TOTAL; i++) {
        wsGrid.push(ALPHA[Math.floor(Math.random() * ALPHA.length)]);
    }

    // Tenta inserir a palavra em direção e posição aleatórias
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 200) {
        attempts++;
        const dir  = WS_DIRS[Math.floor(Math.random() * WS_DIRS.length)];
        const [dr, dc] = dir;
        const len  = wsWord.length;

        // Calcula limites de start
        const rowMax = dr === 0 ? WS_ROWS - 1 : dr > 0 ? WS_ROWS - len : len - 1;
        const colMax = dc === 0 ? WS_COLS - 1 : dc > 0 ? WS_COLS - len : len - 1;
        const colMin = dc < 0  ? len - 1 : 0;

        if (rowMax < 0 || colMax < colMin) continue;

        const startRow = Math.floor(Math.random() * (rowMax + 1));
        const startCol = colMin + Math.floor(Math.random() * (colMax - colMin + 1));

        // Verifica se cabe sem conflito ou sobrescrevendo letra diferente
        const indices = [];
        let ok = true;
        for (let i = 0; i < len; i++) {
            const r = startRow + dr * i;
            const c = startCol + dc * i;
            const idx = r * WS_COLS + c;
            if (wsGrid[idx] !== wsWord[i] && wsWordIndices.has(idx)) { ok = false; break; }
            indices.push(idx);
        }

        if (ok) {
            indices.forEach((idx, i) => {
                wsGrid[idx] = wsWord[i];
                wsWordIndices.add(idx);
            });
            placed = true;
        }
    }

    renderWordGrid();
}

function renderWordGrid() {
    const gridEl = document.getElementById('wordGrid');
    gridEl.innerHTML = '';
    gridEl.style.gridTemplateColumns = `repeat(${WS_COLS}, 1fr)`;

    wsGrid.forEach((letter, idx) => {
        const cell = document.createElement('div');
        cell.className   = 'word-cell';
        cell.textContent = letter;
        cell.dataset.idx = idx;

        // Suporte a clique E drag
        cell.addEventListener('mousedown',  () => wsStartSelect(idx, cell));
        cell.addEventListener('mouseenter', () => wsExtendSelect(idx, cell));
        cell.addEventListener('touchstart', e => { e.preventDefault(); wsStartSelect(idx, cell); }, { passive: false });
        cell.addEventListener('touchmove',  e => {
            e.preventDefault();
            const t = e.touches[0];
            const el = document.elementFromPoint(t.clientX, t.clientY);
            if (el && el.classList.contains('word-cell')) {
                wsExtendSelect(Number(el.dataset.idx), el);
            }
        }, { passive: false });

        gridEl.appendChild(cell);
    });

    // Confirmar seleção ao soltar o mouse em qualquer lugar
    document.addEventListener('mouseup',  wsConfirmSelect, { once: false });
    document.addEventListener('touchend', wsConfirmSelect, { once: false });
}

function wsStartSelect(idx, cell) {
    wsIsDragging = true;
    wsSelected   = [idx];
    wsSelCells   = [cell];
    cell.classList.add('selected');
}

function wsExtendSelect(idx, cell) {
    if (!wsIsDragging) return;
    if (cell.classList.contains('correct')) return;
    if (wsSelected.includes(idx)) return;

    wsSelected.push(idx);
    wsSelCells.push(cell);
    cell.classList.add('selected');
}

function wsConfirmSelect() {
    if (!wsIsDragging) return;
    wsIsDragging = false;

    const formed = wsSelected.map(i => wsGrid[i]).join('');
    const fb     = document.getElementById('wordSearchFeedback');

    // Verifica se a seleção é contígua e em linha reta
    const isValid = wsIsLine(wsSelected);
    const isMatch = isValid && (formed === wsWord || formed === [...wsWord].reverse().join(''));

    if (isMatch) {
        wsSelCells.forEach(c => {
            c.classList.remove('selected');
            c.classList.add('correct');
        });
        wsScore += 10;
        fb.textContent = `✅ "${wsWord}" encontrada! +10 pontos`;
        fb.style.color = '#16a34a';
        registerGame();

        const scoreEl = document.getElementById('wsScore');
        if (scoreEl) scoreEl.textContent = wsScore;

        setTimeout(startWordSearch, 1800);
    } else {
        wsSelCells.forEach(c => {
            c.classList.remove('selected');
            c.classList.add('wrong-flash');
            setTimeout(() => c.classList.remove('wrong-flash'), 400);
        });
        if (wsSelected.length >= 2) {
            fb.textContent = `❌ Não é a palavra. Continue tentando!`;
            fb.style.color = '#dc2626';
            setTimeout(() => { fb.textContent = ''; }, 1000);
        }
    }

    wsSelected  = [];
    wsSelCells  = [];
}

function wsIsLine(indices) {
    if (indices.length < 2) return true;
    const rows = indices.map(i => Math.floor(i / WS_COLS));
    const cols = indices.map(i => i % WS_COLS);
    const dr   = rows[1] - rows[0];
    const dc   = cols[1] - cols[0];
    for (let i = 1; i < indices.length; i++) {
        if (rows[i] - rows[i-1] !== dr) return false;
        if (cols[i] - cols[i-1] !== dc) return false;
    }
    return true;
}

// ── JOGO: Sequência Lógica ─────────────────────────────
const SEQUENCES = [
    { seq: [2, 4, 6, '?'],    ans: 8,    hint: '+2' },
    { seq: [1, 3, 5, '?'],    ans: 7,    hint: '+2' },
    { seq: [5, 10, 15, '?'],  ans: 20,   hint: '+5' },
    { seq: [10, 9, 8, '?'],   ans: 7,    hint: '-1' },
    { seq: [2, 6, 18, '?'],   ans: 54,   hint: '×3' },
    { seq: [1, 4, 9, '?'],    ans: 16,   hint: 'quadrados' },
    { seq: [3, 6, 12, '?'],   ans: 24,   hint: '×2' },
    { seq: [100, 50, 25, '?'], ans: 12.5, hint: '÷2' }
];
let seqLevel = 0, seqScore = 0, seqAnswered = false;

function startSequenceGame() {
    if (seqLevel >= SEQUENCES.length) seqLevel = 0;
    seqAnswered = false;
    const cur = SEQUENCES[seqLevel];
    document.getElementById('sequenceLevel').textContent = `Nível ${seqLevel + 1}`;
    document.getElementById('sequenceScore').textContent = `Pontos: ${seqScore}`;
    document.getElementById('sequenceFeedback').textContent = '';
    document.getElementById('sequenceFeedback').className = 'sequence-feedback';
    document.getElementById('sequenceQuestion').textContent = cur.seq.join('  →  ');

    const opts = new Set([cur.ans]);
    const offsets = [1, 2, 3, 4, 5, 6, 7, 8, 10];
    while (opts.size < 4) {
        const off  = offsets[Math.floor(Math.random() * offsets.length)];
        const sign = Math.random() > 0.5 ? 1 : -1;
        const fake = cur.ans + sign * off;
        if (fake !== cur.ans && fake > 0) opts.add(fake);
    }

    const optContainer = document.getElementById('sequenceOptions');
    optContainer.innerHTML = '';
    [...opts].sort(() => Math.random() - 0.5).forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'sequence-opt-btn';
        btn.textContent = opt;
        btn.addEventListener('click', () => answerSequence(opt, btn));
        optContainer.appendChild(btn);
    });
}

function answerSequence(selected, btn) {
    if (seqAnswered) return;
    seqAnswered = true;
    const cur = SEQUENCES[seqLevel];
    const fb  = document.getElementById('sequenceFeedback');

    if (selected === cur.ans) {
        btn.classList.add('correct');
        seqScore += 10;
        seqLevel++;
        fb.textContent = `✅ Correto! Padrão: ${cur.hint}`;
        fb.className = 'sequence-feedback correct';
        setTimeout(startSequenceGame, 1500);
        if (seqLevel >= SEQUENCES.length) {
            fb.textContent = `🏆 Você completou todos os níveis! Score: ${seqScore}`;
            registerGame();
        }
    } else {
        btn.classList.add('wrong');
        const corrBtn = [...document.querySelectorAll('.sequence-opt-btn')].find(b => +b.textContent === cur.ans);
        if (corrBtn) corrBtn.classList.add('correct');
        fb.textContent = `❌ Era ${cur.ans}. Padrão: ${cur.hint}`;
        fb.className = 'sequence-feedback wrong';
    }
    document.getElementById('sequenceScore').textContent = `Pontos: ${seqScore}`;
}

// ── JOGO: Encontre as Diferenças ──────────────────────
const DIFF_POOL = ['🧠','⭐','🎯','🎮','🚀','💡','🌈','🦋','🔥','🎨','🏆','🦄',
                   '🍎','🌙','🎸','🐶','🌺','🎪','🦊','🍕','🎭','🌊','🐱','🎲'];

const DIFF_LEVELS = [
    { level: 1, grid: 4, diffs: 3, time: 60,  label: 'Fácil'   },
    { level: 2, grid: 5, diffs: 4, time: 50,  label: 'Médio'   },
    { level: 3, grid: 6, diffs: 5, time: 40,  label: 'Difícil' },
];

let diffLevel       = 0;
let diffGrid        = [];
let diffPositions   = new Set(); // índices com diferença no painel B
let diffFound       = new Set();
let diffTimer       = null;
let diffTimeLeft    = 60;

function openDiffGame() {
    openModal('diffGameModal');
    diffLevel = 0;
    startDiffGame();
}

function startDiffGame() {
    clearInterval(diffTimer);
    diffFound    = new Set();
    diffPositions = new Set();

    const lvl   = DIFF_LEVELS[diffLevel];
    const total = lvl.grid * lvl.grid;
    diffTimeLeft = lvl.time;

    // Seleciona emojis únicos para preencher o grid
    const pool = [...DIFF_POOL].sort(() => Math.random() - 0.5);
    diffGrid = Array.from({ length: total }, (_, i) => pool[i % pool.length]);

    // Escolhe índices aleatórios para diferenciar no painel B
    while (diffPositions.size < lvl.diffs) {
        diffPositions.add(Math.floor(Math.random() * total));
    }

    // Atualiza header
    const lvlEl = document.getElementById('diffLevel');
    if (lvlEl) lvlEl.textContent = `Nível ${lvl.level} — ${lvl.label}`;
    updateDiffStats();
    renderDiffBoards(lvl);

    document.getElementById('diffFeedback').textContent = '';

    // Timer
    updateDiffTimer();
    diffTimer = setInterval(() => {
        diffTimeLeft--;
        updateDiffTimer();
        if (diffTimeLeft <= 0) {
            clearInterval(diffTimer);
            const fb = document.getElementById('diffFeedback');
            fb.textContent = `⏰ Tempo esgotado! Você encontrou ${diffFound.size}/${lvl.diffs} diferenças.`;
            fb.style.color = '#dc2626';
            // Revela as não encontradas
            document.querySelectorAll('.diff-cell.diff-b:not(.found)').forEach(c => c.classList.add('missed'));
        }
    }, 1000);
}

function renderDiffBoards(lvl) {
    const total   = lvl.grid * lvl.grid;
    const boardA  = document.getElementById('diffBoardA');
    const boardB  = document.getElementById('diffBoardB');
    boardA.innerHTML = '';
    boardB.innerHTML = '';
    boardA.style.gridTemplateColumns = `repeat(${lvl.grid}, 1fr)`;
    boardB.style.gridTemplateColumns = `repeat(${lvl.grid}, 1fr)`;

    // Pool diferente para substituição
    const altPool = [...DIFF_POOL].filter(e => !diffGrid.includes(e));
    if (altPool.length < lvl.diffs) altPool.push(...DIFF_POOL);

    const diffEmojis = [...altPool].sort(() => Math.random() - 0.5).slice(0, lvl.diffs);
    const posArr     = [...diffPositions];

    for (let i = 0; i < total; i++) {
        // Painel A — imutável
        const cellA = document.createElement('div');
        cellA.className = 'diff-cell diff-a';
        cellA.textContent = diffGrid[i];
        boardA.appendChild(cellA);

        // Painel B — com diferenças
        const cellB = document.createElement('div');
        cellB.className = 'diff-cell diff-b';
        const diffIdx = posArr.indexOf(i);
        const isChanged = diffIdx !== -1;
        cellB.textContent = isChanged ? diffEmojis[diffIdx] : diffGrid[i];
        cellB.dataset.idx = i;
        cellB.dataset.isDiff = isChanged ? '1' : '0';
        cellB.addEventListener('click', () => onDiffClick(cellB));
        boardB.appendChild(cellB);
    }
}

function onDiffClick(cell) {
    if (diffFound.size >= DIFF_LEVELS[diffLevel].diffs) return;
    const idx    = cell.dataset.idx;
    const isDiff = cell.dataset.isDiff === '1';

    if (isDiff && !diffFound.has(idx)) {
        diffFound.add(idx);
        cell.classList.add('found');

        // Marca célula correspondente no painel A
        const cellsA = document.querySelectorAll('.diff-cell.diff-a');
        if (cellsA[idx]) cellsA[idx].classList.add('found-a');

        updateDiffStats();

        const lvl = DIFF_LEVELS[diffLevel];
        if (diffFound.size === lvl.diffs) {
            clearInterval(diffTimer);
            const fb = document.getElementById('diffFeedback');
            const isLast = diffLevel === DIFF_LEVELS.length - 1;

            if (!isLast) {
                fb.textContent  = `✅ Nível ${lvl.level} completo! Próximo nível em 2s...`;
                fb.style.color  = '#16a34a';
                registerGame();
                diffLevel++;
                setTimeout(startDiffGame, 2000);
            } else {
                fb.textContent = `🏆 Campeão! Encontrou todas as diferenças nos 3 níveis!`;
                fb.style.color = '#f59e0b';
                registerGame();
            }
        }
    } else if (!isDiff) {
        cell.classList.add('wrong-click');
        setTimeout(() => cell.classList.remove('wrong-click'), 500);
    }
}

function updateDiffStats() {
    const lvl = DIFF_LEVELS[diffLevel];
    const foundEl = document.getElementById('diffFound');
    const totalEl = document.getElementById('diffTotal');
    if (foundEl) foundEl.textContent = diffFound.size;
    if (totalEl) totalEl.textContent = lvl.diffs;
}

function updateDiffTimer() {
    const el = document.getElementById('diffTimer');
    if (el) {
        el.textContent = `${diffTimeLeft}s`;
        el.style.color = diffTimeLeft <= 10 ? '#ef4444' : 'var(--text-accent)';
    }
}