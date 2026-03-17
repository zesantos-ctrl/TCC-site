// ═══════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════
const state = {
    pomodoro: {
        minutes: 25,
        seconds: 0,
        isRunning: false,
        isBreak: false,
        interval: null,
        totalSeconds: 25 * 60,
        elapsedSeconds: 0,
    },
    progress: {
        pomodorosCompleted: 0,
        focusMinutes: 0,
    },
    kanban: loadKanban(),
};

const CIRCUMFERENCE = 2 * Math.PI * 88;
const WP_KEY = "ng_wallpaper";
const WP_OPA_KEY = "ng_wp_opacity";
const PW_STATE_KEY = "ng_pw_state"; // chave compartilhada com o widget

// Publica estado do pomodoro no localStorage para o widget ler
function publishPomodoroState() {
    const p = state.pomodoro;
    const rem = p.minutes * 60 + p.seconds;
    localStorage.setItem(PW_STATE_KEY, JSON.stringify({
        isRunning: p.isRunning,
        isBreak: p.isBreak,
        totalSeconds: p.totalSeconds,
        pausedRemaining: rem,
        startedAt: p.isRunning ? (Date.now() - p.elapsedSeconds * 1000) : null,
        elapsedSeconds: p.elapsedSeconds,
        pomodorosCompleted: state.progress.pomodorosCompleted,
        focusMinutes: state.progress.focusMinutes,
        everStarted: true,
    }));
}

// Restaura estado do localStorage ao voltar para a página
function restorePomodoroFromStorage() {
    try {
        const s = JSON.parse(localStorage.getItem(PW_STATE_KEY));
        if (!s || !s.everStarted) return;
        const p = state.pomodoro;
        p.isBreak = s.isBreak;
        p.totalSeconds = s.totalSeconds;
        state.progress.pomodorosCompleted = s.pomodorosCompleted || 0;
        state.progress.focusMinutes = s.focusMinutes || 0;
        if (s.isRunning && s.startedAt) {
            const elapsed = Math.floor((Date.now() - s.startedAt) / 1000);
            const rem = Math.max(0, s.pausedRemaining - elapsed);
            p.minutes = Math.floor(rem / 60);
            p.seconds = rem % 60;
            p.elapsedSeconds = p.totalSeconds - rem;
            p.isRunning = false;
            startPomodoro();
        } else {
            const rem = s.pausedRemaining || (25 * 60);
            p.minutes = Math.floor(rem / 60);
            p.seconds = rem % 60;
            p.elapsedSeconds = p.totalSeconds - rem;
        }
    } catch { }
}

// ── <style> injetada para wallpaper (vence qualquer CSS externo) ──
const wpStyle = document.createElement("style");
wpStyle.id = "wp-dynamic-style";
document.head.appendChild(wpStyle);

// ═══════════════════════════════════════════════
//  INIT — único DOMContentLoaded
// ═══════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {

    // SVG gradiente do anel
    const svg = document.querySelector(".progress-ring");
    if (svg) {
        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        defs.innerHTML = `
      <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%"   stop-color="#7c5cfc"/>
        <stop offset="100%" stop-color="#48cae4"/>
      </linearGradient>`;
        svg.prepend(defs);
    }

    restorePomodoroFromStorage();
    updatePomodoroDisplay();
    renderKanban();

    // ── Autostart via URL (?autostart=true) ──
    // Disparado pelo NeuroBot da página principal
    if (new URLSearchParams(window.location.search).get("autostart") === "true") {
        history.replaceState(null, "", window.location.pathname);
        setTimeout(() => {
            startPomodoro();
            showToast("🚀 Pomodoro iniciado pelo NeuroBot! Foco total!");
        }, 600);
    }

    // Enter no kanban
    document.getElementById("kanbanInput")?.addEventListener("keydown", e => {
        if (e.key === "Enter") addKanbanTask();
    });

    // ── Wallpaper: restaurar salvo ──
    const savedWp = localStorage.getItem(WP_KEY);
    const savedOpa = parseInt(localStorage.getItem(WP_OPA_KEY) ?? "50", 10);

    if (savedWp) applyWallpaper(savedWp, savedWp.startsWith("data:"));
    applyOverlayOpacity(savedOpa);

    const slider = document.getElementById("overlayOpacity");
    if (slider) slider.value = savedOpa;

    // ── Toggle drawer ──
    document.getElementById("wpToggle")?.addEventListener("click", e => {
        e.stopPropagation();
        document.getElementById("wpDrawer")?.classList.toggle("open");
    });

    // Fecha clicando fora
    document.addEventListener("click", e => {
        const panel = document.getElementById("wpPanel");
        if (panel && !panel.contains(e.target)) {
            document.getElementById("wpDrawer")?.classList.remove("open");
        }
    });

    // ── Presets de gradiente ──
    document.querySelectorAll(".wp-preset").forEach(btn => {
        btn.addEventListener("click", e => {
            e.stopPropagation();
            const bg = btn.dataset.bg;
            applyWallpaper(bg, false);
            localStorage.setItem(WP_KEY, bg);
        });
    });

    // ── Upload de imagem ──
    document.getElementById("bgInput")?.addEventListener("change", function () {
        const file = this.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            const dataUrl = ev.target.result;
            applyWallpaper(dataUrl, true);
            try {
                localStorage.setItem(WP_KEY, dataUrl);
            } catch {
                showToast("⚠️ Imagem grande demais para salvar.");
            }
        };
        reader.readAsDataURL(file);
    });

    // ── Limpar wallpaper ──
    document.getElementById("wpClear")?.addEventListener("click", e => {
        e.stopPropagation();
        applyWallpaper(null);
        localStorage.removeItem(WP_KEY);
    });

    // ── Slider de escurecimento ──
    document.getElementById("overlayOpacity")?.addEventListener("input", function () {
        const val = parseInt(this.value, 10);
        applyOverlayOpacity(val);
        localStorage.setItem(WP_OPA_KEY, val);
    });
});

// ═══════════════════════════════════════════════
//  WALLPAPER
//  Usa <style> injetada com !important para vencer
//  qualquer background definido no style.css externo
// ═══════════════════════════════════════════════
function applyWallpaper(value, isImage = false) {
    const overlay = document.getElementById("wpOverlay");

    if (!value) {
        wpStyle.textContent = "";
        document.body.classList.remove("has-wallpaper");
        if (overlay) overlay.style.display = "none";
        document.querySelectorAll(".wp-preset").forEach(b => b.classList.remove("active"));
        return;
    }

    document.body.classList.add("has-wallpaper");

    if (isImage) {
        wpStyle.textContent = `
      body.has-wallpaper {
        background-image: url("${value}") !important;
        background-size: cover !important;
        background-position: center !important;
        background-attachment: fixed !important;
        background-repeat: no-repeat !important;
        background-color: transparent !important;
      }`;
    } else {
        wpStyle.textContent = `
      body.has-wallpaper {
        background: ${value} !important;
        background-size: cover !important;
      }`;
    }

    if (overlay) {
        overlay.style.display = "block";
    }

    document.querySelectorAll(".wp-preset").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.bg === value);
    });
}

function applyOverlayOpacity(val) {
    const overlay = document.getElementById("wpOverlay");
    if (overlay) overlay.style.background = `rgba(0,0,0,${val / 100})`;
    const label = document.getElementById("overlayVal");
    if (label) label.textContent = `${val}%`;
}

// ═══════════════════════════════════════════════
//  POMODORO
// ═══════════════════════════════════════════════
function startPomodoro() {
    if (state.pomodoro.isRunning) return;
    state.pomodoro.isRunning = true;
    state.pomodoro.interval = setInterval(tickPomodoro, 1000);
    publishPomodoroState();
}

function pausePomodoro() {
    state.pomodoro.isRunning = false;
    clearInterval(state.pomodoro.interval);
    publishPomodoroState();
}

function resetPomodoro() {
    pausePomodoro();
    const p = state.pomodoro;
    p.minutes = 25;
    p.seconds = 0;
    p.isBreak = false;
    p.totalSeconds = 25 * 60;
    p.elapsedSeconds = 0;
    publishPomodoroState();
    updatePomodoroDisplay();
}

function tickPomodoro() {
    const p = state.pomodoro;
    p.elapsedSeconds++;

    if (p.seconds > 0) {
        p.seconds--;
    } else if (p.minutes > 0) {
        p.minutes--;
        p.seconds = 59;
    } else {
        pausePomodoro();
        if (!p.isBreak) {
            state.progress.pomodorosCompleted++;
            state.progress.focusMinutes += 25;
            p.isBreak = true;
            p.minutes = 5;
            p.seconds = 0;
            p.totalSeconds = 5 * 60;
            p.elapsedSeconds = 0;
            showToast("🎉 Pomodoro completo! Pausa de 5 minutos.");
        } else {
            p.isBreak = false;
            p.minutes = 25;
            p.seconds = 0;
            p.totalSeconds = 25 * 60;
            p.elapsedSeconds = 0;
            showToast("💪 Pausa encerrada! Pronto para focar?");
        }
    }
    updatePomodoroDisplay();
}

function updatePomodoroDisplay() {
    const p = state.pomodoro;
    const m = String(p.minutes).padStart(2, "0");
    const s = String(p.seconds).padStart(2, "0");

    const display = document.getElementById("pomodoroDisplay");
    const phase = document.getElementById("pomodoroPhase");
    if (display) display.textContent = `${m}:${s}`;
    if (phase) phase.textContent = p.isBreak ? "PAUSA ☕" : "FOCO 🎯";

    const ring = document.getElementById("ringFill");
    if (ring) {
        const progress = p.elapsedSeconds / p.totalSeconds;
        ring.style.strokeDashoffset = CIRCUMFERENCE * (1 - progress);
        ring.style.stroke = p.isBreak ? "#f472b6" : "url(#ringGrad)";
    }

    const countEl = document.getElementById("pomodoroCount");
    const minutesEl = document.getElementById("focusMinutes");
    if (countEl) countEl.textContent = state.progress.pomodorosCompleted;
    if (minutesEl) minutesEl.textContent = state.progress.focusMinutes;
    publishPomodoroState();
}

// ═══════════════════════════════════════════════
//  TOAST
// ═══════════════════════════════════════════════
let toastTimeout = null;

function showToast(msg) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove("show"), 3500);
}

// ═══════════════════════════════════════════════
//  KANBAN
// ═══════════════════════════════════════════════
function loadKanban() {
    try {
        return JSON.parse(localStorage.getItem("ng_kanban")) || { todo: [], doing: [], done: [] };
    } catch {
        return { todo: [], doing: [], done: [] };
    }
}

function saveKanban() {
    localStorage.setItem("ng_kanban", JSON.stringify(state.kanban));
}

function addKanbanTask() {
    const input = document.getElementById("kanbanInput");
    const text = input?.value.trim();
    if (!text) return;
    state.kanban.todo.push({ id: Date.now(), text });
    input.value = "";
    saveKanban();
    renderKanban();
}

function deleteTask(col, id) {
    state.kanban[col] = state.kanban[col].filter(t => t.id !== id);
    saveKanban();
    renderKanban();
}

function renderKanban() {
    ["todo", "doing", "done"].forEach(col => {
        const container = document.getElementById(`cards-${col}`);
        const countEl = document.getElementById(`count-${col}`);
        if (!container) return;

        container.innerHTML = "";
        state.kanban[col].forEach(task => {
            const card = document.createElement("div");
            card.className = "task-card" + (col === "done" ? " done-card" : "");
            card.draggable = true;
            card.dataset.id = task.id;
            card.dataset.col = col;
            card.innerHTML = `
        <span class="task-text">${escapeHtml(task.text)}</span>
        <button class="task-del" onclick="deleteTask('${col}', ${task.id})" title="Remover">
          <i class="fas fa-times"></i>
        </button>`;
            card.addEventListener("dragstart", onDragStart);
            card.addEventListener("dragend", onDragEnd);
            container.appendChild(card);
        });

        if (countEl) countEl.textContent = state.kanban[col].length;
    });
}

function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Drag & Drop ──
let dragId = null, dragCol = null;

function onDragStart(e) {
    dragId = Number(e.currentTarget.dataset.id);
    dragCol = e.currentTarget.dataset.col;
    e.currentTarget.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
}

function onDragEnd(e) {
    e.currentTarget.classList.remove("dragging");
    document.querySelectorAll(".kanban-col").forEach(c => c.classList.remove("drag-over"));
}

function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    e.currentTarget.classList.add("drag-over");
}

function onDrop(e, targetCol) {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");
    if (!dragId || dragCol === targetCol) return;

    const task = state.kanban[dragCol].find(t => t.id === dragId);
    if (!task) return;

    state.kanban[dragCol] = state.kanban[dragCol].filter(t => t.id !== dragId);
    state.kanban[targetCol].push(task);
    dragId = null; dragCol = null;
    saveKanban();
    renderKanban();
}

// ═══════════════════════════════════════════════
//  MODO MÚSICA — Web Audio API (sem arquivos externos)
// ═══════════════════════════════════════════════
let audioCtx = null;
let activeSound = null;   // nome do som ativo
let activeNodes = [];     // nós de áudio ativos (para parar)
let musicVolume = 0.4;

function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

// Cria um nó de ganho master conectado à saída
function createMaster(ctx) {
    const master = ctx.createGain();
    master.gain.value = musicVolume;
    master.connect(ctx.destination);
    return master;
}

// Gera ruído branco/rosa filtrado (base para chuva, fogo, etc.)
function makeNoise(ctx, master, color = 'white') {
    const bufSize = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufSize; i++) {
        const w = Math.random() * 2 - 1;
        if (color === 'pink') {
            b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
            b2 = 0.96900 * b2 + w * 0.1538520; b3 = 0.86650 * b3 + w * 0.3104856;
            b4 = 0.55000 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.0168980;
            data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
        } else {
            data[i] = w;
        }
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    return src;
}

// Oscilador simples
function makeOsc(ctx, freq, type = 'sine') {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    return osc;
}

// ── Geradores de som ──────────────────────────────
const SOUND_GENERATORS = {

    rain(ctx, master) {
        const noise = makeNoise(ctx, master, 'pink');
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1400;
        filter.Q.value = 0.8;
        const gain = ctx.createGain();
        gain.gain.value = 1.2;
        noise.connect(filter); filter.connect(gain); gain.connect(master);
        noise.start();
        return [noise, filter, gain];
    },

    cafe(ctx, master) {
        const nodes = [];
        // Murmúrio de fundo (ruído rosa grave)
        const noise = makeNoise(ctx, master, 'pink');
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = 600;
        const gNoise = ctx.createGain(); gNoise.gain.value = 0.6;
        noise.connect(filter); filter.connect(gNoise); gNoise.connect(master);
        noise.start(); nodes.push(noise, filter, gNoise);
        // Tique de xícara ocasional (oscilador curto)
        function tickle() {
            const o = makeOsc(ctx, 900 + Math.random() * 400, 'sine');
            const g = ctx.createGain();
            g.gain.setValueAtTime(0, ctx.currentTime);
            g.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.01);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
            o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + 0.2);
            const id = setTimeout(tickle, 800 + Math.random() * 3000);
            nodes.push({ stop: () => clearTimeout(id) });
        }
        tickle();
        return nodes;
    },

    forest(ctx, master) {
        const nodes = [];
        // Vento (ruído branco filtrado)
        const wind = makeNoise(ctx, master, 'white');
        const wFilt = ctx.createBiquadFilter();
        wFilt.type = 'bandpass'; wFilt.frequency.value = 800; wFilt.Q.value = 0.5;
        const wGain = ctx.createGain(); wGain.gain.value = 0.3;
        wind.connect(wFilt); wFilt.connect(wGain); wGain.connect(master);
        wind.start(); nodes.push(wind, wFilt, wGain);
        // Pássaros (osciladores chirp)
        function chirp() {
            const freq = 2200 + Math.random() * 1200;
            const o = makeOsc(ctx, freq, 'sine');
            const g = ctx.createGain();
            g.gain.setValueAtTime(0, ctx.currentTime);
            g.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.05);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            o.frequency.linearRampToValueAtTime(freq + 400, ctx.currentTime + 0.15);
            o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + 0.35);
            const id = setTimeout(chirp, 600 + Math.random() * 3000);
            nodes.push({ stop: () => clearTimeout(id) });
        }
        chirp();
        return nodes;
    },

    waves(ctx, master) {
        const noise = makeNoise(ctx, master, 'pink');
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = 700;
        const lfo = makeOsc(ctx, 0.15, 'sine');
        const lfoG = ctx.createGain(); lfoG.gain.value = 200;
        lfo.connect(lfoG); lfoG.connect(filter.frequency);
        const gain = ctx.createGain(); gain.gain.value = 1.4;
        noise.connect(filter); filter.connect(gain); gain.connect(master);
        noise.start(); lfo.start();
        return [noise, filter, lfo, lfoG, gain];
    },

    lofi(ctx, master) {
        const nodes = [];
        // Vinil crackle (ruído branco muito suave)
        const crack = makeNoise(ctx, master, 'white');
        const cFilt = ctx.createBiquadFilter();
        cFilt.type = 'highpass'; cFilt.frequency.value = 4000;
        const cGain = ctx.createGain(); cGain.gain.value = 0.08;
        crack.connect(cFilt); cFilt.connect(cGain); cGain.connect(master);
        crack.start(); nodes.push(crack, cFilt, cGain);
        // Notas graves de piano (osciladores)
        const scale = [261, 294, 329, 349, 392, 440, 494];
        function note() {
            const freq = scale[Math.floor(Math.random() * scale.length)];
            const o = makeOsc(ctx, freq / 2, 'triangle');
            const g = ctx.createGain();
            g.gain.setValueAtTime(0, ctx.currentTime);
            g.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.04);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
            o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + 1.3);
            const id = setTimeout(note, 400 + Math.random() * 1200);
            nodes.push({ stop: () => clearTimeout(id) });
        }
        note();
        return nodes;
    },

    fire(ctx, master) {
        const noise = makeNoise(ctx, master, 'pink');
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = 500;
        // LFO para crepitar
        const lfo = makeOsc(ctx, 3 + Math.random() * 2, 'sine');
        const lfoG = ctx.createGain(); lfoG.gain.value = 150;
        lfo.connect(lfoG); lfoG.connect(filter.frequency);
        const gain = ctx.createGain(); gain.gain.value = 1.6;
        noise.connect(filter); filter.connect(gain); gain.connect(master);
        noise.start(); lfo.start();
        return [noise, filter, lfo, lfoG, gain];
    },
};

function stopAllSounds() {
    activeNodes.forEach(n => {
        try {
            if (n.stop) n.stop();
            if (n.disconnect) n.disconnect();
        } catch { }
    });
    activeNodes = [];
}

function toggleSound(name) {
    const ctx = getAudioCtx();
    const btn = document.querySelector(`.music-btn[data-sound="${name}"]`);

    if (activeSound === name) {
        // Desliga
        stopAllSounds();
        activeSound = null;
        document.querySelectorAll('.music-btn').forEach(b => b.classList.remove('active'));
        return;
    }

    // Para o som anterior
    stopAllSounds();
    document.querySelectorAll('.music-btn').forEach(b => b.classList.remove('active'));

    // Resume contexto (política de autoplay)
    if (ctx.state === 'suspended') ctx.resume();

    const master = createMaster(ctx);
    activeNodes = SOUND_GENERATORS[name](ctx, master);
    activeNodes.push(master);
    activeSound = name;
    if (btn) btn.classList.add('active');
}

// Slider de volume
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("musicVolume")?.addEventListener("input", function () {
        musicVolume = this.value / 100;
        // Atualiza o gain do master em tempo real
        activeNodes.forEach(n => {
            if (n.gain && n === activeNodes[activeNodes.length - 1]) {
                n.gain.value = musicVolume;
            }
        });
    });
});

// ═══════════════════════════════════════════════
//  KANBAN POPUP
// ═══════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
    const fab = document.getElementById("kbFab");
    const drawer = document.getElementById("kbDrawer");
    const close = document.getElementById("kbClose");

    fab?.addEventListener("click", e => {
        e.stopPropagation();
        drawer?.classList.toggle("open");
    });

    close?.addEventListener("click", () => drawer?.classList.remove("open"));

    document.addEventListener("click", e => {
        const popup = document.getElementById("kbPopup");
        if (popup && !popup.contains(e.target)) drawer?.classList.remove("open");
    });

    document.getElementById("kbPopupInput")?.addEventListener("keydown", e => {
        if (e.key === "Enter") addKanbanTaskPopup();
    });

    renderKanbanPopup();
});

function addKanbanTaskPopup() {
    const input = document.getElementById("kbPopupInput");
    const text = input?.value.trim();
    if (!text) return;
    state.kanban.todo.push({ id: Date.now(), text });
    input.value = "";
    saveKanban();
    renderKanban();       // atualiza painel principal
    renderKanbanPopup();  // atualiza popup
}

function renderKanbanPopup() {
    ["todo", "doing", "done"].forEach(col => {
        const container = document.getElementById(`kbp-cards-${col}`);
        const countEl = document.getElementById(`kbp-count-${col}`);
        if (!container) return;

        container.innerHTML = "";
        state.kanban[col].forEach(task => {
            const card = document.createElement("div");
            card.className = "task-card" + (col === "done" ? " done-card" : "");
            card.draggable = true;
            card.dataset.id = task.id;
            card.dataset.col = col;
            card.innerHTML = `
        <span class="task-text">${escapeHtml(task.text)}</span>
        <button class="task-del" onclick="deleteTaskAndSync('${col}', ${task.id})" title="Remover">
          <i class="fas fa-times"></i>
        </button>`;
            card.addEventListener("dragstart", onDragStart);
            card.addEventListener("dragend", onDragEnd);
            container.appendChild(card);
        });

        if (countEl) countEl.textContent = state.kanban[col].length;
    });

    // Atualiza badge
    const pending = state.kanban.todo.length + state.kanban.doing.length;
    const badge = document.getElementById("kbBadge");
    if (badge) {
        badge.textContent = pending;
        badge.classList.toggle("visible", pending > 0);
    }
}

// Deleta e sincroniza ambos os kanbans
function deleteTaskAndSync(col, id) {
    state.kanban[col] = state.kanban[col].filter(t => t.id !== id);
    saveKanban();
    renderKanban();
    renderKanbanPopup();
}

// Sobrescreve renderKanban para também atualizar o popup
const _origRenderKanban = renderKanban;
// Patcheia após carregamento para garantir que renderKanbanPopup exista
setTimeout(() => {
    const orig = renderKanban;
    window.renderKanban = function () {
        orig();
        if (typeof renderKanbanPopup === 'function') renderKanbanPopup();
    };
}, 0);

// ═══════════════════════════════════════════════
//  PLAYER YOUTUBE + BUSCA POR LINK
// ═══════════════════════════════════════════════
let ytActive = null;

// ── Utilitário: extrai ID e tipo a partir de qualquer link ──
function parseYoutubeLink(raw) {
    const url = raw.trim();

    // Vídeo: youtube.com/watch?v=ID  ou  youtu.be/ID
    const vMatch = url.match(/(?:youtube\.com\/watch[^#]*[?&]v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (vMatch) return { type: 'video', id: vMatch[1] };

    // Playlist: youtube.com/playlist?list=ID
    const pMatch = url.match(/[?&]list=([A-Za-z0-9_-]+)/);
    if (pMatch) return { type: 'playlist', id: pMatch[1] };

    // ID curto direto (11 chars) — aceita paste do próprio embed ou só o ID
    const idMatch = url.match(/^[A-Za-z0-9_-]{11}$/);
    if (idMatch) return { type: 'video', id: url };

    return null;
}

function buildEmbedUrl(type, id) {
    const base = 'https://www.youtube.com/embed/';
    const params = 'autoplay=1&rel=0&modestbranding=1';
    if (type === 'playlist') return `${base}videoseries?list=${id}&${params}&loop=1`;
    return `${base}${id}?${params}`;
}

function loadPlayer(type, id, label) {
    ytActive = id;

    const iframe = document.getElementById("ytIframe");
    const wrap = document.getElementById("ytPlayerWrap");
    const nowLabel = document.getElementById("ytNowLabel");
    const tip = document.getElementById("ytSpotifyTip");

    if (iframe) iframe.src = buildEmbedUrl(type, id);
    if (wrap) wrap.classList.add("visible");
    if (nowLabel) nowLabel.textContent = label || id;
    if (tip) tip.style.display = "none";

    document.querySelectorAll(".yt-pl-btn").forEach(b =>
        b.classList.toggle("active", b.dataset.id === id)
    );
}

// ── Botão de busca por link ──
function loadYoutubeLink() {
    const input = document.getElementById("ytLinkInput");
    const raw = input?.value.trim() ?? "";
    const tip = document.getElementById("ytSpotifyTip");

    if (!raw) return;

    // Detecta Spotify (não suporta embed — abre nova aba)
    if (raw.includes("spotify.com")) {
        if (tip) {
            const link = document.getElementById("spotifyLink");
            if (link) link.href = raw;
            tip.style.display = "flex";
        }
        return;
    }

    // Detecta YouTube embed já colado (<iframe ...>)
    const iframeSrc = raw.match(/src="([^"]+youtube[^"]+)"/);
    if (iframeSrc) {
        // Extrai o ID do src do iframe
        const parsed = parseYoutubeLink(iframeSrc[1]);
        if (parsed) { loadPlayer(parsed.type, parsed.id, "Link personalizado"); input.value = ""; return; }
    }

    const parsed = parseYoutubeLink(raw);
    if (parsed) {
        loadPlayer(parsed.type, parsed.id, "Link personalizado");
        input.value = "";
    } else {
        // Link inválido — pisca o input
        input.style.borderColor = "#ef4444";
        setTimeout(() => input.style.borderColor = "", 1200);
    }
}

// ── Playlists curadas ──
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".yt-pl-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = btn.dataset.id;
            const type = btn.dataset.type || "playlist";
            const label = btn.dataset.label;
            if (ytActive === id) { stopYoutube(); return; }
            loadPlayer(type, id, label);
        });
    });

    // Enter no campo de busca
    document.getElementById("ytLinkInput")?.addEventListener("keydown", e => {
        if (e.key === "Enter") loadYoutubeLink();
    });
});

function stopYoutube() {
    ytActive = null;
    const iframe = document.getElementById("ytIframe");
    const wrap = document.getElementById("ytPlayerWrap");
    const nowLabel = document.getElementById("ytNowLabel");
    const tip = document.getElementById("ytSpotifyTip");
    if (iframe) iframe.src = "";
    if (wrap) wrap.classList.remove("visible");
    if (nowLabel) nowLabel.textContent = "—";
    if (tip) tip.style.display = "none";
    document.querySelectorAll(".yt-pl-btn").forEach(b => b.classList.remove("active"));
}