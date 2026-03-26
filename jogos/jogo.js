/* ══════════ UTILS ══════════ */

const TimerManager = {
    _timers: new Set(),
    add(t) { this._timers.add(t); return t; },
    clear() {
        this._timers.forEach(t => { clearInterval(t); clearTimeout(t); });
        this._timers.clear();
    },
    interval(fn, ms) { return this.add(setInterval(fn, ms)); },
    timeout(fn, ms) { return this.add(setTimeout(fn, ms)); },
};

function clearAllTimers() { TimerManager.clear(); }
function addTimer(fn, ms) { return TimerManager.interval(fn, ms); }
function addTimeout(fn, ms) { return TimerManager.timeout(fn, ms); }

function openModal(id) {
    document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
    TimerManager.clear();
    if (window._tfTimer) { clearInterval(window._tfTimer); window._tfTimer = null; }
    if (window._diffTimer) { clearInterval(window._diffTimer); window._diffTimer = null; }

    const modal = document.getElementById(id);
    if (!modal) { console.error('Modal nao encontrado:', id); return; }
    modal.classList.add('open');

    modal.onclick = function (e) { if (e.target === modal) closeModal(id); };

    const inits = {
        memoryModal: () => initMemory(),
        trueFalseModal: initTF,
        organizeModal: initOrganize,
        colorModal: () => { },
        wordModal: initWordSearch,
        sequenceModal: initSequence,
        diffModal: () => { diffLvl = 0; initDiff(); },
        mathModal: () => { },
        simonModal: () => { },
        stroopModal: () => { },
    };
    if (inits[id]) inits[id]();
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('open');
    TimerManager.clear();
    if (window._tfTimer) { clearInterval(window._tfTimer); window._tfTimer = null; }
    if (window._diffTimer) { clearInterval(window._diffTimer); window._diffTimer = null; }
}

function showFeedback(el, msg, type) {
    if (!el) return;
    const cls = { ok: 'gfeedback-ok', err: 'gfeedback-err', info: 'gfeedback-info' };
    el.innerHTML = `<div class="gfeedback ${cls[type] || 'gfeedback-info'}">${msg}</div>`;
}

/* ══════════ JOGO: MEMORIA ══════════ */
const EMOJIS = ['🧠', '⚡', '🎯', '🌟', '🔥', '💡', '🎮', '🏆', '🦋', '🌈', '🎵', '🍀', '🎲', '🦄', '🚀', '🎪'];
let memCards = [], memFlipped = [], memMatched = 0, memAttemptCount = 0, memLevel = 1, memTimerSec = 0, memFlipping = false;

function initMemory(reset) {
    if (reset === true) memLevel = 1;
    memFlipped = []; memMatched = 0; memAttemptCount = 0; memTimerSec = 0; memFlipping = false;
    TimerManager.clear();

    const pairs = memLevel === 1 ? 4 : memLevel === 2 ? 6 : 8;
    document.getElementById('memLvl').textContent = memLevel;
    document.getElementById('memTotal').textContent = pairs;
    document.getElementById('memFound').textContent = 0;
    document.getElementById('memAttempts').textContent = 0;
    document.getElementById('memTime').textContent = '0s';
    document.getElementById('memFeedback').innerHTML = '';

    const board = document.getElementById('memoryBoard');
    board.style.gridTemplateColumns = 'repeat(4, 1fr)';

    const emojis = EMOJIS.slice(0, pairs);
    const shuffled = [...emojis, ...emojis].sort(() => Math.random() - .5);
    memCards = shuffled.map((e, i) => ({ emoji: e, id: i }));

    board.innerHTML = memCards.map((c, i) =>
        `<div class="memory-card face-down" id="mc${i}">❓</div>`
    ).join('');

    board.onclick = (e) => {
        const card = e.target.closest('.memory-card');
        if (card) flipCard(parseInt(card.id.replace('mc', ''), 10));
    };

    TimerManager.interval(() => {
        memTimerSec++;
        document.getElementById('memTime').textContent = memTimerSec + 's';
    }, 1000);
}

function flipCard(i) {
    if (memFlipping || memFlipped.length >= 2) return;
    const el = document.getElementById('mc' + i);
    if (!el || el.classList.contains('matched') || el.classList.contains('flipped')) return;

    el.classList.remove('face-down');
    el.classList.add('flipped');
    el.textContent = memCards[i].emoji;
    memFlipped.push(i);

    if (memFlipped.length === 2) {
        memFlipping = true;
        memAttemptCount++;
        document.getElementById('memAttempts').textContent = memAttemptCount;
        const [a, b] = memFlipped;

        if (memCards[a].emoji === memCards[b].emoji) {
            document.getElementById('mc' + a).classList.add('matched');
            document.getElementById('mc' + b).classList.add('matched');
            memMatched++;
            document.getElementById('memFound').textContent = memMatched;
            memFlipped = []; memFlipping = false;

            const pairs = memLevel === 1 ? 4 : memLevel === 2 ? 6 : 8;
            if (memMatched === pairs) {
                TimerManager.clear();
                showFeedback(document.getElementById('memFeedback'),
                    memLevel < 3
                        ? `🏆 Nivel ${memLevel} completo em ${memAttemptCount} tentativas! Nivel ${memLevel + 1} em breve...`
                        : `🏆 Parabens! Todos os niveis em ${memTimerSec}s!`, 'ok');
                if (memLevel < 3) { memLevel++; addTimeout(() => initMemory(), 2000); }
            }
        } else {
            addTimeout(() => {
                [a, b].forEach(idx => {
                    const c = document.getElementById('mc' + idx);
                    if (c) { c.classList.add('face-down'); c.classList.remove('flipped'); c.textContent = '❓'; }
                });
                memFlipped = []; memFlipping = false;
            }, 900);
        }
    }
}

/* ══════════ JOGO: VERDADEIRO/FALSO ══════════ */
const TF_QUESTIONS = [
    { q: 'O TDAH afeta apenas crianças e desaparece na adolescência.', a: false, exp: 'O TDAH pode persistir na vida adulta em muitos casos.' },
    { q: 'Pessoas com TDAH têm dificuldade em regular a atenção, não ausência total de atenção.', a: true, exp: 'Eles podem se hiperfocas em tarefas interessantes!' },
    { q: 'A técnica Pomodoro pode ajudar pessoas com TDAH a manter o foco.', a: true, exp: 'Pausas regulares ajudam a regular a atenção.' },
    { q: 'O TDAH é causado exclusivamente por má criação ou falta de disciplina.', a: false, exp: 'TDAH tem base neurobiológica e componente genético.' },
    { q: 'Exercício físico pode ajudar a melhorar os sintomas do TDAH.', a: true, exp: 'Atividade física libera dopamina e melhora o foco.' },
    { q: 'Fazer uma tarefa de cada vez é mais eficiente que multitarefa.', a: true, exp: 'O cérebro não processa múltiplas tarefas ao mesmo tempo.' },
    { q: 'Ambientes silenciosos são sempre mais produtivos para todos.', a: false, exp: 'Algumas pessoas rendem melhor com ruído de fundo moderado.' },
    { q: 'Pessoas com TDAH nunca conseguem ser organizadas.', a: false, exp: 'Com estratégias e ferramentas adequadas, é totalmente possível!' },
    { q: 'Listas de tarefas podem reduzir a carga cognitiva do dia a dia.', a: true, exp: 'Externalizar informações libera memória de trabalho.' },
    { q: 'O sono tem pouca influência no foco e na atenção.', a: false, exp: 'Sono de qualidade é essencial para funções executivas.' },
];
let tfCurrent = 0, tfScore = 0, tfAnswered = false, tfShuffled = [];

function initTF() {
    if (window._tfTimer) { clearInterval(window._tfTimer); window._tfTimer = null; }
    tfShuffled = [...TF_QUESTIONS].sort(() => Math.random() - .5);
    tfCurrent = 0; tfScore = 0; tfAnswered = false;
    document.getElementById('tfScore').textContent = 0;
    document.getElementById('tfFeedback').innerHTML = '';
    showTFQuestion();
}

function showTFQuestion() {
    if (window._tfTimer) { clearInterval(window._tfTimer); window._tfTimer = null; }
    if (tfCurrent >= tfShuffled.length) {
        document.getElementById('tfQuestion').textContent = 'Fim da rodada!';
        const pct = Math.round(tfScore / tfShuffled.length * 100);
        showFeedback(document.getElementById('tfFeedback'),
            `🎉 Você acertou ${tfScore} de ${tfShuffled.length} (${pct}%)`, 'ok');
        return;
    }
    tfAnswered = false;
    document.getElementById('tfProg').textContent = `Pergunta ${tfCurrent + 1}/${tfShuffled.length}`;
    document.getElementById('tfQuestion').textContent = tfShuffled[tfCurrent].q;
    document.getElementById('tfFeedback').innerHTML = '';

    const fill = document.getElementById('tfFill');
    fill.style.transition = 'none';
    fill.style.width = '100%';
    requestAnimationFrame(() => requestAnimationFrame(() => {
        fill.style.transition = 'width 12s linear';
        fill.style.width = '0%';
    }));

    let t = 12;
    window._tfTimer = setInterval(() => {
        t--;
        if (t <= 0) { clearInterval(window._tfTimer); window._tfTimer = null; if (!tfAnswered) answerTF(null); }
    }, 1000);
}

function answerTF(val) {
    if (tfAnswered) return;
    tfAnswered = true;
    if (window._tfTimer) { clearInterval(window._tfTimer); window._tfTimer = null; }
    const q = tfShuffled[tfCurrent];
    const correct = val === q.a;
    if (correct) tfScore++;
    document.getElementById('tfScore').textContent = tfScore;
    showFeedback(document.getElementById('tfFeedback'),
        (val === null ? '⏰ Tempo! ' : correct ? '✅ Correto! ' : '❌ Errado! ') + q.exp,
        val === null ? 'info' : correct ? 'ok' : 'err');
    tfCurrent++;
    setTimeout(showTFQuestion, 2200);
}

/* ══════════ JOGO: ORGANIZAR ══════════ */
const ORG_TASKS = [
    { text: 'Tomar remédio', correct: 'Alta' },
    { text: 'Responder e-mails urgentes', correct: 'Alta' },
    { text: 'Ir ao médico', correct: 'Alta' },
    { text: 'Pagar conta vencendo hoje', correct: 'Alta' },
    { text: 'Fazer dever de casa', correct: 'Média' },
    { text: 'Arrumar o quarto', correct: 'Média' },
    { text: 'Organizar a gaveta', correct: 'Baixa' },
    { text: 'Jogar videogame', correct: 'Baixa' },
];
let draggedTask = null;

function initOrganize() {
    ['taskPool', 'zoneAlta', 'zoneMedia', 'zoneBaixa', 'orgFeedback']
        .forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = ''; });
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));

    [...ORG_TASKS].sort(() => Math.random() - .5).forEach(t => {
        document.getElementById('taskPool').appendChild(makeChip(t.text, t.correct));
    });
}

function makeChip(text, correct) {
    const chip = document.createElement('div');
    chip.className = 'task-chip';
    chip.draggable = true;
    chip.textContent = text;
    chip.dataset.correct = correct;
    chip.addEventListener('dragstart', e => {
        draggedTask = chip; chip.style.opacity = '.4';
        e.dataTransfer.setData('text/plain', '');
    });
    chip.addEventListener('dragend', () => { chip.style.opacity = '1'; });
    return chip;
}

function allowDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

document.addEventListener('dragleave', e => {
    const zone = e.target.closest('.drop-zone, .task-pool');
    if (zone && !zone.contains(e.relatedTarget)) zone.classList.remove('drag-over');
});

function dropTask(e, zone) {
    e.preventDefault();
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    if (!draggedTask) return;
    const ids = { Alta: 'zoneAlta', 'Média': 'zoneMedia', Baixa: 'zoneBaixa' };
    const container = document.getElementById(ids[zone]);
    if (!container) return;
    const clone = makeChip(draggedTask.textContent, draggedTask.dataset.correct);
    clone.style.marginBottom = '.4rem';
    container.appendChild(clone);
    draggedTask.remove();
    draggedTask = null;
}

function dropToPool(e) {
    e.preventDefault();
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    if (!draggedTask) return;
    draggedTask.style.marginBottom = '';
    document.getElementById('taskPool').appendChild(draggedTask);
    draggedTask = null;
}

function checkOrganize() {
    const ids = { Alta: 'zoneAlta', 'Média': 'zoneMedia', Baixa: 'zoneBaixa' };
    let correct = 0, total = 0;
    Object.entries(ids).forEach(([zone, id]) => {
        document.getElementById(id).querySelectorAll('.task-chip').forEach(chip => {
            total++;
            const ok = chip.dataset.correct === zone;
            chip.style.borderColor = ok ? 'var(--easy)' : 'var(--hard)';
            chip.style.color = ok ? 'var(--easy)' : 'var(--hard)';
            if (ok) correct++;
        });
    });
    showFeedback(document.getElementById('orgFeedback'),
        total === 0
            ? '⚠️ Arraste as tarefas primeiro!'
            : `🎯 ${correct}/${total} corretos! ${correct === total ? 'Perfeito! 🏆' : 'Veja as marcadas em vermelho!'}`,
        correct === total && total > 0 ? 'ok' : total === 0 ? 'info' : 'err');
}

/* ══════════ JOGO: COR / ATENCAO ══════════ */
const COLORS = [
    { name: 'Vermelho', hex: '#ef4444' },
    { name: 'Azul', hex: '#3b82f6' },
    { name: 'Verde', hex: '#22c55e' },
    { name: 'Amarelo', hex: '#f59e0b' },
    { name: 'Roxo', hex: '#8b5cf6' },
];
let colorScore = 0, colorTime = 30, colorRunning = false, colorTarget = null;

function initColor() {
    colorScore = 0; colorTime = 30; colorRunning = true; colorTarget = null;
    document.getElementById('colorScore').textContent = 0;
    document.getElementById('colorTimer').textContent = '30s';
    document.getElementById('colorFeedback').innerHTML = '';
    TimerManager.clear();
    nextColor();
    TimerManager.interval(() => {
        colorTime--;
        document.getElementById('colorTimer').textContent = colorTime + 's';
        if (colorTime <= 0) {
            colorRunning = false; TimerManager.clear();
            document.getElementById('colorOptions').innerHTML = '';
            showFeedback(document.getElementById('colorFeedback'),
                `⏰ Fim! Você fez ${colorScore} pontos!`, 'info');
        }
    }, 1000);
}

function nextColor() {
    if (!colorRunning) return;
    colorTarget = COLORS[Math.floor(Math.random() * COLORS.length)];
    document.getElementById('colorTarget').textContent = '👆 Clique em: ' + colorTarget.name;
    const opts = [...COLORS].sort(() => Math.random() - .5);
    const container = document.getElementById('colorOptions');
    container.innerHTML = opts.map(c =>
        `<div class="color-opt" style="background:${c.hex};" data-name="${c.name}" title="${c.name}"></div>`
    ).join('');
    container.onclick = e => {
        const opt = e.target.closest('.color-opt');
        if (opt && colorRunning && colorTarget) {
            if (opt.dataset.name === colorTarget.name) {
                colorScore++;
                document.getElementById('colorScore').textContent = colorScore;
            }
            nextColor();
        }
    };
}

/* ══════════ JOGO: CACA-PALAVRAS ══════════ */
const WS_WORDS = [
    { word: 'FOCO', hint: 'Concentração em uma tarefa' },
    { word: 'TDAH', hint: 'Sigla do transtorno' },
    { word: 'MEMORIA', hint: 'Capacidade de lembrar coisas' },
    { word: 'ROTINA', hint: 'Hábitos do dia a dia' },
    { word: 'PAUSA', hint: 'Descanso entre atividades' },
    { word: 'META', hint: 'Objetivo a alcançar' },
    { word: 'CALMA', hint: 'Estado de tranquilidade' },
    { word: 'FORCA', hint: 'Energia e determinação' },
];
const WS_COLS = 10, WS_ROWS = 8;
let wsGrid = [], wsTarget = '', wsRound = 0, wsScore = 0;
let wsSelecting = false, wsStart = null, wsSelected = [];

function initWordSearch() {
    wsRound++;
    const entry = WS_WORDS[(wsRound - 1) % WS_WORDS.length];
    wsTarget = entry.word;
    document.getElementById('wsRound').textContent = wsRound;
    document.getElementById('wsHint').textContent = '🔍 Encontre: ' + entry.hint;
    document.getElementById('wsFeedback').innerHTML = '';

    const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    wsGrid = Array.from({ length: WS_ROWS }, () =>
        Array.from({ length: WS_COLS }, () => ABC[Math.floor(Math.random() * 26)])
    );

    if (Math.random() < .5) {
        const r = Math.floor(Math.random() * WS_ROWS);
        const c = Math.floor(Math.random() * (WS_COLS - wsTarget.length));
        wsTarget.split('').forEach((ch, i) => wsGrid[r][c + i] = ch);
    } else {
        const r = Math.floor(Math.random() * (WS_ROWS - wsTarget.length));
        const c = Math.floor(Math.random() * WS_COLS);
        wsTarget.split('').forEach((ch, i) => wsGrid[r + i][c] = ch);
    }

    renderWordGrid();
}

function renderWordGrid() {
    const container = document.getElementById('wordGrid');
    // Remove listeners antigos clonando o nó
    const fresh = container.cloneNode(false);
    container.parentNode.replaceChild(fresh, container);

    wsSelecting = false; wsStart = null; wsSelected = [];

    wsGrid.forEach((row, r) => {
        const rowEl = document.createElement('div');
        rowEl.className = 'word-grid-row';
        row.forEach((ch, c) => {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.textContent = ch;
            cell.dataset.r = r; cell.dataset.c = c;
            rowEl.appendChild(cell);
        });
        fresh.appendChild(rowEl);
    });

    fresh.addEventListener('pointerdown', wsPointerDown);
    fresh.addEventListener('pointermove', wsPointerMove);
    fresh.addEventListener('pointerup', wsPointerUp);
    fresh.addEventListener('pointercancel', wsPointerUp);
}

function wsPointerDown(e) {
    const cell = e.target.closest('.grid-cell');
    if (!cell) return;
    e.preventDefault();
    wsSelecting = true;
    wsStart = { r: +cell.dataset.r, c: +cell.dataset.c };
    wsSelected = [{ ...wsStart }];
    wsHighlight();
}
function wsPointerMove(e) {
    if (!wsSelecting) return;
    e.preventDefault();
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const cell = el && el.closest ? el.closest('.grid-cell') : null;
    if (!cell) return;
    const r = +cell.dataset.r, c = +cell.dataset.c;
    const dr = r - wsStart.r, dc = c - wsStart.c;
    wsSelected = [{ ...wsStart }];
    if (dr === 0 && dc !== 0) {
        const step = dc > 0 ? 1 : -1;
        for (let i = step; Math.abs(i) <= Math.abs(dc); i += step)
            wsSelected.push({ r, c: wsStart.c + i });
    } else if (dc === 0 && dr !== 0) {
        const step = dr > 0 ? 1 : -1;
        for (let i = step; Math.abs(i) <= Math.abs(dr); i += step)
            wsSelected.push({ r: wsStart.r + i, c });
    }
    wsHighlight();
}
function wsPointerUp() {
    if (!wsSelecting) return;
    wsSelecting = false;
    const container = document.getElementById('wordGrid');
    const sel = wsSelected.map(({ r, c }) => wsGrid[r][c]).join('');
    const selRev = wsSelected.slice().reverse().map(({ r, c }) => wsGrid[r][c]).join('');
    if (sel === wsTarget || selRev === wsTarget) {
        wsSelected.forEach(({ r, c }) => {
            const el = container.querySelector(`.grid-cell[data-r="${r}"][data-c="${c}"]`);
            if (el) el.classList.add('found');
        });
        wsScore++;
        document.getElementById('wsScore').textContent = wsScore;
        showFeedback(document.getElementById('wsFeedback'), '🎉 Encontrou! Próxima em 2s...', 'ok');
        addTimeout(initWordSearch, 2000);
    } else {
        container.querySelectorAll('.grid-cell.selecting:not(.found)').forEach(el => el.classList.remove('selecting'));
    }
    wsSelected = [];
}
function wsHighlight() {
    const container = document.getElementById('wordGrid');
    if (!container) return;
    container.querySelectorAll('.grid-cell:not(.found)').forEach(el => el.classList.remove('selecting'));
    wsSelected.forEach(({ r, c }) => {
        const el = container.querySelector(`.grid-cell[data-r="${r}"][data-c="${c}"]`);
        if (el) el.classList.add('selecting');
    });
}

/* ══════════ JOGO: SEQUENCIA ══════════ */
let seqLevel = 1, seqScore = 0;

function genWrong(ans, count) {
    count = count || 3;
    const s = new Set();
    const diffs = [1, -1, 2, -2, 3, -3, 5, -5, 7, -7, 10, -10];
    for (const d of diffs) {
        if (s.size >= count) break;
        const w = ans + d;
        if (w > 0 && w !== ans) s.add(w);
    }
    let extra = 1;
    while (s.size < count) { s.add(ans + extra * 17 + 13); extra++; }
    return Array.from(s).slice(0, count);
}

const SEQ_TYPES = [
    function () {
        const s = Math.floor(Math.random() * 5) + 1, a = Math.floor(Math.random() * 10) + 1;
        const ans = a + 4 * s;
        return { seq: [a, a + s, a + 2 * s, a + 3 * s], ans: ans, wrong: genWrong(ans) };
    },
    function () {
        const r = 2, a = Math.floor(Math.random() * 3) + 1;
        const ans = a * Math.pow(r, 4);
        return { seq: [a, a * r, a * r * r, a * r * r * r], ans: ans, wrong: genWrong(ans) };
    },
    function () {
        const a = Math.floor(Math.random() * 3) + 1, b = Math.floor(Math.random() * 3) + 2;
        const c = a + b, d = b + c, ans = c + d;
        return { seq: [a, b, c, d], ans: ans, wrong: genWrong(ans) };
    },
    function () {
        const o = Math.floor(Math.random() * 4) + 1;
        const seq = [1, 2, 3, 4].map(function (n) { return (n + o) * (n + o); });
        const ans = (5 + o) * (5 + o);
        return { seq: seq, ans: ans, wrong: genWrong(ans) };
    },
];

function initSequence() {
    document.getElementById('seqLvl').textContent = seqLevel;
    document.getElementById('seqScore').textContent = seqScore;
    document.getElementById('seqFeedback').innerHTML = '';

    const result = SEQ_TYPES[(seqLevel - 1) % SEQ_TYPES.length]();
    const seq = result.seq, ans = result.ans, wrong = result.wrong;

    document.getElementById('seqDisplay').innerHTML =
        seq.map(function (n) { return '<div class="seq-num">' + n + '</div>'; }).join('') +
        '<div class="seq-num unknown">?</div>';

    const opts = [ans].concat(wrong).sort(function () { return Math.random() - .5; });
    const optsEl = document.getElementById('seqOptions');
    optsEl.innerHTML = opts.map(function (o) {
        return '<div class="seq-opt" data-val="' + o + '">' + o + '</div>';
    }).join('');
    optsEl.onclick = function (e) {
        const opt = e.target.closest('.seq-opt');
        if (opt) checkSeq(opt, +opt.dataset.val, ans);
    };
}

function checkSeq(el, val, ans) {
    document.getElementById('seqOptions').onclick = null;
    document.querySelectorAll('.seq-opt').forEach(function (o) { o.style.pointerEvents = 'none'; });
    if (val === ans) {
        el.classList.add('correct');
        seqScore += seqLevel * 10; seqLevel++;
        document.getElementById('seqScore').textContent = seqScore;
        showFeedback(document.getElementById('seqFeedback'), '✅ Correto! Próximo nível...', 'ok');
        addTimeout(initSequence, 1500);
    } else {
        el.classList.add('wrong');
        document.querySelectorAll('.seq-opt').forEach(function (o) { if (+o.dataset.val === ans) o.classList.add('correct'); });
        showFeedback(document.getElementById('seqFeedback'), '❌ Era ' + ans + '. Reiniciando...', 'err');
        seqLevel = 1;
        addTimeout(initSequence, 2200);
    }
}

/* ══════════ JOGO: DIFERENCAS ══════════ */
const DIFF_EMOJIS = ['🎯', '⭐', '🎵', '🌙', '🔥', '💎', '🎪', '🌊', '🦋', '🍀', '🎲', '🌸'];
let diffLvl = 0, diffDiffs = [], diffFound = 0, diffTimerVal = 60;

function initDiff() {
    if (window._diffTimer) { clearInterval(window._diffTimer); window._diffTimer = null; }
    diffLvl = Math.min(diffLvl + 1, 3);
    const numDiff = diffLvl + 2;
    diffFound = 0; diffTimerVal = 70 - diffLvl * 10;

    document.getElementById('diffLvl').textContent = diffLvl;
    document.getElementById('diffFound').textContent = 0;
    document.getElementById('diffTotal').textContent = numDiff;
    document.getElementById('diffTimer').textContent = diffTimerVal + 's';
    document.getElementById('diffFeedback').innerHTML = '';

    const size = 25;
    const base = Array.from({ length: size }, function (_, i) { return DIFF_EMOJIS[i % DIFF_EMOJIS.length]; });
    const panelA = base.slice(), panelB = base.slice();
    diffDiffs = [];

    let attempts = 0;
    while (diffDiffs.length < numDiff && attempts < 200) {
        attempts++;
        const idx = Math.floor(Math.random() * size);
        if (diffDiffs.indexOf(idx) !== -1) continue;
        const cur = DIFF_EMOJIS.indexOf(panelB[idx]);
        const neu = DIFF_EMOJIS[(cur + 3) % DIFF_EMOJIS.length];
        if (neu !== panelB[idx]) { diffDiffs.push(idx); panelB[idx] = neu; }
    }

    renderDiff('diffA', panelA, false, numDiff);
    renderDiff('diffB', panelB, true, numDiff);

    window._diffTimer = setInterval(function () {
        diffTimerVal--;
        document.getElementById('diffTimer').textContent = diffTimerVal + 's';
        if (diffTimerVal <= 0) {
            clearInterval(window._diffTimer); window._diffTimer = null;
            showFeedback(document.getElementById('diffFeedback'),
                '⏰ Tempo! Encontrou ' + diffFound + '/' + numDiff + '.', 'err');
        }
    }, 1000);
}

function renderDiff(id, panel, clickable, numDiff) {
    document.getElementById(id).innerHTML = panel.map(function (e, i) {
        return '<div class="diff-cell' + (clickable ? ' clickable' : '') + '" data-i="' + i + '">' + e + '</div>';
    }).join('');
    if (clickable) {
        document.getElementById(id).onclick = function (e) {
            const cell = e.target.closest('.diff-cell');
            if (cell) clickDiff(cell, +cell.dataset.i, numDiff);
        };
    }
}

function clickDiff(el, idx, total) {
    if (el.classList.contains('found') || el.classList.contains('wrong-click')) return;
    if (diffDiffs.indexOf(idx) !== -1) {
        el.classList.add('found'); diffFound++;
        document.getElementById('diffFound').textContent = diffFound;
        if (diffFound === total) {
            if (window._diffTimer) { clearInterval(window._diffTimer); window._diffTimer = null; }
            showFeedback(document.getElementById('diffFeedback'),
                diffLvl < 3 ? '🏆 Nivel ' + diffLvl + ' completo! Proximo em 2s...' : '🏆 Todos os niveis dominados!', 'ok');
            if (diffLvl < 3) addTimeout(initDiff, 2000);
        }
    } else {
        el.classList.add('wrong-click');
        addTimeout(function () { el.classList.remove('wrong-click'); }, 600);
    }
}

/* ══════════ JOGO: SPRINT MENTAL ══════════ */
let mathScore = 0, mathStreak = 0, mathMaxStreak = 0, mathTime = 60, mathRunning = false, mathAns = 0;

function initMath() {
    mathScore = 0; mathStreak = 0; mathMaxStreak = 0; mathTime = 60; mathRunning = true;
    document.getElementById('mathScore').textContent = 0;
    document.getElementById('mathStreak').textContent = 0;
    document.getElementById('mathTimer').textContent = '60s';
    document.getElementById('mathFeedback').innerHTML = '';
    document.getElementById('mathInput').disabled = false;
    TimerManager.clear();
    nextMath();
    TimerManager.interval(function () {
        mathTime--;
        document.getElementById('mathTimer').textContent = mathTime + 's';
        if (mathTime <= 0) {
            mathRunning = false; TimerManager.clear();
            document.getElementById('mathInput').disabled = true;
            showFeedback(document.getElementById('mathFeedback'),
                '⏰ Fim! Pontuação: ' + mathScore + ' | Melhor sequência: ' + mathMaxStreak, 'info');
        }
    }, 1000);
    document.getElementById('mathInput').focus();
}

function nextMath() {
    if (!mathRunning) return;
    const ops = ['+', '-', '×'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a, b;
    if (op === '+') {
        a = Math.floor(Math.random() * 50) + 1; b = Math.floor(Math.random() * 50) + 1; mathAns = a + b;
    } else if (op === '-') {
        a = Math.floor(Math.random() * 50) + 20; b = Math.floor(Math.random() * (a - 1)) + 1; mathAns = a - b;
    } else {
        a = Math.floor(Math.random() * 10) + 2; b = Math.floor(Math.random() * 10) + 2; mathAns = a * b;
    }
    document.getElementById('mathEq').textContent = a + ' ' + op + ' ' + b + ' = ?';
    document.getElementById('mathInput').value = '';
    document.getElementById('mathFeedback').innerHTML = '';
    document.getElementById('mathInput').focus();
}

function checkMath() {
    if (!mathRunning) return;
    const raw = document.getElementById('mathInput').value.trim();
    if (raw === '' || isNaN(+raw)) return;
    const val = +raw;
    if (val === mathAns) {
        mathStreak++;
        if (mathStreak > mathMaxStreak) mathMaxStreak = mathStreak;
        mathScore += 10 + (mathStreak - 1) * 2;
        document.getElementById('mathScore').textContent = mathScore;
        document.getElementById('mathStreak').textContent = mathStreak;
        showFeedback(document.getElementById('mathFeedback'), mathStreak > 1 ? '✅ Certo! 🔥×' + mathStreak : '✅ Certo!', 'ok');
    } else {
        mathStreak = 0;
        document.getElementById('mathStreak').textContent = 0;
        showFeedback(document.getElementById('mathFeedback'), '❌ Era ' + mathAns, 'err');
    }
    addTimeout(nextMath, 600);
}

/* ══════════ JOGO: SIMON DIZ ══════════ */
let simonSeq = [], simonPlayer = [], simonRound = 0, simonBest = 0, simonPlaying = false, simonLocked = false;

function initSimon() {
    simonSeq = []; simonPlayer = []; simonRound = 0; simonPlaying = false; simonLocked = false;
    document.getElementById('simonRound').textContent = 0;
    document.getElementById('simonMsg').textContent = 'Observe a sequência...';
    document.getElementById('simonFeedback').innerHTML = '';
    addTimeout(simonNextRound, 600);
}

function simonNextRound() {
    simonRound++;
    document.getElementById('simonRound').textContent = simonRound;
    simonSeq.push(Math.floor(Math.random() * 4));
    simonPlayer = []; simonPlaying = false; simonLocked = true;
    document.getElementById('simonMsg').textContent = 'Observe...';
    document.getElementById('simonFeedback').innerHTML = '';
    simonPlaySeq(0);
}

function simonPlaySeq(i) {
    if (i >= simonSeq.length) {
        simonPlaying = true; simonLocked = false;
        document.getElementById('simonMsg').textContent = 'Sua vez! Repita ' + simonRound + ' passo(s)!';
        return;
    }
    const speed = Math.max(300, 600 - simonRound * 20);
    addTimeout(function () {
        const btn = document.getElementById('sb' + simonSeq[i]);
        if (btn) btn.classList.add('active');
        addTimeout(function () {
            if (btn) btn.classList.remove('active');
            simonPlaySeq(i + 1);
        }, speed);
    }, i * (speed + 200));
}

function simonPress(i) {
    if (!simonPlaying || simonLocked) return;
    const btn = document.getElementById('sb' + i);
    if (btn) { btn.classList.add('active'); addTimeout(function () { btn.classList.remove('active'); }, 200); }
    simonPlayer.push(i);
    const pos = simonPlayer.length - 1;
    if (simonPlayer[pos] !== simonSeq[pos]) {
        simonPlaying = false; simonLocked = true;
        if (simonRound - 1 > simonBest) { simonBest = simonRound - 1; document.getElementById('simonBest').textContent = simonBest; }
        showFeedback(document.getElementById('simonFeedback'), '❌ Errou na rodada ' + simonRound + '! Recorde: ' + simonBest, 'err');
        document.getElementById('simonMsg').textContent = 'Game Over!';
    } else if (simonPlayer.length === simonSeq.length) {
        simonPlaying = false;
        document.getElementById('simonMsg').textContent = '✅ Correto!';
        showFeedback(document.getElementById('simonFeedback'), '👏 Rodada ' + simonRound + ' completa!', 'ok');
        addTimeout(simonNextRound, 1400);
    }
}

/* ══════════ JOGO: STROOP ══════════ */
const STROOP_COLORS = [
    { name: 'VERMELHO', color: '#ef4444' },
    { name: 'AZUL', color: '#3b82f6' },
    { name: 'VERDE', color: '#22c55e' },
    { name: 'AMARELO', color: '#f59e0b' },
    { name: 'ROXO', color: '#8b5cf6' },
];
let stroopScore = 0, stroopErrors = 0, stroopTime = 60, stroopRunning = false, stroopTarget = '';

function initStroop() {
    stroopScore = 0; stroopErrors = 0; stroopTime = 60; stroopRunning = true;
    document.getElementById('stroopScore').textContent = 0;
    document.getElementById('stroopErrors').textContent = 0;
    document.getElementById('stroopTimer').textContent = '60s';
    document.getElementById('stroopFeedback').innerHTML = '';
    TimerManager.clear();
    nextStroop();
    TimerManager.interval(function () {
        stroopTime--;
        document.getElementById('stroopTimer').textContent = stroopTime + 's';
        if (stroopTime <= 0) {
            stroopRunning = false; TimerManager.clear();
            document.getElementById('stroopOptions').innerHTML = '';
            const total = stroopScore + stroopErrors;
            const pct = total > 0 ? Math.round(stroopScore / total * 100) : 0;
            showFeedback(document.getElementById('stroopFeedback'),
                '⏰ Fim! Pontos: ' + stroopScore + ' | Erros: ' + stroopErrors + ' | Precisão: ' + pct + '%', 'info');
        }
    }, 1000);
}

function nextStroop() {
    if (!stroopRunning) return;
    const wordColor = STROOP_COLORS[Math.floor(Math.random() * STROOP_COLORS.length)];
    let inkColor;
    let tries = 0;
    do {
        inkColor = STROOP_COLORS[Math.floor(Math.random() * STROOP_COLORS.length)];
        tries++;
    } while (inkColor.name === wordColor.name && tries < 10);

    stroopTarget = inkColor.name;
    document.getElementById('stroopWord').style.color = inkColor.color;
    document.getElementById('stroopWord').textContent = wordColor.name;

    let opts = STROOP_COLORS.slice().sort(function () { return Math.random() - .5; }).slice(0, 4);
    if (!opts.find(function (o) { return o.name === inkColor.name; })) opts[0] = inkColor;
    opts = opts.sort(function () { return Math.random() - .5; });

    const container = document.getElementById('stroopOptions');
    container.innerHTML = opts.map(function (c) {
        return '<div class="stroop-opt" style="color:' + c.color + ';border-color:' + c.color + '60;" data-name="' + c.name + '">' + c.name + '</div>';
    }).join('');
    container.onclick = function (e) {
        const opt = e.target.closest('.stroop-opt');
        if (opt && stroopRunning) clickStroop(opt.dataset.name);
    };
}

function clickStroop(name) {
    if (!stroopRunning) return;
    if (name === stroopTarget) {
        stroopScore++;
        document.getElementById('stroopScore').textContent = stroopScore;
        showFeedback(document.getElementById('stroopFeedback'), '✅', 'ok');
    } else {
        stroopErrors++;
        document.getElementById('stroopErrors').textContent = stroopErrors;
        showFeedback(document.getElementById('stroopFeedback'), '❌ Era: ' + stroopTarget, 'err');
    }
    addTimeout(nextStroop, 400);
}