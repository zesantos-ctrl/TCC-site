/* =============================================================
   NeuroGame — JavaScript Melhorado
   Melhorias: sistema de pontuação, dificuldade progressiva,
   feedback detalhado, recordes, animações de estado e engine
   de jogos mais robusta.
   ============================================================= */

// ─── Estado Global ────────────────────────────────────────────
const neuroGameState = {
    isNeuroBotOpen: false,
    messages: [],
    kanbanTasks: {
        todo:  JSON.parse(localStorage.getItem('neuroKanbanTodo'))  || [],
        doing: JSON.parse(localStorage.getItem('neuroKanbanDoing')) || [],
        done:  JSON.parse(localStorage.getItem('neuroKanbanDone'))  || []
    },
    progress: JSON.parse(localStorage.getItem('neuroProgress')) || {
        gamesPlayed: 0,
        pomodorosCompleted: 0,
        tasksCompleted: 0,
        achievements: [],
        scores: {}          // { gameId: bestScore }
    },
    pomodoroTimer: {
        minutes: 25, seconds: 0,
        isRunning: false, interval: null,
        mode: 'focus'       // 'focus' | 'break'
    },
    authMode: 'login'
};

// ─── Inicialização ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initializeNeuroGame();
    updateProgressDisplay();
    updateNeuroBotBadge();
    applySavedTheme();
});

function initializeNeuroGame() {
    document.querySelector('.hamburger')?.addEventListener('click', toggleMobileMenu);
    document.getElementById('neuroBotInput')?.addEventListener('keypress', handleNeuroBotKeyPress);
    document.getElementById('theme-toggle-btn')?.addEventListener('click', toggleTheme);
    document.getElementById('authEmail')?.addEventListener('input', validateLoginForm);
    document.getElementById('authPassword')?.addEventListener('input', validateLoginForm);
    document.getElementById('authName')?.addEventListener('input', validateLoginForm);
    document.getElementById('authConfirmPassword')?.addEventListener('input', validateLoginForm);
    document.getElementById('authSubmitButton')?.addEventListener('click', performAuth);
    document.getElementById('toggleAuthLink')?.addEventListener('click', toggleAuthMode);

    renderKanbanBoard();
    updatePomodoroDisplay();
    injectGameStyles();
}

// ─── Injeção de estilos de jogos ───────────────────────────────
function injectGameStyles() {
    const s = document.createElement('style');
    s.textContent = `
        @keyframes slideInRight { from{transform:translateX(110%);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes slideOutRight { from{transform:translateX(0);opacity:1} to{transform:translateX(110%);opacity:0} }
        @keyframes popIn { 0%{transform:scale(.6);opacity:0} 70%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
        @keyframes shake  { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 60%{transform:translateX(6px)} }
        @keyframes pulse  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
        .nav-menu.active {
            display:flex; flex-direction:column; position:absolute;
            top:100%; left:0; width:100%;
            background:linear-gradient(135deg,var(--bg-gradient-start),var(--bg-gradient-end));
            padding:1rem; box-shadow:0 2px 10px rgba(0,0,0,.1); z-index:999;
        }
        @media(max-width:768px){ .nav-menu{ display:none; } }

        /* ── Tiles de memória ── */
        .memory-tile {
            width:70px; height:70px; background:var(--bg-secondary);
            border:2px solid var(--border-color); border-radius:10px;
            cursor:pointer; display:flex; align-items:center; justify-content:center;
            font-weight:700; font-size:1.5rem; color:transparent;
            transition:transform .2s, background .2s;
            user-select:none;
        }
        .memory-tile:hover:not(.matched):not(.revealed) { transform:scale(1.07); }
        .memory-tile.revealed { color:var(--text-primary); background:var(--bg-accent-gradient-start); animation:popIn .25s; }
        .memory-tile.matched  { color:var(--text-primary); background:#86efac; border-color:#22c55e; cursor:default; }
        .memory-tile.wrong    { background:#fca5a5; border-color:#ef4444; animation:shake .4s; }

        /* ── Grid de caça-palavras ── */
        .word-grid { display:grid; grid-template-columns:repeat(6,50px); gap:6px; justify-content:center; margin-bottom:14px; }
        .word-cell {
            width:50px; height:50px; background:var(--bg-secondary); text-align:center;
            line-height:50px; font-weight:700; font-size:16px; cursor:pointer;
            border-radius:8px; border:1.5px solid var(--border-color);
            transition:background .15s, transform .15s; user-select:none;
        }
        .word-cell:hover:not(.matched-cell) { background:var(--bg-tertiary); transform:scale(1.08); }
        .word-cell.selected { background:#93c5fd; color:#1e3a8a; border-color:#3b82f6; }
        .word-cell.matched-cell { background:#86efac; color:#14532d; border-color:#22c55e; cursor:default; animation:popIn .3s; }

        /* ── Sequência numérica ── */
        .sequence-option-btn {
            background:var(--bg-gradient-start); border:none; border-radius:10px;
            color:#fff; font-size:1.1rem; padding:10px 22px;
            cursor:pointer; transition:transform .15s, opacity .15s;
        }
        .sequence-option-btn:hover { transform:translateY(-2px); opacity:.9; }
        .sequence-option-btn:disabled { opacity:.5; cursor:not-allowed; transform:none; }
        .sequence-option-btn.correct-ans { background:#22c55e !important; }
        .sequence-option-btn.wrong-ans   { background:#ef4444 !important; animation:shake .4s; }

        /* ── Verdadeiro / Falso ── */
        .tf-btn { padding:10px 28px; border:none; border-radius:10px; font-weight:700; font-size:1rem; cursor:pointer; transition:.2s; }
        .tf-btn:hover { transform:translateY(-2px); }
        .tf-btn.correct-ans { background:#22c55e; color:#fff; }
        .tf-btn.wrong-ans   { background:#ef4444; color:#fff; animation:shake .4s; }

        /* ── Scoreboard ── */
        .score-badge {
            display:inline-flex; align-items:center; gap:6px;
            background:var(--bg-secondary); border:1.5px solid var(--border-color);
            border-radius:20px; padding:4px 12px; font-size:.85rem; font-weight:600; color:var(--text-primary);
        }
        .score-badge .score-num { color:var(--text-accent); font-size:1.1rem; }

        /* ── Game header ── */
        .game-header-bar {
            display:flex; justify-content:space-between; align-items:center;
            margin-bottom:14px; flex-wrap:wrap; gap:8px;
        }
        .difficulty-badge {
            font-size:.75rem; font-weight:700; padding:3px 10px; border-radius:20px; text-transform:uppercase;
        }
        .diff-easy   { background:#d1fae5; color:#065f46; }
        .diff-medium { background:#fef3c7; color:#92400e; }
        .diff-hard   { background:#fee2e2; color:#991b1b; }
    `;
    document.head.appendChild(s);
}

// ═══════════════════════════════════════════════════════════════
// UTILITÁRIOS
// ═══════════════════════════════════════════════════════════════

function saveProgress() {
    localStorage.setItem('neuroProgress', JSON.stringify(neuroGameState.progress));
}

function recordScore(gameId, score) {
    const prev = neuroGameState.progress.scores[gameId] || 0;
    if (score > prev) {
        neuroGameState.progress.scores[gameId] = score;
        saveProgress();
        return true; // novo recorde
    }
    return false;
}

function getBestScore(gameId) {
    return neuroGameState.progress.scores[gameId] || 0;
}

function formatTime(seconds) {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
}

function shuffle(arr) {
    return [...arr].sort(() => Math.random() - 0.5);
}

function $(id) { return document.getElementById(id); }

// ═══════════════════════════════════════════════════════════════
// SISTEMA DE CONQUISTAS
// ═══════════════════════════════════════════════════════════════

const ACHIEVEMENTS = [
    { id: 'first_game',      name: 'Primeiro Jogo',      desc: 'Jogue seu primeiro jogo',                icon: 'fas fa-medal',       cond: p => p.gamesPlayed >= 1  },
    { id: 'five_games',      name: 'Cinco Jogos!',        desc: 'Jogue 5 jogos',                          icon: 'fas fa-gamepad',     cond: p => p.gamesPlayed >= 5  },
    { id: 'pomodoro_1',      name: 'Primeiro Foco',       desc: 'Complete 1 Pomodoro',                    icon: 'fas fa-clock',       cond: p => p.pomodorosCompleted >= 1 },
    { id: 'pomodoro_3',      name: 'Sequência de 3',      desc: 'Complete 3 Pomodoros',                   icon: 'fas fa-fire',        cond: p => p.pomodorosCompleted >= 3 },
    { id: 'task_5',          name: 'Produtivo!',          desc: 'Conclua 5 tarefas',                      icon: 'fas fa-check-double', cond: p => p.tasksCompleted >= 5  },
    { id: 'task_master',     name: 'Organizador',         desc: 'Conclua 10 tarefas',                     icon: 'fas fa-star',        cond: p => p.tasksCompleted >= 10 },
    { id: 'memory_50',       name: 'Memória de Ouro',     desc: 'Atinja 50 pts em Pares de Memória',      icon: 'fas fa-brain',       cond: p => (p.scores.memoryPairs || 0) >= 50 },
    { id: 'sequence_5',      name: 'Lógico!',             desc: 'Chegue ao nível 6 em Sequências',        icon: 'fas fa-infinity',    cond: p => (p.scores.sequence || 0) >= 6 },
    { id: 'wordsearch_5',    name: 'Caçador de Palavras', desc: 'Encontre 5 palavras no Caça-Palavras',   icon: 'fas fa-search',      cond: p => (p.scores.wordSearch || 0) >= 5 },
];

function checkAchievements() {
    ACHIEVEMENTS.forEach(a => {
        if (!neuroGameState.progress.achievements.includes(a.id) && a.cond(neuroGameState.progress)) {
            neuroGameState.progress.achievements.push(a.id);
            saveProgress();
            showAchievementNotification(a);
        }
    });
    updateAchievementsDisplay();
}

function showAchievementNotification(a) {
    const el = document.createElement('div');
    el.style.cssText = `
        position:fixed; top:20px; right:20px; z-index:10000;
        background:linear-gradient(135deg,#ffd700,#ffed4e); color:#333;
        padding:14px 18px; border-radius:12px;
        box-shadow:0 8px 24px rgba(255,215,0,.4);
        font-family:'Poppins',sans-serif; font-size:14px; max-width:300px;
        animation:slideInRight .35s ease-out;
    `;
    el.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px">
            <i class="${a.icon}" style="font-size:1.6rem"></i>
            <div>
                <div style="font-weight:700">🏆 Conquista Desbloqueada!</div>
                <div>${a.name} — <span style="font-size:.85em;opacity:.8">${a.desc}</span></div>
            </div>
        </div>`;
    document.body.appendChild(el);
    setTimeout(() => {
        el.style.animation = 'slideOutRight .3s ease-out';
        setTimeout(() => el.remove(), 300);
    }, 4000);
}

function updateAchievementsDisplay() {
    const list = $('achievementList');
    if (!list) return;
    list.innerHTML = '';
    ACHIEVEMENTS.forEach(a => {
        const unlocked = neuroGameState.progress.achievements.includes(a.id);
        const div = document.createElement('div');
        div.className = `achievement ${unlocked ? 'unlocked' : 'locked'}`;
        div.innerHTML = `<i class="${a.icon}"></i> <span><strong>${a.name}</strong> — ${a.desc}</span>
            ${unlocked ? '<span style="margin-left:auto;font-size:.75rem">✅</span>' : ''}`;
        list.appendChild(div);
    });
}

// ═══════════════════════════════════════════════════════════════
// ROTEADOR DE JOGOS
// ═══════════════════════════════════════════════════════════════

function openGame(gameName) {
    const map = {
        organize:    () => { openModal('organizeGameModal');   games.organize.start();    },
        trueFalse:   () => { openModal('trueFalseGameModal');  games.trueFalse.start();   },
        memoryPairs: () => { openModal('memoryPairsGameModal'); games.memory.start();     },
        wordSearch:  () => { openModal('wordSearchModal');     games.wordSearch.start();  },
        sequence:    () => { openModal('sequenceGameModal');   games.sequence.start();    },
        colorGame:   () => { openModal('colorGameModal');      games.color.start();       },
    };
    (map[gameName] || (() => console.warn('Jogo desconhecido:', gameName)))();
}

// ═══════════════════════════════════════════════════════════════
// ENGINE DE JOGOS
// ═══════════════════════════════════════════════════════════════

const games = {};

/* ─────────────────────────────────────────────────────────────
   1. JOGO: PARES DE MEMÓRIA
   Melhorias: emojis como conteúdo, pontuação baseada em tentativas,
   dificuldade progressiva (4→6→8 pares), timer, recorde.
   ───────────────────────────────────────────────────────────── */
games.memory = (() => {
    const EMOJI_POOL = ['🧠','⚡','🎯','🌟','🔥','💡','🎮','📚','🎨','🏆','🚀','🌈'];
    let state = {};

    function difficultyPairs() {
        const played = neuroGameState.progress.scores.memoryPairs || 0;
        if (played >= 60) return 6;   // difícil
        if (played >= 20) return 5;   // médio
        return 4;                     // fácil
    }

    function getDiffLabel() {
        const p = difficultyPairs();
        if (p === 4) return '<span class="difficulty-badge diff-easy">Fácil (4 pares)</span>';
        if (p === 5) return '<span class="difficulty-badge diff-medium">Médio (5 pares)</span>';
        return '<span class="difficulty-badge diff-hard">Difícil (6 pares)</span>';
    }

    function start() {
        const pairs = difficultyPairs();
        const emojis = shuffle(EMOJI_POOL).slice(0, pairs);
        const tiles  = shuffle([...emojis, ...emojis]);

        state = {
            tiles, pairs,
            revealed: [], matched: [],
            attempts: 0, score: 0,
            startTime: Date.now(), timerInterval: null, locked: false
        };

        const board = $('memoryPairsBoard');
        board.style.gridTemplateColumns = pairs === 6 ? 'repeat(4,70px)' : 'repeat(4,70px)';
        board.innerHTML = '';

        tiles.forEach((emoji, i) => {
            const tile = document.createElement('div');
            tile.className = 'memory-tile';
            tile.dataset.index = i;
            tile.dataset.emoji = emoji;
            tile.addEventListener('click', () => flip(i, tile));
            board.appendChild(tile);
        });

        $('memoryPairsFeedback').innerHTML = renderMemoryHeader();
        startTimer();
    }

    function renderMemoryHeader() {
        return `
            <div class="game-header-bar">
                ${getDiffLabel()}
                <span class="score-badge">🎯 Pontos <span class="score-num" id="memScore">0</span></span>
                <span class="score-badge">🏆 Recorde <span class="score-num">${getBestScore('memoryPairs')}</span></span>
                <span class="score-badge">⏱ <span id="memTimer">00:00</span></span>
            </div>`;
    }

    function startTimer() {
        clearInterval(state.timerInterval);
        state.timerInterval = setInterval(() => {
            const el = $('memTimer');
            if (el) el.textContent = formatTime(Math.floor((Date.now() - state.startTime) / 1000));
        }, 500);
    }

    function flip(index, tile) {
        if (state.locked || state.revealed.includes(index) || state.matched.includes(index)) return;

        tile.classList.add('revealed');
        tile.textContent = state.tiles[index];
        state.revealed.push(index);

        if (state.revealed.length === 2) {
            state.attempts++;
            state.locked = true;
            const [a, b] = state.revealed;
            const allTiles = document.querySelectorAll('.memory-tile');

            if (state.tiles[a] === state.tiles[b]) {
                // Acerto
                setTimeout(() => {
                    allTiles[a].classList.replace('revealed', 'matched');
                    allTiles[b].classList.replace('revealed', 'matched');
                    state.matched.push(a, b);
                    state.revealed = [];
                    state.locked = false;

                    // Pontuação: mais pontos por menos tentativas
                    const bonus = Math.max(10, 30 - state.attempts);
                    state.score += bonus;
                    const el = $('memScore');
                    if (el) { el.textContent = state.score; el.style.animation = 'pulse .3s'; }

                    if (state.matched.length === state.tiles.length) gameOver();
                }, 300);
            } else {
                // Erro
                allTiles[a].classList.add('wrong');
                allTiles[b].classList.add('wrong');
                setTimeout(() => {
                    allTiles[a].classList.remove('revealed', 'wrong');
                    allTiles[b].classList.remove('revealed', 'wrong');
                    allTiles[a].textContent = '';
                    allTiles[b].textContent = '';
                    state.revealed = [];
                    state.locked = false;
                }, 900);
            }
        }
    }

    function gameOver() {
        clearInterval(state.timerInterval);
        const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
        const timeBonus = Math.max(0, 60 - elapsed) * 2;
        state.score += timeBonus;

        neuroGameState.progress.gamesPlayed++;
        const isRecord = recordScore('memoryPairs', state.score);
        saveProgress();
        checkAchievements();

        $('memoryPairsFeedback').innerHTML += `
            <div style="margin-top:14px;padding:14px;background:var(--bg-secondary);border-radius:12px;text-align:center">
                <div style="font-size:1.3rem;font-weight:700;color:var(--text-primary)">
                    ${isRecord ? '🏆 Novo Recorde!' : '🎉 Parabéns!'}
                </div>
                <div style="color:var(--text-tertiary);margin:.4rem 0">
                    ${state.pairs} pares em ${state.attempts} tentativas — ${formatTime(elapsed)}
                </div>
                <div style="font-size:1.1rem;color:var(--text-accent);font-weight:700">
                    Pontuação final: ${state.score} pts ${timeBonus > 0 ? `(+${timeBonus} bônus de tempo)` : ''}
                </div>
                <button class="tool-btn" style="margin-top:12px" onclick="games.memory.start()">
                    <i class="fas fa-redo"></i> Jogar Novamente
                </button>
            </div>`;
    }

    return { start };
})();

/* ─────────────────────────────────────────────────────────────
   2. JOGO: SEQUÊNCIAS NUMÉRICAS
   Melhorias: 3 tipos de sequência (aritmética, geométrica, quadrados),
   dificuldade infinita crescente, tempo por pergunta, pontuação.
   ───────────────────────────────────────────────────────────── */
games.sequence = (() => {
    let state = {};

    function generateSequence(level) {
        const type = level % 3;  // cicla pelos tipos

        if (type === 0) {
            // Aritmética
            const step = (Math.floor(level / 3) + 1) * (level % 2 === 0 ? 2 : 3);
            const start = Math.floor(Math.random() * 5) + 1;
            const seq = [start, start + step, start + step * 2, start + step * 3];
            return { seq: seq.slice(0, 3), answer: seq[3], hint: `Soma +${step} a cada passo` };
        }
        if (type === 1) {
            // Geométrica
            const ratio = Math.floor(level / 3) + 2;
            const start = Math.floor(Math.random() * 3) + 1;
            const seq = [start, start * ratio, start * ratio ** 2, start * ratio ** 3];
            return { seq: seq.slice(0, 3), answer: seq[3], hint: `Multiplica por ${ratio} a cada passo` };
        }
        // Quadrados/cubos
        const base = level + 2;
        return {
            seq: [1 ** base, 2 ** base, 3 ** base],
            answer: 4 ** base,
            hint: `Potências de ${base}`
        };
    }

    function generateOptions(answer) {
        const opts = new Set([answer]);
        while (opts.size < 4) {
            const delta = Math.floor(Math.random() * Math.max(3, Math.ceil(answer * 0.3))) + 1;
            const candidate = answer + (Math.random() > .5 ? delta : -delta);
            if (candidate > 0 && candidate !== answer) opts.add(candidate);
        }
        return shuffle([...opts]);
    }

    function start() {
        state = { level: 0, score: 0, streak: 0, timeLeft: 15, timerInterval: null };
        render();
    }

    function render() {
        const gen    = generateSequence(state.level);
        state.current = gen;
        state.timeLeft = Math.max(8, 15 - Math.floor(state.level / 2));

        const seqStr  = gen.seq.join(', ') + ', ?';
        const opts    = generateOptions(gen.answer);
        const lvlEl   = $('sequenceLevel');
        const qEl     = $('sequenceQuestion');
        const optsEl  = $('sequenceOptions');
        const fbEl    = $('sequenceFeedback');

        if (lvlEl) lvlEl.innerHTML = `
            <div class="game-header-bar">
                <span>Nível <strong>${state.level + 1}</strong></span>
                <span class="score-badge">🎯 <span class="score-num" id="seqScore">${state.score}</span></span>
                <span class="score-badge">🔥 Sequência <span class="score-num">${state.streak}</span></span>
                <span class="score-badge">⏱ <span id="seqTimer" style="color:${state.timeLeft <= 5 ? '#ef4444' : 'inherit'}">${state.timeLeft}s</span></span>
            </div>`;
        if (qEl)   qEl.textContent = seqStr;
        if (fbEl)  { fbEl.textContent = ''; fbEl.className = 'sequence-feedback'; }
        if (optsEl) {
            optsEl.innerHTML = '';
            opts.forEach(o => {
                const btn = document.createElement('button');
                btn.className = 'sequence-option-btn';
                btn.textContent = o;
                btn.onclick = () => select(o, btn);
                optsEl.appendChild(btn);
            });
        }

        clearInterval(state.timerInterval);
        state.timerInterval = setInterval(() => {
            state.timeLeft--;
            const el = $('seqTimer');
            if (el) {
                el.textContent = state.timeLeft + 's';
                el.style.color = state.timeLeft <= 5 ? '#ef4444' : 'inherit';
            }
            if (state.timeLeft <= 0) timeout();
        }, 1000);
    }

    function select(val, btn) {
        clearInterval(state.timerInterval);
        document.querySelectorAll('.sequence-option-btn').forEach(b => b.disabled = true);

        const correct = val === state.current.answer;
        btn.classList.add(correct ? 'correct-ans' : 'wrong-ans');

        if (!correct) {
            // Mostra a correta
            document.querySelectorAll('.sequence-option-btn').forEach(b => {
                if (+b.textContent === state.current.answer) b.classList.add('correct-ans');
            });
        }

        const fbEl = $('sequenceFeedback');
        if (correct) {
            state.streak++;
            const bonus = state.timeLeft * 2;
            const streakBonus = state.streak >= 3 ? Math.floor(state.streak * 5) : 0;
            state.score += 20 + bonus + streakBonus;
            state.level++;

            const msg = state.streak >= 3
                ? `🔥 Sequência de ${state.streak}! +${20 + bonus + streakBonus} pts`
                : `✅ Correto! +${20 + bonus} pts`;
            if (fbEl) { fbEl.textContent = msg; fbEl.className = 'sequence-feedback correct'; }
        } else {
            state.streak = 0;
            if (fbEl) {
                fbEl.textContent = `❌ Era ${state.current.answer}. Dica: ${state.current.hint}`;
                fbEl.className = 'sequence-feedback wrong';
            }
        }

        neuroGameState.progress.gamesPlayed++;
        recordScore('sequence', state.level);
        saveProgress();
        checkAchievements();

        setTimeout(render, correct ? 1200 : 2200);
    }

    function timeout() {
        clearInterval(state.timerInterval);
        state.streak = 0;
        const fbEl = $('sequenceFeedback');
        if (fbEl) {
            fbEl.textContent = `⏰ Tempo esgotado! A resposta era ${state.current.answer}. Dica: ${state.current.hint}`;
            fbEl.className = 'sequence-feedback wrong';
        }
        document.querySelectorAll('.sequence-option-btn').forEach(b => {
            b.disabled = true;
            if (+b.textContent === state.current.answer) b.classList.add('correct-ans');
        });
        setTimeout(render, 2500);
    }

    return { start };
})();

/* ─────────────────────────────────────────────────────────────
   3. JOGO: CAÇA-PALAVRAS
   Melhorias: palavras em diferentes direções (horizontal + vertical),
   células destacadas permanentes por palavra encontrada, timer,
   lista de palavras restantes, pontuação cumulativa por sessão.
   ───────────────────────────────────────────────────────────── */
games.wordSearch = (() => {
    const WORD_POOL = [
        'FOCO','ATENÇÃO','MEMÓRIA','ROTINA','ESTUDO','TEMPO',
        'LEITURA','TAREFA','PLANO','META','RITMO','TREINO'
    ];
    const GRID_SIZE = 8;
    let state = {};

    function start() {
        state = {
            score: 0, found: 0,
            selected: [], wordIndices: new Set()
        };
        pickNewWord();
    }

    function renderHeader() {
        const el = $('wordSearchFeedback');
        if (el) el.innerHTML = `
            <div class="game-header-bar">
                <span class="score-badge">✅ Encontradas: <span class="score-num">${state.found}</span></span>
                <span class="score-badge">🎯 Pontos: <span class="score-num">${state.score}</span></span>
                <span class="score-badge">🏆 Recorde: <span class="score-num">${getBestScore('wordSearch')}</span></span>
            </div>
            <div style="font-size:1rem;font-weight:700;color:var(--text-primary);margin-top:6px">
                Encontre: <span style="color:var(--text-accent)">${state.currentWord}</span>
            </div>`;
    }

    function pickNewWord() {
        const remaining = WORD_POOL.filter(w => !state.usedWords?.includes(w));
        if (!remaining.length) { endSession(); return; }
        if (!state.usedWords) state.usedWords = [];

        state.currentWord = remaining[Math.floor(Math.random() * remaining.length)];
        state.usedWords.push(state.currentWord);
        state.selected = [];
        buildGrid();
        renderHeader();
    }

    function buildGrid() {
        const SIZE   = GRID_SIZE;
        const ALPHA  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const word   = state.currentWord.replace('Ã','A').replace('Ó','O').replace('É','E').replace('Á','A'); // simplify accents for grid
        const grid   = Array.from({ length: SIZE }, () => Array(SIZE).fill(''));

        // Tentar inserir horizontal ou vertical
        const dirs = shuffle([
            { dr: 0, dc: 1 },   // horizontal →
            { dr: 1, dc: 0 },   // vertical ↓
        ]);

        let placed = false;
        for (const d of dirs) {
            if (placed) break;
            const maxR = SIZE - d.dr * word.length;
            const maxC = SIZE - d.dc * word.length;
            if (maxR <= 0 || maxC <= 0) continue;

            const rows = shuffle([...Array(maxR).keys()]);
            for (const r of rows) {
                const cols = shuffle([...Array(maxC).keys()]);
                for (const c of cols) {
                    let fits = true;
                    for (let i = 0; i < word.length; i++) {
                        const nr = r + d.dr * i, nc = c + d.dc * i;
                        if (grid[nr][nc] && grid[nr][nc] !== word[i]) { fits = false; break; }
                    }
                    if (fits) {
                        state.wordIndices = new Set();
                        for (let i = 0; i < word.length; i++) {
                            const nr = r + d.dr * i, nc = c + d.dc * i;
                            grid[nr][nc] = word[i];
                            state.wordIndices.add(nr * SIZE + nc);
                        }
                        placed = true; break;
                    }
                }
                if (placed) break;
            }
        }

        // Preencher vazios
        for (let r = 0; r < SIZE; r++)
            for (let c = 0; c < SIZE; c++)
                if (!grid[r][c]) grid[r][c] = ALPHA[Math.floor(Math.random() * ALPHA.length)];

        state.grid = grid;
        renderGrid();
    }

    function renderGrid() {
        const container = $('wordGrid');
        if (!container) return;
        container.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 44px)`;
        container.innerHTML = '';

        state.grid.forEach((row, r) => {
            row.forEach((letter, c) => {
                const cell = document.createElement('div');
                cell.className = 'word-cell';
                cell.style.width = cell.style.height = '44px';
                cell.style.lineHeight = '44px';
                cell.textContent = letter;
                cell.dataset.index = r * GRID_SIZE + c;
                cell.addEventListener('click', () => selectCell(+cell.dataset.index, cell));
                container.appendChild(cell);
            });
        });
    }

    function selectCell(idx, cell) {
        if (cell.classList.contains('matched-cell')) return;
        if (state.selected.includes(idx)) {
            state.selected = state.selected.filter(i => i !== idx);
            cell.classList.remove('selected');
        } else {
            state.selected.push(idx);
            cell.classList.add('selected');
        }

        // Verificar se o conjunto selecionado é igual aos índices da palavra
        const selSet = new Set(state.selected);
        if (selSet.size === state.wordIndices.size &&
            [...state.wordIndices].every(i => selSet.has(i))) {

            // Acertou!
            document.querySelectorAll('.word-cell').forEach(c => {
                if (state.wordIndices.has(+c.dataset.index)) {
                    c.classList.remove('selected');
                    c.classList.add('matched-cell');
                }
            });

            state.found++;
            state.score += state.currentWord.length * 10;
            recordScore('wordSearch', state.found);
            neuroGameState.progress.gamesPlayed++;
            saveProgress();
            checkAchievements();

            setTimeout(pickNewWord, 1000);
        }
    }

    function endSession() {
        const el = $('wordSearchFeedback');
        if (el) el.innerHTML += `
            <div style="margin-top:12px;padding:12px;background:var(--bg-secondary);border-radius:12px;text-align:center">
                <div style="font-size:1.2rem;font-weight:700">🎉 Você encontrou todas as palavras!</div>
                <div>Pontuação: <strong>${state.score}</strong></div>
                <button class="tool-btn" style="margin-top:10px" onclick="games.wordSearch.start()">
                    <i class="fas fa-redo"></i> Jogar Novamente
                </button>
            </div>`;
    }

    return { start };
})();

/* ─────────────────────────────────────────────────────────────
   4. JOGO: VERDADEIRO OU FALSO
   Melhorias: banco de perguntas maior, categorizado,
   streak multiplier, explicação expandida, barra de progresso.
   ───────────────────────────────────────────────────────────── */
games.trueFalse = (() => {
    const QUESTIONS = [
        { q: 'Fazer pausas curtas pode aumentar a produtividade.',                    a: true,  exp: 'Técnicas como Pomodoro comprovam isso.' },
        { q: 'Estudar com a TV ligada sempre melhora a concentração.',                a: false, exp: 'Distrações reduzem a retenção de informação.' },
        { q: 'Dormir pouco por uma semana não afeta a memória.',                      a: false, exp: 'A privação de sono prejudica memória e foco.' },
        { q: 'Organizar tarefas visualmente ajuda a reduzir o estresse.',             a: true,  exp: 'Visualizar o progresso reduz ansiedade.' },
        { q: 'O exercício físico regular melhora a função cognitiva.',                a: true,  exp: 'Exercícios aumentam BDNF, proteína que apoia o cérebro.' },
        { q: 'Beber água suficiente não influencia o desempenho mental.',             a: false, exp: 'Desidratação leve já prejudica concentração.' },
        { q: 'A técnica Pomodoro usa blocos de 25 minutos de foco.',                  a: true,  exp: 'Essa é a duração padrão do método Pomodoro.' },
        { q: 'Multitarefa (fazer várias coisas ao mesmo tempo) é sempre mais eficiente.', a: false, exp: 'Multitarefa reduz qualidade e aumenta erros.' },
        { q: 'A meditação pode ajudar a melhorar a atenção.',                         a: true,  exp: 'Estudos mostram melhora na atenção sustentada.' },
        { q: 'Pessoas com TDAH não podem desenvolver organização.',                   a: false, exp: 'Com as ferramentas certas, é plenamente possível.' },
        { q: 'Listas de tarefas ajudam a externalizar a memória de trabalho.',        a: true,  exp: 'Escrever libera espaço mental para outras coisas.' },
        { q: 'A luz azul de telas não afeta a qualidade do sono.',                    a: false, exp: 'A luz azul inibe a melatonina e atrapalha o sono.' },
    ];

    let state = {};

    function start() {
        state = { questions: shuffle(QUESTIONS), idx: 0, score: 0, streak: 0 };
        renderQuestion();
    }

    function renderQuestion() {
        const q   = state.questions[state.idx];
        const tot = state.questions.length;
        const prog = Math.round((state.idx / tot) * 100);

        const qEl  = $('trueFalseQuestion');
        const sEl  = $('trueFalseScore');
        const fbEl = $('trueFalseFeedback');

        if (qEl) qEl.innerHTML = `
            <div style="margin-bottom:10px">
                <div style="height:6px;background:var(--border-color);border-radius:3px;overflow:hidden">
                    <div style="height:100%;width:${prog}%;background:linear-gradient(90deg,var(--bg-gradient-start),var(--bg-gradient-end));transition:width .4s"></div>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:.8rem;color:var(--text-tertiary);margin-top:4px">
                    <span>Pergunta ${state.idx + 1} de ${tot}</span>
                    <span>🔥 Sequência: ${state.streak}</span>
                </div>
            </div>
            <div style="font-size:1.1rem;font-weight:600;color:var(--text-primary);min-height:60px;line-height:1.5">${q.q}</div>`;

        if (sEl) sEl.innerHTML = `<span class="score-badge">🎯 <span class="score-num">${state.score}</span></span>`;
        if (fbEl) { fbEl.textContent = ''; fbEl.className = ''; }

        // Habilitar botões
        document.querySelectorAll('.tf-btn').forEach(b => { b.disabled = false; b.className = 'tf-btn'; });
    }

    // Exposta globalmente para o HTML
    window.answerTrueFalse = function(val) {
        const q       = state.questions[state.idx];
        const correct = (val === 'true') === q.a;
        const fbEl    = $('trueFalseFeedback');
        document.querySelectorAll('.tf-btn').forEach(b => b.disabled = true);

        if (correct) {
            state.streak++;
            const mult  = state.streak >= 3 ? 2 : 1;
            state.score += 10 * mult;
            if (fbEl) {
                fbEl.textContent = `✅ Correto! ${q.exp}${mult > 1 ? ' 🔥 ×2!' : ''}`;
                fbEl.className = 'sequence-feedback correct';
            }
        } else {
            state.streak = 0;
            if (fbEl) {
                fbEl.textContent = `❌ Incorreto. ${q.exp}`;
                fbEl.className = 'sequence-feedback wrong';
            }
        }

        state.idx++;

        if (state.idx >= state.questions.length) {
            setTimeout(() => endTrueFalse(), 1800);
        } else {
            setTimeout(renderQuestion, 2000);
        }
    };

    function endTrueFalse() {
        const isRecord = recordScore('trueFalse', state.score);
        neuroGameState.progress.gamesPlayed++;
        saveProgress();
        checkAchievements();

        const qEl = $('trueFalseQuestion');
        if (qEl) qEl.innerHTML = `
            <div style="text-align:center;padding:20px">
                <div style="font-size:2rem">🏁</div>
                <div style="font-size:1.4rem;font-weight:700;color:var(--text-primary)">${isRecord ? '🏆 Novo Recorde!' : 'Fim de Jogo!'}</div>
                <div style="color:var(--text-tertiary);margin:.5rem 0">
                    ${state.questions.length} perguntas respondidas
                </div>
                <div style="font-size:1.2rem;color:var(--text-accent);font-weight:700">Pontuação: ${state.score} pts</div>
                <button class="tool-btn" style="margin-top:14px" onclick="games.trueFalse.start()">
                    <i class="fas fa-redo"></i> Jogar Novamente
                </button>
            </div>`;
    }

    return { start };
})();

/* ─────────────────────────────────────────────────────────────
   5. JOGO: ORGANIZAR A ROTINA (Drag & Drop)
   Melhorias: validação de prioridades sugeridas, dicas de
   correto/errado, pontuação, reiniciar sem recarregar modal.
   ───────────────────────────────────────────────────────────── */
games.organize = (() => {
    const TASKS = [
        { label: '🏃 Fazer exercícios',   correct: 'High'   },
        { label: '📚 Estudar',            correct: 'High'   },
        { label: '🍽️ Preparar refeições', correct: 'Medium' },
        { label: '📧 Responder e-mails',  correct: 'Medium' },
        { label: '📺 Assistir TV',        correct: 'Low'    },
        { label: '🎮 Jogar videogame',    correct: 'Low'    },
    ];

    let timerInterval, elapsed, draggedTask;

    function start() {
        elapsed = 0;
        const taskList = $('taskListToDrag');
        taskList.innerHTML = '';

        shuffle(TASKS).forEach((t, i) => {
            const btn = document.createElement('button');
            btn.textContent = t.label;
            btn.dataset.correct = t.correct;
            btn.draggable = true;
            btn.id = 'orgTask-' + i;
            btn.style.cssText = `
                display:block; width:100%; margin-bottom:8px; padding:10px 14px;
                background:var(--bg-secondary); border:1.5px solid var(--border-color);
                border-radius:8px; cursor:grab; text-align:left;
                font-size:.95rem; color:var(--text-primary); transition:.2s;
            `;
            btn.addEventListener('dragstart', e => {
                draggedTask = btn;
                e.dataTransfer.setData('text/plain', btn.id);
            });
            taskList.appendChild(btn);
        });

        ['priorityHigh','priorityMedium','priorityLow'].forEach(id => {
            const el = $(id);
            if (el) el.innerHTML = '';
        });

        $('organizeGameResult').innerHTML = '';

        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            elapsed++;
            const el = $('organizeTimer');
            if (el) el.textContent = formatTime(elapsed);
        }, 1000);
    }

    // Exposto globalmente para o HTML
    window.allowDrop = e => e.preventDefault();

    window.drop = function(e, priority) {
        e.preventDefault();
        if (!draggedTask) return;
        const zone = $('priority' + priority);
        if (!zone) return;

        const li = document.createElement('li');
        li.textContent = draggedTask.textContent;
        li.dataset.correct = draggedTask.dataset.correct;
        li.style.cssText = `
            margin-bottom:6px; background:var(--bg-primary); padding:6px 10px;
            border-radius:6px; box-shadow:0 2px 5px var(--shadow-color);
            color:var(--text-primary); font-size:.9rem;
        `;
        zone.appendChild(li);
        draggedTask.remove();
        draggedTask = null;
    };

    window.finishOrganizeGame = function() {
        const all = document.querySelectorAll('#priorityHigh li, #priorityMedium li, #priorityLow li');
        if (all.length < TASKS.length) {
            $('organizeGameResult').innerHTML =
                `<div style="color:var(--text-tertiary)">📌 Organize todas as ${TASKS.length} tarefas antes de finalizar.</div>`;
            return;
        }

        clearInterval(timerInterval);

        let correct = 0;
        const zones = { High: $('priorityHigh'), Medium: $('priorityMedium'), Low: $('priorityLow') };

        Object.entries(zones).forEach(([priority, zone]) => {
            zone.querySelectorAll('li').forEach(li => {
                if (li.dataset.correct === priority) {
                    correct++;
                    li.style.borderLeft = '4px solid #22c55e';
                } else {
                    li.style.borderLeft = '4px solid #ef4444';
                    li.title = `Sugerido: ${li.dataset.correct}`;
                }
            });
        });

        const score    = correct * 15 + Math.max(0, 60 - elapsed) * 2;
        const isRecord = recordScore('organize', score);
        neuroGameState.progress.gamesPlayed++;
        saveProgress();
        checkAchievements();

        $('organizeGameResult').innerHTML = `
            <div style="margin-top:14px;padding:14px;background:var(--bg-secondary);border-radius:12px;text-align:center">
                <div style="font-size:1.2rem;font-weight:700;color:var(--text-primary)">
                    ${isRecord ? '🏆 Novo Recorde!' : '✅ Resultado'}
                </div>
                <div style="margin:.4rem 0;color:var(--text-tertiary)">
                    ${correct} de ${TASKS.length} corretas — ${formatTime(elapsed)}
                </div>
                <div style="font-size:1rem;color:var(--text-accent);font-weight:700">Pontuação: ${score} pts</div>
                <div style="font-size:.85rem;margin-top:6px;color:var(--text-tertiary)">
                    (Bordas verdes = correto, vermelhas = diferente do sugerido)
                </div>
                <button class="tool-btn" style="margin-top:12px" onclick="games.organize.start()">
                    <i class="fas fa-redo"></i> Jogar Novamente
                </button>
            </div>`;
    };

    return { start };
})();

/* ─────────────────────────────────────────────────────────────
   6. JOGO: CORES (Atenção)
   Melhorias: velocidade crescente, penalidade por erro,
   contador de vidas, high score.
   ───────────────────────────────────────────────────────────── */
games.color = (() => {
    const COLORS = ['red','blue','green','yellow'];
    const LABELS = { red:'Vermelho', blue:'Azul', green:'Verde', yellow:'Amarelo' };
    const HEX    = { red:'#ef4444', blue:'#3b82f6', green:'#22c55e', yellow:'#f59e0b' };

    let state = {};

    function start() {
        state = { score: 0, lives: 3, speed: 2000, active: true };
        renderUI();
        nextRound();
    }

    function renderUI() {
        const container = $('colorGameModal')?.querySelector('.modal-body');
        if (!container) return;
        container.innerHTML = `
            <div class="game-header-bar">
                <span class="score-badge">🎯 <span class="score-num" id="colorScore">0</span></span>
                <span class="score-badge">❤️ Vidas: <span class="score-num" id="colorLives">3</span></span>
                <span class="score-badge">🏆 Recorde: <span class="score-num">${getBestScore('color')}</span></span>
            </div>
            <div id="colorTarget" style="font-size:1.4rem;font-weight:700;text-align:center;margin:18px 0;color:var(--text-primary)"></div>
            <div id="colorBtns" style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center"></div>
            <div id="colorFeedback" style="min-height:26px;text-align:center;font-weight:600;margin-top:12px"></div>
        `;
    }

    function nextRound() {
        if (!state.active) return;
        const target = COLORS[Math.floor(Math.random() * COLORS.length)];
        state.target = target;

        const tEl = $('colorTarget');
        if (tEl) tEl.innerHTML = `Clique em: <span style="color:${HEX[target]};font-size:1.6rem">${LABELS[target].toUpperCase()}</span>`;

        const bEl = $('colorBtns');
        if (!bEl) return;
        bEl.innerHTML = '';
        shuffle(COLORS).forEach(c => {
            const btn = document.createElement('button');
            btn.style.cssText = `
                width:80px;height:80px;background:${HEX[c]};border:none;border-radius:14px;
                cursor:pointer;font-size:1.5rem;transition:.15s;
            `;
            btn.title = LABELS[c];
            btn.onclick = () => pick(c);
            bEl.appendChild(btn);
        });
    }

    function pick(color) {
        const fbEl = $('colorFeedback');
        if (color === state.target) {
            state.score++;
            state.speed = Math.max(600, state.speed - 80);
            const isRecord = recordScore('color', state.score);
            const sEl = $('colorScore');
            if (sEl) { sEl.textContent = state.score; sEl.style.animation = 'pulse .3s'; }
            if (fbEl) { fbEl.textContent = `✅ +1 ${isRecord ? '— Novo recorde! 🏆' : ''}`; fbEl.style.color = '#22c55e'; }
        } else {
            state.lives--;
            const lEl = $('colorLives');
            if (lEl) lEl.textContent = state.lives;
            if (fbEl) { fbEl.textContent = `❌ Era ${LABELS[state.target]}!`; fbEl.style.color = '#ef4444'; }
            if (state.lives <= 0) { gameOver(); return; }
        }
        neuroGameState.progress.gamesPlayed++;
        saveProgress();
        checkAchievements();
        setTimeout(nextRound, 600);
    }

    function gameOver() {
        state.active = false;
        const bEl = $('colorBtns');
        const tEl = $('colorTarget');
        if (bEl) bEl.innerHTML = '';
        if (tEl) tEl.innerHTML = `
            <div style="text-align:center">
                <div style="font-size:1.4rem;font-weight:700">💀 Game Over!</div>
                <div style="color:var(--text-tertiary);margin:.4rem 0">Pontuação: <strong>${state.score}</strong></div>
                <button class="tool-btn" style="margin-top:12px" onclick="games.color.start()">
                    <i class="fas fa-redo"></i> Jogar Novamente
                </button>
            </div>`;
    }

    return { start };
})();

// ═══════════════════════════════════════════════════════════════
// POMODORO — COM MODO FOCO / PAUSA / PAUSA LONGA
// ═══════════════════════════════════════════════════════════════

const POMODORO_MODES = {
    focus:      { label: 'Foco',        minutes: 25 },
    break:      { label: 'Pausa',       minutes: 5  },
    longBreak:  { label: 'Pausa Longa', minutes: 15 },
};

function startPomodoro() {
    if (neuroGameState.pomodoroTimer.isRunning) return;
    neuroGameState.pomodoroTimer.isRunning = true;
    neuroGameState.pomodoroTimer.interval  = setInterval(updatePomodoroTimer, 1000);
    updatePomodoroDisplay();
}

function pausePomodoro() {
    neuroGameState.pomodoroTimer.isRunning = false;
    clearInterval(neuroGameState.pomodoroTimer.interval);
    updatePomodoroDisplay();
}

function resetPomodoro() {
    clearInterval(neuroGameState.pomodoroTimer.interval);
    const mode = POMODORO_MODES[neuroGameState.pomodoroTimer.mode] || POMODORO_MODES.focus;
    Object.assign(neuroGameState.pomodoroTimer, { isRunning: false, minutes: mode.minutes, seconds: 0 });
    updatePomodoroDisplay();
}

function setPomodoroMode(mode) {
    clearInterval(neuroGameState.pomodoroTimer.interval);
    neuroGameState.pomodoroTimer.mode = mode;
    neuroGameState.pomodoroTimer.minutes = POMODORO_MODES[mode].minutes;
    neuroGameState.pomodoroTimer.seconds = 0;
    neuroGameState.pomodoroTimer.isRunning = false;
    updatePomodoroDisplay();
}

function updatePomodoroTimer() {
    const t = neuroGameState.pomodoroTimer;
    if (t.seconds > 0) {
        t.seconds--;
    } else if (t.minutes > 0) {
        t.minutes--;
        t.seconds = 59;
    } else {
        clearInterval(t.interval);
        t.isRunning = false;

        if (t.mode === 'focus') {
            neuroGameState.progress.pomodorosCompleted++;
            saveProgress();
            checkAchievements();
        }

        const nextMode = t.mode === 'focus' ? 'break' : 'focus';
        const label    = POMODORO_MODES[nextMode].label;
        if (Notification.permission === 'granted') {
            new Notification('NeuroGame ⏰', { body: `Tempo! Próximo: ${label}` });
        } else {
            alert(`⏰ Tempo! Próximo modo: ${label}`);
        }
        setPomodoroMode(nextMode);
        return;
    }
    updatePomodoroDisplay();
}

function updatePomodoroDisplay() {
    const t   = neuroGameState.pomodoroTimer;
    const el  = document.querySelector('.timer-display');
    if (el) el.textContent =
        `${String(t.minutes).padStart(2,'0')}:${String(t.seconds).padStart(2,'0')}`;
}

// ═══════════════════════════════════════════════════════════════
// KANBAN — (inalterado, apenas consolidado)
// ═══════════════════════════════════════════════════════════════

function openKanban() { openModal('kanbanModal'); renderKanbanBoard(); }

function addKanbanTask(column) {
    const input = $('newTaskInput');
    const text  = input?.value.trim();
    if (!text) return;

    const task = { id: Date.now(), text, createdAt: new Date() };
    neuroGameState.kanbanTasks[column].push(task);
    const key = 'neuroKanban' + column.charAt(0).toUpperCase() + column.slice(1);
    localStorage.setItem(key, JSON.stringify(neuroGameState.kanbanTasks[column]));
    input.value = '';
    renderKanbanBoard();
    updateNeuroBotBadge();
}

function renderKanbanBoard() {
    ['todo','doing','done'].forEach(col => {
        const container = $(col + 'Tasks');
        if (!container) return;

        if (col === 'todo') {
            container.querySelectorAll('.kanban-task').forEach(el => el.remove());
        } else {
            container.innerHTML = '';
        }

        neuroGameState.kanbanTasks[col].forEach(task => {
            const div = document.createElement('div');
            div.className = 'kanban-task';
            div.draggable  = true;
            div.dataset.taskId = task.id;
            div.dataset.column = col;
            div.innerHTML = `
                <div style="flex:1">${task.text}</div>
                <button onclick="deleteKanbanTask('${col}',${task.id})"
                    style="background:#ef4444;color:#fff;border:none;border-radius:50%;
                           width:20px;height:20px;font-size:12px;cursor:pointer;flex-shrink:0">×</button>`;
            div.style.display = 'flex';
            div.style.alignItems = 'center';
            div.style.gap = '8px';
            div.addEventListener('dragstart', handleDragStart);
            div.addEventListener('dragover',  handleDragOver);
            div.addEventListener('drop',      handleDrop);
            container.appendChild(div);
        });
    });
}

function deleteKanbanTask(column, taskId) {
    neuroGameState.kanbanTasks[column] = neuroGameState.kanbanTasks[column].filter(t => t.id !== taskId);
    const key = 'neuroKanban' + column.charAt(0).toUpperCase() + column.slice(1);
    localStorage.setItem(key, JSON.stringify(neuroGameState.kanbanTasks[column]));
    renderKanbanBoard();
    updateNeuroBotBadge();
}

function moveKanbanTask(taskId, fromCol, toCol) {
    const idx  = neuroGameState.kanbanTasks[fromCol].findIndex(t => t.id == taskId);
    if (idx === -1) return;
    const task = neuroGameState.kanbanTasks[fromCol].splice(idx, 1)[0];
    neuroGameState.kanbanTasks[toCol].push(task);

    ['from','to'].forEach((dir, i) => {
        const col = i === 0 ? fromCol : toCol;
        const key = 'neuroKanban' + col.charAt(0).toUpperCase() + col.slice(1);
        localStorage.setItem(key, JSON.stringify(neuroGameState.kanbanTasks[col]));
    });

    if (toCol === 'done') {
        neuroGameState.progress.tasksCompleted++;
        saveProgress();
        checkAchievements();
    }
    renderKanbanBoard();
    updateNeuroBotBadge();
}

let draggedElement = null;
function handleDragStart(e) { draggedElement = e.currentTarget; e.dataTransfer.effectAllowed = 'move'; }
function handleDragOver(e)  { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
function handleDrop(e) {
    e.preventDefault();
    if (!draggedElement) return;
    const target = e.target.closest('.kanban-tasks');
    if (!target) return;
    const fromCol = draggedElement.dataset.column;
    const taskId  = draggedElement.dataset.taskId;
    const map = { todoTasks:'todo', doingTasks:'doing', doneTasks:'done' };
    const toCol = map[target.id];
    if (toCol && fromCol !== toCol) moveKanbanTask(taskId, fromCol, toCol);
    draggedElement = null;
}

// ═══════════════════════════════════════════════════════════════
// PROGRESSO
// ═══════════════════════════════════════════════════════════════

function updateProgressDisplay() {
    const set = (id, val) => { const el = $(id); if (el) el.textContent = val; };
    set('gamesPlayed',        neuroGameState.progress.gamesPlayed);
    set('pomodorosCompleted', neuroGameState.progress.pomodorosCompleted);
    set('tasksCompleted',     neuroGameState.progress.tasksCompleted);
    updateAchievementsDisplay();
}

function openProgress() { openModal('progressModal'); updateProgressDisplay(); }

function updateNeuroBotBadge() {
    const badge   = $('neuroBotBadge');
    const pending = neuroGameState.kanbanTasks.todo.length + neuroGameState.kanbanTasks.doing.length;
    if (badge) { badge.textContent = pending; badge.style.display = pending > 0 ? 'flex' : 'none'; }
}

// ═══════════════════════════════════════════════════════════════
// MODAIS
// ═══════════════════════════════════════════════════════════════

function openModal(id) {
    const el = $(id);
    if (el) { el.style.display = 'flex'; if (id === 'loginModal') setupLoginModal(); }
}
function closeModal(id) { const el = $(id); if (el) el.style.display = 'none'; }
function openTips()     { openModal('tipsModal'); }

window.addEventListener('click', e => {
    document.querySelectorAll('.modal').forEach(m => { if (e.target === m) m.style.display = 'none'; });
});

// ═══════════════════════════════════════════════════════════════
// NEUROBOT
// ═══════════════════════════════════════════════════════════════

const neuroBotKnowledge = {
    'o que é tdah': 'TDAH é um transtorno neurobiológico que afeta concentração, controle de impulsos e nível de atividade.',
    'sintomas tdah': 'Dificuldade de concentração, hiperatividade, impulsividade, desorganização e esquecimento são sintomas comuns.',
    'como lidar tdah': 'Use rotinas estruturadas, jogos cognitivos, Pomodoro e apoio profissional.',
    'pomodoro': 'A técnica Pomodoro divide o trabalho em blocos de 25 minutos + 5 min de pausa. Excelente para TDAH!',
    'organização': 'O Kanban visual ajuda a ver o progresso das tarefas. Divida tudo em passos pequenos!',
    'jogo': 'Temos Pares de Memória, Sequências Lógicas, Caça-Palavras, Verdadeiro/Falso e mais!',
};

function processNeuroBotMessage(msg) {
    const l = msg.toLowerCase();
    for (const [k, v] of Object.entries(neuroBotKnowledge))
        if (l.includes(k)) return v;
    if (l.includes('jogo') || l.includes('jogar')) return '🎮 Vá até a seção Jogos e escolha um desafio cognitivo!';
    if (l.includes('pomodoro') || l.includes('foco'))  { startPomodoro(); return '⏰ Pomodoro iniciado! 25 minutos de foco. 💪'; }
    if (l.includes('tarefa') || l.includes('organiz')) { openKanban();    return '📋 Organizador de tarefas aberto!'; }
    if (l.includes('progresso') || l.includes('conquista')) { openProgress(); return '📊 Veja seu progresso!'; }
    const fallback = [
        'Para TDAH, dicas visuais e pequenos passos fazem milagres! 🎯',
        'Que tal experimentar um jogo cognitivo ou a técnica Pomodoro? 🧠',
        'Organização visual e rotinas estruturadas são aliados poderosos! 📝',
    ];
    return fallback[Math.floor(Math.random() * fallback.length)];
}

function handleNeuroBotKeyPress(e) { if (e.key === 'Enter') sendNeuroBotMessage(); }

function sendNeuroBotMessage() {
    const input = $('neuroBotInput');
    const msg   = input?.value.trim();
    if (!msg) return;
    addNeuroBotMessage(msg, 'user');
    input.value = '';
    setTimeout(() => addNeuroBotMessage(processNeuroBotMessage(msg), 'bot'), 450);
}

function addNeuroBotMessage(content, sender) {
    const container = $('neuroBotMessages');
    if (!container) return;
    const div = document.createElement('div');
    div.className = `message ${sender}-message`;
    div.innerHTML = `
        <div class="message-avatar"><i class="fas fa-${sender === 'bot' ? 'robot' : 'user'}"></i></div>
        <div class="message-content"><p>${content}</p></div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function openNeuroBot()  { neuroGameState.isNeuroBotOpen = true;  $('neuroBotToggle').style.display = 'none'; $('neuroBotContainer').style.display = 'flex'; $('neuroBotBadge').style.display = 'none'; setTimeout(() => $('neuroBotInput')?.focus(), 300); }
function closeNeuroBot() { neuroGameState.isNeuroBotOpen = false; $('neuroBotContainer').style.display = 'none'; $('neuroBotToggle').style.display = 'flex'; }
function toggleNeuroBot() { neuroGameState.isNeuroBotOpen ? closeNeuroBot() : openNeuroBot(); }

function sendQuickMessage(msg) {
    addNeuroBotMessage(msg, 'user');
    const responses = {
        'Sugerir jogo':    '🎮 Experimente o Pares de Memória — ótimo para treinar atenção!',
        'Iniciar Pomodoro':() => { startPomodoro(); return '⏰ Pomodoro iniciado! 25 min de foco total. 💪'; },
        'Dicas TDAH':      () => { openTips(); return '💡 Dicas abertas!'; },
    };
    const r = responses[msg];
    setTimeout(() => addNeuroBotMessage(typeof r === 'function' ? r() : (r || '🌟 Como posso ajudar?'), 'bot'), 450);
}

// ═══════════════════════════════════════════════════════════════
// TEMA + AUTH
// ═══════════════════════════════════════════════════════════════

function toggleTheme() {
    const body = document.body;
    const dark = body.classList.toggle('dark-mode');
    body.classList.toggle('light-mode', !dark);
    localStorage.setItem('siteTheme', dark ? 'dark' : 'light');
    const moon = $('theme-icon-moon'), sun = $('theme-icon-sun');
    if (moon) moon.style.display = dark ? 'block' : 'none';
    if (sun)  sun.style.display  = dark ? 'none'  : 'block';
}

function applySavedTheme() {
    const saved = localStorage.getItem('siteTheme') || 'dark';
    document.body.classList.add(saved === 'light' ? 'light-mode' : 'dark-mode');
    const moon = $('theme-icon-moon'), sun = $('theme-icon-sun');
    if (moon) moon.style.display = saved === 'dark'  ? 'block' : 'none';
    if (sun)  sun.style.display  = saved === 'light' ? 'block' : 'none';
}

function setupLoginModal() {
    neuroGameState.authMode = 'login';
    updateAuthModalUI();
    validateLoginForm();
    ['authEmail','authPassword','authName','authConfirmPassword'].forEach(id => {
        const el = $(id); if (el) el.value = '';
    });
    const msg = $('authMessage'); if (msg) msg.textContent = '';
}

function toggleAuthMode(e) {
    e.preventDefault();
    neuroGameState.authMode = neuroGameState.authMode === 'login' ? 'register' : 'login';
    updateAuthModalUI();
    validateLoginForm();
    const msg = $('authMessage'); if (msg) msg.textContent = '';
}

function updateAuthModalUI() {
    const login = neuroGameState.authMode === 'login';
    const show  = el => { if (el) { el.style.display = 'block'; el.setAttribute('required','required'); } };
    const hide  = el => { if (el) { el.style.display = 'none';  el.removeAttribute('required'); } };

    const fields = {
        title:   $('authModalTitle'),
        name:    [$('authNameLabel'), $('authName')],
        confirm: [$('authConfirmPasswordLabel'), $('authConfirmPassword')],
        btn:     $('authSubmitButton'),
        text:    $('toggleAuthText'),
        link:    $('toggleAuthLink'),
    };

    if (fields.title) fields.title.textContent = login ? '🔐 Login' : '📝 Cadastro';
    if (fields.btn)   fields.btn.textContent   = login ? 'Entrar'   : 'Cadastrar';
    if (fields.text)  fields.text.textContent  = login ? 'Não tem conta?' : 'Já tem conta?';
    if (fields.link)  fields.link.textContent  = login ? 'Cadastre-se' : 'Faça login';

    fields.name.forEach(el    => login ? hide(el)  : show(el));
    fields.confirm.forEach(el => login ? hide(el)  : show(el));
}

function validateLoginForm() {
    const email = $('authEmail')?.value.trim()   || '';
    const pass  = $('authPassword')?.value.trim() || '';
    const name  = $('authName')?.value.trim()    || '';
    const conf  = $('authConfirmPassword')?.value.trim() || '';
    const btn   = $('authSubmitButton');
    const msg   = $('authMessage');

    let valid = email.includes('@') && email.includes('.') && pass.length >= 6;
    if (neuroGameState.authMode === 'register') {
        valid = valid && name.length > 0 && pass === conf;
        if (msg && pass && conf && pass !== conf) { msg.textContent = 'As senhas não coincidem.'; msg.style.color = 'red'; }
        else if (msg) msg.textContent = '';
    }
    if (btn) btn.disabled = !valid;
}

function performAuth() {
    const email = $('authEmail')?.value.trim();
    const pass  = $('authPassword')?.value.trim();
    const name  = $('authName')?.value.trim();
    const msg   = $('authMessage');

    if (neuroGameState.authMode === 'login') {
        if (['adulto@teste.com','crianca@teste.com'].includes(email) && pass === 'senha123') {
            if (msg) { msg.textContent = 'Login realizado! Bem-vindo(a)!'; msg.style.color = 'green'; }
            setTimeout(() => closeModal('loginModal'), 1500);
        } else {
            if (msg) { msg.textContent = 'Email ou senha incorretos.'; msg.style.color = 'red'; }
        }
    } else {
        if (['adulto@teste.com','crianca@teste.com'].includes(email)) {
            if (msg) { msg.textContent = 'Email já em uso.'; msg.style.color = 'red'; }
        } else {
            if (msg) { msg.textContent = `Cadastro de ${name} realizado! Faça login.`; msg.style.color = 'green'; }
            setTimeout(() => { neuroGameState.authMode = 'login'; updateAuthModalUI(); validateLoginForm(); }, 1500);
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// HUMOR + NOTAS
// ═══════════════════════════════════════════════════════════════

function openMoodTracker() { openModal('moodModal'); renderMoodHistory(); }

function saveMood(mood) {
    const history = JSON.parse(localStorage.getItem('moodHistory')) || [];
    history.unshift(`${new Date().toLocaleDateString()} — ${mood}`);
    if (history.length > 7) history.pop();
    localStorage.setItem('moodHistory', JSON.stringify(history));
    renderMoodHistory();
}

function renderMoodHistory() {
    const list = $('moodHistory');
    if (!list) return;
    const history = JSON.parse(localStorage.getItem('moodHistory')) || [];
    list.innerHTML = history.map(e => `<li>${e}</li>`).join('') || '<li>Nenhum registro ainda.</li>';
}

function openNotes()  { openModal('notesModal'); renderNotes(); }

function saveNote() {
    const input = $('newNote');
    const text  = input?.value.trim();
    if (!text) return;
    const notes = JSON.parse(localStorage.getItem('quickNotes')) || [];
    notes.unshift(text);
    localStorage.setItem('quickNotes', JSON.stringify(notes));
    input.value = '';
    renderNotes();
}

function renderNotes() {
    const list  = $('notesList');
    const notes = JSON.parse(localStorage.getItem('quickNotes')) || [];
    if (!list) return;
    list.innerHTML = notes.map((n, i) => `
        <li style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;
                   background:var(--bg-secondary);padding:8px 12px;border-radius:8px;color:var(--text-primary)">
            <span>${n}</span>
            <button onclick="deleteNote(${i})"
                style="background:#ef4444;color:#fff;border:none;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:.8rem">×</button>
        </li>`).join('') || '<li style="color:var(--text-tertiary)">Nenhuma nota ainda.</li>';
}

function deleteNote(index) {
    const notes = JSON.parse(localStorage.getItem('quickNotes')) || [];
    notes.splice(index, 1);
    localStorage.setItem('quickNotes', JSON.stringify(notes));
    renderNotes();
}

// ═══════════════════════════════════════════════════════════════
// NAVEGAÇÃO
// ═══════════════════════════════════════════════════════════════

function scrollToSection(id) { $(id)?.scrollIntoView({ behavior: 'smooth' }); }
function toggleMobileMenu()  { document.querySelector('.nav-menu')?.classList.toggle('active'); }
