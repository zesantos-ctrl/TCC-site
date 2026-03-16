/* ====================================================
   NEUROGAME — script.js  (versão melhorada)
   ==================================================== */

// ── Estado Global ─────────────────────────────────────
const state = {
  isNeuroBotOpen: false,
  authMode: 'login',
  kanbanTasks: {
    todo:  JSON.parse(localStorage.getItem('neuroKanbanTodo'))  || [],
    doing: JSON.parse(localStorage.getItem('neuroKanbanDoing')) || [],
    done:  JSON.parse(localStorage.getItem('neuroKanbanDone'))  || []
  },
  progress: JSON.parse(localStorage.getItem('neuroProgress')) || {
    gamesPlayed: 0,
    pomodorosCompleted: 0,
    tasksCompleted: 0,
    achievements: []
  },
  pomodoro: {
    minutes: 25,
    seconds: 0,
    isRunning: false,
    isBreak: false,
    interval: null
  }
};

// ── Inicialização ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  applySavedTheme();
  renderKanbanBoard();
  updatePomodoroDisplay();
  updateProgressDisplay();
  updateNeuroBotBadge();

  document.getElementById('hamburger').addEventListener('click', toggleMobileMenu);
  document.getElementById('neuroBotInput').addEventListener('keypress', e => {
    if (e.key === 'Enter') sendNeuroBotMessage();
  });

  // Auth form listeners
  ['authEmail','authPassword','authName','authConfirmPassword'].forEach(id => {
    document.getElementById(id).addEventListener('input', validateAuthForm);
  });
  document.getElementById('authSubmitButton').addEventListener('click', performAuth);
  document.getElementById('toggleAuthLink').addEventListener('click', e => {
    e.preventDefault(); toggleAuthMode();
  });
  document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);
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

// Fechar clicando fora
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
  document.getElementById('theme-icon-sun').style.display  = isDark ? 'none'  : 'block';
}

function applySavedTheme() {
  const saved = localStorage.getItem('siteTheme') || 'dark';
  document.body.classList.add(saved === 'light' ? 'light-mode' : 'dark-mode');
  document.getElementById('theme-icon-moon').style.display = saved === 'light' ? 'none'  : 'block';
  document.getElementById('theme-icon-sun').style.display  = saved === 'light' ? 'block' : 'none';
}

// ── NeuroBot ───────────────────────────────────────────
const botKB = {
  'o que é tdah': 'TDAH é um transtorno neurobiológico que afeta concentração, controle de impulsos e atividade. É muito comum em crianças e adolescentes. 🧠',
  'sintomas': 'Principais sintomas: dificuldade de concentração, hiperatividade, impulsividade, desorganização e esquecimento. Cada pessoa é única!',
  'como lidar': 'Estratégias eficazes: rotinas, técnica Pomodoro, jogos cognitivos, organização visual e apoio profissional. 💪',
  'jogo': 'Nossos jogos cognitivos ajudam a treinar atenção, memória e funções executivas. Abra a seção Jogos e escolha um! 🎮',
  'pomodoro': 'A técnica Pomodoro divide o trabalho em blocos: 25 min de foco + 5 min de pausa. Ótimo para TDAH! ⏰',
  'organização': 'Use o Kanban para visualizar suas tarefas. Divida tudo em pequenos passos e celebre cada conquista! 📋',
  'dica': 'Dica de ouro: faça UMA tarefa por vez. Elimine distrações e use alarmes para não perder o tempo. 🎯',
  'oi': 'Olá! 👋 Como posso ajudar você hoje?',
  'olá': 'Oi! Estou aqui para te apoiar. O que você precisa? 😊',
  'obrigado': 'De nada! Lembre-se: pequenos passos levam a grandes conquistas! 🌟',
  'tchau': 'Até logo! Continue praticando. Você está indo muito bem! 🚀'
};

function openNeuroBot() {
  state.isNeuroBotOpen = true;
  document.getElementById('neuroBotToggle').style.display = 'none';
  document.getElementById('neuroBotContainer').style.display = 'flex';
  document.getElementById('neuroBotBadge').style.display = 'none';
  setTimeout(() => document.getElementById('neuroBotInput').focus(), 300);
}
function closeNeuroBot() {
  state.isNeuroBotOpen = false;
  document.getElementById('neuroBotContainer').style.display = 'none';
  document.getElementById('neuroBotToggle').style.display = 'flex';
}
function toggleNeuroBot() {
  state.isNeuroBotOpen ? closeNeuroBot() : openNeuroBot();
}

function sendNeuroBotMessage() {
  const input = document.getElementById('neuroBotInput');
  const msg = input.value.trim();
  if (!msg) return;
  addBotMsg(msg, 'user');
  input.value = '';
  setTimeout(() => addBotMsg(processBotMsg(msg), 'bot'), 500);
}

function sendQuickMessage(msg) {
  addBotMsg(msg, 'user');
  setTimeout(() => addBotMsg(processQuick(msg), 'bot'), 500);
}

function addBotMsg(content, sender) {
  const container = document.getElementById('neuroBotMessages');
  const div = document.createElement('div');
  div.className = `message ${sender}-message`;
  div.innerHTML = `
    <div class="message-avatar"><i class="fas fa-${sender === 'bot' ? 'robot' : 'user'}"></i></div>
    <div class="message-content"><p>${content}</p></div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function processBotMsg(msg) {
  const lower = msg.toLowerCase();
  for (const [key, val] of Object.entries(botKB)) {
    if (lower.includes(key)) return val;
  }
  if (lower.includes('tarefa') || lower.includes('organizar')) { openKanban(); return '📋 Abrindo o Kanban para você!'; }
  if (lower.includes('progresso') || lower.includes('conquista')) { openProgress(); return '📊 Aqui está seu progresso!'; }
  const fallbacks = [
    'Para TDAH, recomendo começar com pequenos passos e rotinas visuais. Posso ajudar com mais detalhes! 🎯',
    'Quer tentar algum jogo cognitivo? São ótimos para treinar foco e memória! 🧠',
    'Organização visual é fundamental. Que tal usar o Kanban para estruturar suas tarefas? 📝'
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

function processQuick(action) {
  const map = {
    'Sugerir jogo': () => {
      const jogos = ['Jogo da Memória', 'Encontre a Palavra', 'Organize a Rotina', 'Sequência Lógica', 'Jogo de Atenção'];
      return `🎮 Recomendo: "${jogos[Math.floor(Math.random() * jogos.length)]}"! Vai para a seção Jogos e divirta-se!`;
    },
    'Iniciar Pomodoro': () => { startPomodoro(); return '⏰ Pomodoro iniciado! 25 minutos de foco total. Você consegue! 💪'; },
    'Dicas TDAH': () => { openTips(); return '💡 Abrindo dicas para TDAH!'; }
  };
  return (map[action] || (() => 'Como posso te ajudar? 🌟'))();
}

// ── Pomodoro ───────────────────────────────────────────
function startPomodoro() {
  if (state.pomodoro.isRunning) return;
  state.pomodoro.isRunning = true;
  state.pomodoro.interval = setInterval(tickPomodoro, 1000);
  updatePomodoroDisplay();
}
function pausePomodoro() {
  state.pomodoro.isRunning = false;
  clearInterval(state.pomodoro.interval);
  updatePomodoroDisplay();
}
function resetPomodoro() {
  pausePomodoro();
  state.pomodoro.minutes = 25;
  state.pomodoro.seconds = 0;
  state.pomodoro.isBreak = false;
  updatePomodoroDisplay();
}
function tickPomodoro() {
  const p = state.pomodoro;
  if (p.seconds > 0) { p.seconds--; }
  else if (p.minutes > 0) { p.minutes--; p.seconds = 59; }
  else {
    // Ciclo completo
    p.isRunning = false;
    clearInterval(p.interval);
    if (!p.isBreak) {
      state.progress.pomodorosCompleted++;
      saveProgress();
      checkAchievements();
      p.isBreak = true;
      p.minutes = 5; p.seconds = 0;
      showToast('🎉 Pomodoro completo! Pausa de 5 minutos.');
    } else {
      p.isBreak = false;
      p.minutes = 25; p.seconds = 0;
      showToast('💪 Pausa encerrada! Pronto para focar?');
    }
  }
  updatePomodoroDisplay();
}
function updatePomodoroDisplay() {
  const p = state.pomodoro;
  const m = String(p.minutes).padStart(2, '0');
  const s = String(p.seconds).padStart(2, '0');
  const display = document.getElementById('pomodoroDisplay');
  const phase   = document.getElementById('pomodoroPhase');
  if (display) display.textContent = `${m}:${s}`;
  if (phase)   phase.textContent = p.isBreak ? 'Pausa ☕' : 'Foco 🎯';
}

// ── Kanban ─────────────────────────────────────────────
function openKanban() { openModal('kanbanModal'); renderKanbanBoard(); }

function addKanbanTask(col) {
  const input = document.getElementById('newTaskInput');
  const text = input.value.trim();
  if (!text) return;
  state.kanbanTasks[col].push({ id: Date.now(), text });
  saveKanban(col);
  input.value = '';
  renderKanbanBoard();
  updateNeuroBotBadge();
}

function deleteKanbanTask(col, id) {
  state.kanbanTasks[col] = state.kanbanTasks[col].filter(t => t.id !== id);
  saveKanban(col);
  renderKanbanBoard();
  updateNeuroBotBadge();
}

function saveKanban(col) {
  const key = `neuroKanban${col.charAt(0).toUpperCase() + col.slice(1)}`;
  localStorage.setItem(key, JSON.stringify(state.kanbanTasks[col]));
}

function renderKanbanBoard() {
  ['todo','doing','done'].forEach(col => {
    const container = document.getElementById(`${col}Tasks`);
    if (!container) return;
    container.innerHTML = '';
    state.kanbanTasks[col].forEach(task => {
      const div = document.createElement('div');
      div.className = 'kanban-task';
      div.draggable = true;
      div.dataset.taskId = task.id;
      div.dataset.col = col;
      div.innerHTML = `
        <span>${task.text}</span>
        <button class="kanban-task-del" onclick="deleteKanbanTask('${col}', ${task.id})" title="Remover">×</button>
      `;
      div.addEventListener('dragstart', e => {
        e.dataTransfer.setData('taskId', task.id);
        e.dataTransfer.setData('fromCol', col);
      });
      container.appendChild(div);
    });
    // Drop zone on the column container
    container.addEventListener('dragover', e => e.preventDefault());
    container.addEventListener('drop', e => {
      e.preventDefault();
      const taskId = parseInt(e.dataTransfer.getData('taskId'));
      const fromCol = e.dataTransfer.getData('fromCol');
      if (fromCol !== col) moveKanbanTask(taskId, fromCol, col);
    });
  });
}

function moveKanbanTask(id, from, to) {
  const idx = state.kanbanTasks[from].findIndex(t => t.id === id);
  if (idx === -1) return;
  const [task] = state.kanbanTasks[from].splice(idx, 1);
  state.kanbanTasks[to].push(task);
  saveKanban(from); saveKanban(to);
  if (to === 'done') {
    state.progress.tasksCompleted++;
    saveProgress();
    checkAchievements();
  }
  renderKanbanBoard();
  updateNeuroBotBadge();
}

function updateNeuroBotBadge() {
  const pending = state.kanbanTasks.todo.length + state.kanbanTasks.doing.length;
  const badge = document.getElementById('neuroBotBadge');
  if (!badge) return;
  badge.textContent = pending;
  badge.style.display = pending > 0 ? 'flex' : 'none';
}

// ── Progresso ──────────────────────────────────────────
function saveProgress() {
  localStorage.setItem('neuroProgress', JSON.stringify(state.progress));
}

function updateProgressDisplay() {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('gamesPlayed', state.progress.gamesPlayed);
  set('pomodorosCompleted', state.progress.pomodorosCompleted);
  set('tasksCompleted', state.progress.tasksCompleted);
  renderAchievements();
}

const ACHIEVEMENTS = [
  { id: 'first_game',     name: 'Primeiro Jogo',    desc: 'Jogue seu primeiro jogo',        icon: 'fas fa-medal',  check: () => state.progress.gamesPlayed >= 1 },
  { id: 'five_games',     name: 'Gamer Cognitivo',   desc: 'Jogue 5 jogos',                  icon: 'fas fa-gamepad',check: () => state.progress.gamesPlayed >= 5 },
  { id: 'pomodoro_3',     name: 'Foco Total',        desc: 'Complete 3 Pomodoros',           icon: 'fas fa-fire',   check: () => state.progress.pomodorosCompleted >= 3 },
  { id: 'tasks_10',       name: 'Organizador',       desc: 'Complete 10 tarefas',            icon: 'fas fa-star',   check: () => state.progress.tasksCompleted >= 10 }
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

function openTips()     { openModal('tipsModal'); }
function openProgress() { openModal('progressModal'); updateProgressDisplay(); }

// ── Toast / Notificação ────────────────────────────────
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
  ['authEmail','authPassword','authName','authConfirmPassword'].forEach(id => {
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
  document.getElementById('authModalTitle').textContent  = isLogin ? '🔐 Login' : '📝 Cadastro';
  document.getElementById('authSubmitButton').textContent = isLogin ? 'Entrar' : 'Cadastrar';
  document.getElementById('toggleAuthText').textContent  = isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?';
  document.getElementById('toggleAuthLink').textContent  = isLogin ? 'Cadastre-se' : 'Faça login';
  document.getElementById('authNameGroup').style.display    = isLogin ? 'none' : 'flex';
  document.getElementById('authConfirmGroup').style.display = isLogin ? 'none' : 'flex';
  validateAuthForm();
}

function validateAuthForm() {
  const email    = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value.trim();
  const name     = document.getElementById('authName').value.trim();
  const confirm  = document.getElementById('authConfirmPassword').value.trim();
  const msg      = document.getElementById('authMessage');
  const btn      = document.getElementById('authSubmitButton');

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

function performAuth() {
  const email    = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value.trim();
  const name     = document.getElementById('authName').value.trim();
  const msg      = document.getElementById('authMessage');

  const testAccounts = ['adulto@teste.com', 'crianca@teste.com'];

  if (state.authMode === 'login') {
    if (testAccounts.includes(email) && password === 'senha123') {
      msg.textContent = '✅ Login realizado! Bem-vindo(a)!';
      msg.style.color = '#16a34a';
      setTimeout(() => closeModal('loginModal'), 1500);
    } else {
      msg.textContent = '❌ Email ou senha incorretos.';
      msg.style.color = '#dc2626';
    }
  } else {
    if (testAccounts.includes(email)) {
      msg.textContent = '❌ Este email já está em uso.';
      msg.style.color = '#dc2626';
    } else {
      msg.textContent = `✅ Cadastro de ${name} realizado! Faça o login.`;
      msg.style.color = '#16a34a';
      setTimeout(() => { toggleAuthMode(); document.getElementById('authEmail').value = email; validateAuthForm(); }, 1500);
    }
  }
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
    trueFalse:   () => { openModal('trueFalseGameModal');   startTrueFalseGame(); }
  };
  if (map[name]) map[name]();
}

function openColorGame() { openModal('colorGameModal'); startColorGame(); }

// Registrar jogo jogado
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
  { text: '🏃 Fazer exercícios',     priority: 'High' },
  { text: '🍽️ Lavar a louça',        priority: 'Medium' },
  { text: '📖 Ler um livro',         priority: 'Medium' },
  { text: '🎮 Jogar videogame',      priority: 'Low' },
  { text: '📺 Assistir série',       priority: 'Low' }
];

function startOrganizeGame() {
  clearInterval(organizeInterval);
  organizeElapsed = 0;
  document.getElementById('organizeTimer').textContent = '00:00';
  document.getElementById('organizeGameResult').textContent = '';
  document.getElementById('priorityHigh').innerHTML   = '';
  document.getElementById('priorityMedium').innerHTML = '';
  document.getElementById('priorityLow').innerHTML    = '';

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
      e.dataTransfer.setData('taskText',     task.text);
      e.dataTransfer.setData('taskPriority', task.priority);
      e.dataTransfer.setData('taskBtnId',    btn.id);
    });
    container.appendChild(btn);
  });

  // Drop zone listeners
  document.querySelectorAll('.drop-zone').forEach(zone => {
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const text    = e.dataTransfer.getData('taskText');
      const btnId   = e.dataTransfer.getData('taskBtnId');
      const colId   = zone.querySelector('ul').id;
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

  // Verificar acertos
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
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}

// ── JOGO: Verdadeiro ou Falso ──────────────────────────
const TF_QUESTIONS = [
  { q: 'Estudar com música sempre melhora o foco.',         a: false, exp: 'Depende do tipo de música e da pessoa!' },
  { q: 'Fazer pausas curtas aumenta a produtividade.',      a: true,  exp: 'A técnica Pomodoro comprova isso.' },
  { q: 'Dormir pouco melhora o rendimento.',                a: false, exp: 'Dormir mal reduz foco, memória e humor.' },
  { q: 'Organizar tarefas ajuda a reduzir o estresse.',     a: true,  exp: 'Ter um plano claro reduz ansiedade.' },
  { q: 'Multitasking é mais eficiente que focar em 1 coisa.', a: false, exp: 'Multitasking reduz a qualidade de cada tarefa.' },
  { q: 'Exercício físico melhora a concentração.',          a: true,  exp: 'Atividade física libera dopamina e melhora o foco.' },
  { q: 'Listas de tarefas são inúteis para TDAH.',          a: false, exp: 'Listas visuais são muito eficazes para TDAH!' },
  { q: 'Celebrar pequenas conquistas é importante.',        a: true,  exp: 'Recompensas motivam a continuar.' }
];

let tfIndex = 0, tfScore = 0, tfAnswered = false;

function startTrueFalseGame() {
  tfIndex = 0; tfScore = 0; tfAnswered = false;
  renderTFQuestion();
}

function renderTFQuestion() {
  const el = document.getElementById('trueFalseQuestion');
  const fb = document.getElementById('trueFalseFeedback');
  const sc = document.getElementById('trueFalseScore');
  const pr = document.getElementById('tfProgress');
  tfAnswered = false;

  if (tfIndex >= TF_QUESTIONS.length) {
    const pct = Math.round((tfScore / TF_QUESTIONS.length) * 100);
    el.textContent = '🏁 Fim do jogo!';
    fb.textContent = `Você acertou ${tfScore}/${TF_QUESTIONS.length} (${pct}%)!`;
    fb.style.background = pct >= 60 ? '#dcfce7' : '#fee2e2';
    fb.style.color       = pct >= 60 ? '#16a34a' : '#dc2626';
    sc.textContent = '';
    if (pr) pr.textContent = '';
    registerGame();
    return;
  }

  el.textContent = TF_QUESTIONS[tfIndex].q;
  fb.textContent = '';
  fb.style.background = 'transparent';
  sc.textContent = `Pergunta ${tfIndex + 1} de ${TF_QUESTIONS.length}`;
  if (pr) pr.textContent = `${tfScore} acerto(s) até agora`;
}

function answerTrueFalse(answer) {
  if (tfAnswered) return;
  tfAnswered = true;
  const q = TF_QUESTIONS[tfIndex];
  const correct = (answer === 'true') === q.a;
  const fb = document.getElementById('trueFalseFeedback');
  if (correct) {
    tfScore++;
    fb.textContent = `✅ Correto! ${q.exp}`;
    fb.style.background = '#dcfce7';
    fb.style.color = '#16a34a';
  } else {
    fb.textContent = `❌ Errado! ${q.exp}`;
    fb.style.background = '#fee2e2';
    fb.style.color = '#dc2626';
  }
  tfIndex++;
  setTimeout(renderTFQuestion, 2200);
}

// ── JOGO: Memória — Pares ──────────────────────────────
const MEMORY_EMOJIS = ['🧠','⭐','🎯','🎮','🚀','💡','🌈','🦋'];
let memFirst = null, memSecond = null, memAttempts = 0, memFound = 0;
let memTimerInterval = null, memTimerSec = 0;

function startMemoryPairsGame() {
  memFirst = null; memSecond = null;
  memAttempts = 0; memFound = 0; memTimerSec = 0;
  clearInterval(memTimerInterval);

  const update = () => {
    const a = document.getElementById('memoryAttempts');
    const f = document.getElementById('memoryFound');
    const t = document.getElementById('memoryTime');
    if (a) a.textContent = memAttempts;
    if (f) f.textContent = memFound;
    if (t) t.textContent = `${memTimerSec}s`;
  };
  update();

  memTimerInterval = setInterval(() => {
    memTimerSec++;
    const t = document.getElementById('memoryTime');
    if (t) t.textContent = `${memTimerSec}s`;
  }, 1000);

  document.getElementById('memoryPairsFeedback').textContent = '';

  const board = document.getElementById('memoryPairsBoard');
  board.innerHTML = '';

  const pairs = [...MEMORY_EMOJIS, ...MEMORY_EMOJIS].sort(() => Math.random() - 0.5);
  pairs.forEach(emoji => {
    const tile = document.createElement('div');
    tile.className = 'memory-tile';
    tile.innerHTML = `<span class="tile-back">${emoji}</span>`;
    tile.dataset.val = emoji;
    tile.addEventListener('click', () => flipMemoryTile(tile, update));
    board.appendChild(tile);
  });
}

function flipMemoryTile(tile, updateStats) {
  if (tile.classList.contains('flipped') || tile.classList.contains('matched') || memSecond) return;
  tile.classList.add('flipped');

  if (!memFirst) {
    memFirst = tile;
    return;
  }
  memSecond = tile;
  memAttempts++;
  if (updateStats) updateStats();

  if (memFirst.dataset.val === memSecond.dataset.val) {
    memFirst.classList.add('matched');
    memSecond.classList.add('matched');
    memFound++;
    if (updateStats) updateStats();
    memFirst = null; memSecond = null;
    if (memFound === MEMORY_EMOJIS.length) {
      clearInterval(memTimerInterval);
      document.getElementById('memoryPairsFeedback').textContent =
        `🎉 Parabéns! Todos os pares em ${memAttempts} tentativas e ${memTimerSec}s!`;
      registerGame();
    }
  } else {
    setTimeout(() => {
      memFirst.classList.remove('flipped');
      memSecond.classList.remove('flipped');
      memFirst = null; memSecond = null;
    }, 900);
  }
}

// ── JOGO: Caça-Palavras ────────────────────────────────
const WORD_LIST = ['FOCO','ATENÇÃO','MEMÓRIA','ESTUDO','PLANO','TEMPO','META','HÁBITO'];
let wsWord = '', wsGrid = [], wsSelected = [];

function startWordSearch() {
  wsWord = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
  wsGrid = []; wsSelected = [];

  document.getElementById('wordSearchHint').textContent = `🔎 Encontre a palavra: ${wsWord}`;
  document.getElementById('wordSearchFeedback').textContent = '';

  const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const TOTAL = 36;
  for (let i = 0; i < TOTAL; i++) wsGrid.push(ALPHA[Math.floor(Math.random() * ALPHA.length)]);

  // Inserir palavra horizontalmente em posição aleatória (sem ultrapassar linha)
  const cols = 6;
  const maxStart = TOTAL - wsWord.length;
  let start = Math.floor(Math.random() * maxStart);
  // Ajuste para não quebrar linhas
  const row = Math.floor(start / cols);
  if (start + wsWord.length > (row + 1) * cols) start = row * cols;
  for (let i = 0; i < wsWord.length; i++) wsGrid[start + i] = wsWord[i];

  const gridEl = document.getElementById('wordGrid');
  gridEl.innerHTML = '';
  wsGrid.forEach((letter, idx) => {
    const cell = document.createElement('div');
    cell.className = 'word-cell';
    cell.textContent = letter;
    cell.addEventListener('click', () => selectWordCell(idx, cell));
    gridEl.appendChild(cell);
  });
}

function selectWordCell(idx, cell) {
  if (cell.classList.contains('selected') || cell.classList.contains('correct')) return;
  wsSelected.push(idx);
  cell.classList.add('selected');

  const formed = wsSelected.map(i => wsGrid[i]).join('');
  const fb = document.getElementById('wordSearchFeedback');

  if (wsSelected.length === wsWord.length) {
    if (formed === wsWord) {
      document.querySelectorAll('.word-cell.selected').forEach(c => {
        c.classList.remove('selected');
        c.classList.add('correct');
      });
      fb.textContent = `✅ Palavra "${wsWord}" encontrada!`;
      fb.style.color = '#16a34a';
      registerGame();
      setTimeout(startWordSearch, 2000);
    } else {
      fb.textContent = `❌ Você formou "${formed}". Continue tentando!`;
      fb.style.color = '#dc2626';
      setTimeout(() => {
        document.querySelectorAll('.word-cell.selected').forEach(c => c.classList.remove('selected'));
        wsSelected = [];
        fb.textContent = '';
      }, 1200);
    }
  }
}

// ── JOGO: Sequência Lógica ─────────────────────────────
const SEQUENCES = [
  { seq: [2, 4, 6, '?'],    ans: 8,   hint: '+2' },
  { seq: [1, 3, 5, '?'],    ans: 7,   hint: '+2' },
  { seq: [5, 10, 15, '?'],  ans: 20,  hint: '+5' },
  { seq: [10, 9, 8, '?'],   ans: 7,   hint: '-1' },
  { seq: [2, 6, 18, '?'],   ans: 54,  hint: '×3' },
  { seq: [1, 4, 9, '?'],    ans: 16,  hint: 'quadrados' },
  { seq: [3, 6, 12, '?'],   ans: 24,  hint: '×2' },
  { seq: [100, 50, 25, '?'],ans: 12.5,hint: '÷2' }
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

  // Gerar opções
  const opts = new Set([cur.ans]);
  const offsets = [1, 2, 3, 4, 5, 6, 7, 8, 10];
  while (opts.size < 4) {
    const off = offsets[Math.floor(Math.random() * offsets.length)];
    const sign = Math.random() > 0.5 ? 1 : -1;
    const fake = cur.ans + sign * off;
    if (fake !== cur.ans && fake > 0) opts.add(fake);
  }
  const optArr = [...opts].sort(() => Math.random() - 0.5);

  const optContainer = document.getElementById('sequenceOptions');
  optContainer.innerHTML = '';
  optArr.forEach(opt => {
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
