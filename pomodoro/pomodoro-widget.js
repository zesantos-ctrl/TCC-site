/* ================================================
   POMODORO WIDGET FLUTUANTE — pomodoro-widget.js
   - Só aparece após o pomodoro ter sido iniciado
   - Lê o estado do localStorage (publicado pelo pomodoro.js)
   - Na página do pomodoro apenas escuta, não escreve
   - Nas outras páginas pode pausar/continuar/resetar
   ================================================ */

(function () {
    'use strict';

    const CIRC = 2 * Math.PI * 48;  // raio 48 no SVG do widget
    const STATE_KEY = 'ng_pw_state';
    const IS_POMO_PAGE = window.location.pathname.includes('pomodoro.html');

    // ── Lê estado do localStorage ──────────────────
    function loadState() {
        try { return JSON.parse(localStorage.getItem(STATE_KEY)); } catch { return null; }
    }

    // ── Salva (só usado fora da página do pomodoro) ─
    function saveState(s) {
        localStorage.setItem(STATE_KEY, JSON.stringify(s));
    }

    // ── Estado local (espelho do localStorage) ──────
    let pw = null;

    // ── Injeta HTML ─────────────────────────────────
    function inject() {
        if (document.getElementById('pwFab')) return; // já injetado
        const wrap = document.createElement('div');
        wrap.innerHTML = `
      <button class="pw-fab" id="pwFab" title="Pomodoro">
        <i class="fas fa-clock"></i>
        <span class="pw-fab-time" id="pwFabTime"></span>
      </button>
      <div class="pw-popup" id="pwPopup">
        <div class="pw-header">
          <div class="pw-header-title"><i class="fas fa-clock"></i> Pomodoro</div>
          <span class="pw-phase" id="pwPhase">FOCO 🎯</span>
        </div>
        <div class="pw-ring-wrap">
          <svg class="pw-svg" viewBox="0 0 110 110">
            <defs>
              <linearGradient id="pwGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stop-color="#7c5cfc"/>
                <stop offset="100%" stop-color="#48cae4"/>
              </linearGradient>
            </defs>
            <circle class="pw-ring-bg"   cx="55" cy="55" r="48"/>
            <circle class="pw-ring-fill" id="pwRingFill" cx="55" cy="55" r="48"/>
          </svg>
          <div class="pw-ring-center">
            <span class="pw-time"       id="pwTime">25:00</span>
            <span class="pw-label-text" id="pwLabelText">FOCO</span>
          </div>
        </div>
        <div class="pw-controls" id="pwControls">
          <button class="pw-btn primary" id="pwBtnPlay"  title="Iniciar/Pausar"><i class="fas fa-play" id="pwPlayIcon"></i></button>
          <button class="pw-btn"         id="pwBtnReset" title="Resetar"><i class="fas fa-stop"></i></button>
        </div>
        <div class="pw-stats">
          <div class="pw-stat">
            <span class="pw-stat-num" id="pwCount">0</span>
            <span class="pw-stat-lbl">Pomodoros</span>
          </div>
          <div class="pw-stat">
            <span class="pw-stat-num" id="pwMinutes">0</span>
            <span class="pw-stat-lbl">min de foco</span>
          </div>
        </div>
        <div class="pw-fullpage" id="pwFullpageRow">
          <a href="" id="pwFullLink"><i class="fas fa-external-link-alt"></i> Abrir página completa</a>
        </div>
      </div>`;
        document.body.appendChild(wrap);

        // Na página do pomodoro: esconde link e controls (já existem na página)
        if (IS_POMO_PAGE) {
            const row = document.getElementById('pwFullpageRow');
            if (row) row.style.display = 'none';
        }

        // Link para página completa com caminho relativo correto
        const link = document.getElementById('pwFullLink');
        if (link) {
            const depth = window.location.pathname.split('/').filter(Boolean).length;
            link.href = depth <= 1 ? './pomodoro/pomodoro.html'
                : depth === 2 ? '../pomodoro/pomodoro.html'
                    : '../../pomodoro/pomodoro.html';
        }

        bindEvents();
    }

    // ── Calcula segundos restantes ──────────────────
    function calcRemaining(s) {
        if (!s) return 25 * 60;
        if (s.isRunning && s.startedAt) {
            const elapsed = Math.floor((Date.now() - s.startedAt) / 1000);
            return Math.max(0, s.pausedRemaining - elapsed);
        }
        return s.pausedRemaining ?? 25 * 60;
    }

    // ── Renderiza o widget com dados do estado ──────
    function render(s) {
        if (!s) return;
        const rem = calcRemaining(s);
        const m = String(Math.floor(rem / 60)).padStart(2, '0');
        const sec = String(rem % 60).padStart(2, '0');
        const disp = `${m}:${sec}`;

        const fab = document.getElementById('pwFab');
        const fabTime = document.getElementById('pwFabTime');
        const timeEl = document.getElementById('pwTime');
        const phaseEl = document.getElementById('pwPhase');
        const labelEl = document.getElementById('pwLabelText');
        const ringFill = document.getElementById('pwRingFill');
        const playIcon = document.getElementById('pwPlayIcon');
        const countEl = document.getElementById('pwCount');
        const minEl = document.getElementById('pwMinutes');

        if (timeEl) timeEl.textContent = disp;
        if (fabTime) { fabTime.textContent = disp; fabTime.classList.toggle('visible', s.isRunning); }
        if (fab) fab.classList.toggle('running', s.isRunning);
        if (phaseEl) phaseEl.textContent = s.isBreak ? 'PAUSA ☕' : 'FOCO 🎯';
        if (labelEl) labelEl.textContent = s.isBreak ? 'PAUSA' : 'FOCO';
        if (playIcon) playIcon.className = s.isRunning ? 'fas fa-pause' : 'fas fa-play';
        if (countEl) countEl.textContent = s.pomodorosCompleted || 0;
        if (minEl) minEl.textContent = s.focusMinutes || 0;

        if (ringFill) {
            const total = s.totalSeconds || 25 * 60;
            const progress = 1 - (rem / total);
            ringFill.style.strokeDashoffset = CIRC * (1 - progress);
            ringFill.style.stroke = s.isBreak ? '#f472b6' : 'url(#pwGrad)';
        }
    }

    // ── Mostra/esconde o FAB conforme everStarted ───
    function updateVisibility(s) {
        const fab = document.getElementById('pwFab');
        const popup = document.getElementById('pwPopup');
        if (!fab) return;
        const show = s && s.everStarted;
        fab.style.display = show ? 'flex' : 'none';
        // popup nunca fica visível se não deve ser exibido
        if (!show && popup) popup.classList.remove('open');
    }

    // ── Sincroniza com o localStorage ──────────────
    function sync() {
        const s = loadState();
        pw = s;
        updateVisibility(s);
        if (s && s.everStarted) render(s);
    }

    // ── Ações (só fora da página do pomodoro) ───────
    function actionPlayPause() {
        const s = loadState();
        if (!s) return;
        if (s.isRunning) {
            const rem = calcRemaining(s);
            s.isRunning = false;
            s.pausedRemaining = rem;
            s.startedAt = null;
        } else {
            s.isRunning = true;
            s.startedAt = Date.now();
        }
        saveState(s);
        render(s);
    }

    function actionReset() {
        const s = loadState();
        if (!s) return;
        s.isRunning = false;
        s.isBreak = false;
        s.totalSeconds = 25 * 60;
        s.pausedRemaining = 25 * 60;
        s.startedAt = null;
        s.elapsedSeconds = 0;
        // Mantém everStarted para não sumir o widget
        saveState(s);
        render(s);
        updateVisibility(s);
    }

    // ── Bind eventos ────────────────────────────────
    function bindEvents() {
        document.getElementById('pwFab')?.addEventListener('click', e => {
            e.stopPropagation();
            document.getElementById('pwPopup')?.classList.toggle('open');
        });

        // Na página do pomodoro os botões delegam para as funções da página
        if (IS_POMO_PAGE) {
            document.getElementById('pwBtnPlay')?.addEventListener('click', () => {
                if (typeof startPomodoro !== 'undefined' && typeof pausePomodoro !== 'undefined') {
                    const s = loadState();
                    s && s.isRunning ? pausePomodoro() : startPomodoro();
                }
            });
            document.getElementById('pwBtnReset')?.addEventListener('click', () => {
                if (typeof resetPomodoro !== 'undefined') resetPomodoro();
            });
        } else {
            document.getElementById('pwBtnPlay')?.addEventListener('click', actionPlayPause);
            document.getElementById('pwBtnReset')?.addEventListener('click', actionReset);
        }

        // Fecha clicando fora
        document.addEventListener('click', e => {
            const popup = document.getElementById('pwPopup');
            const fab = document.getElementById('pwFab');
            if (popup && fab && !popup.contains(e.target) && !fab.contains(e.target)) {
                popup.classList.remove('open');
            }
        });
    }

    // ── Init ────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        inject();

        // Esconde o FAB por padrão até confirmar que everStarted=true
        const fab = document.getElementById('pwFab');
        if (fab) fab.style.display = 'none';

        // Primeira leitura
        sync();

        // Atualiza a cada 500ms (relógio do widget)
        setInterval(sync, 500);

        // Sync imediato quando outra aba/janela muda o storage
        window.addEventListener('storage', e => {
            if (e.key === STATE_KEY) sync();
        });
    });

})();