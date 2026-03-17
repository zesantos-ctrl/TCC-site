document.addEventListener("DOMContentLoaded", function () {
  const calendarGrid = document.getElementById("calendarGrid");
  const monthYear = document.getElementById("monthYear");
  const today = new Date();
  let currentMonth = today.getMonth();
  let currentYear = today.getFullYear();
  let selectedDate = null;

  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  // ── LocalStorage ──────────────────────────────────────────────
  function getTasksForDate(day, month, year) {
    const key = `${day}-${month}-${year}`;
    const tasks = localStorage.getItem(key);
    return tasks ? JSON.parse(tasks) : [];
  }

  function saveTask(day, month, year, task) {
    const key = `${day}-${month}-${year}`;
    const tasks = getTasksForDate(day, month, year);
    tasks.push(task);
    localStorage.setItem(key, JSON.stringify(tasks));
  }

  // ── Renderização ──────────────────────────────────────────────
  function renderCalendar(month, year) {
    calendarGrid.innerHTML = "";
    monthYear.textContent = `${monthNames[month]} ${year}`;

    dayNames.forEach(day => {
      const header = document.createElement("div");
      header.classList.add("day-header");
      header.textContent = day;
      calendarGrid.appendChild(header);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement("div");
      empty.classList.add("calendar-day", "empty");
      calendarGrid.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const cell = document.createElement("div");
      cell.classList.add("calendar-day");

      if (
        day === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear()
      ) {
        cell.classList.add("today");
      }

      cell.textContent = day;

      const tasks = getTasksForDate(day, month, year);
      if (tasks.length > 0) {
        const badge = document.createElement("span");
        badge.classList.add("task-count-badge");
        badge.textContent = tasks.length;
        cell.appendChild(badge);
      }

      cell.addEventListener("click", () => openTaskModal(day, month, year));
      calendarGrid.appendChild(cell);
    }
  }

  // ── Modal ─────────────────────────────────────────────────────
  function openTaskModal(day, month, year) {
    selectedDate = { day, month, year };

    document.getElementById("selectedDateTitle").textContent =
      `Tarefas de ${day}/${month + 1}/${year}`;

    const taskList = document.getElementById("taskList");
    taskList.innerHTML = "";
    document.getElementById("newTaskInput").value = "";

    getTasksForDate(day, month, year).forEach(task => {
      const li = document.createElement("li");
      li.textContent = task;
      taskList.appendChild(li);
    });

    document.getElementById("taskModal").classList.add("open");
  }

  window.closeTaskModal = function () {
    document.getElementById("taskModal").classList.remove("open");
    selectedDate = null;
  };

  // Fechar ao clicar fora do modal
  document.getElementById("taskModal").addEventListener("click", function (e) {
    if (e.target === this) window.closeTaskModal();
  });

  // ── Adicionar tarefa ──────────────────────────────────────────
  window.addTaskToDate = function () {
    if (!selectedDate) return;
    const input = document.getElementById("newTaskInput");
    const task = input.value.trim();
    if (!task) return;

    saveTask(selectedDate.day, selectedDate.month, selectedDate.year, task);
    renderCalendar(currentMonth, currentYear); // atualiza badge
    openTaskModal(selectedDate.day, selectedDate.month, selectedDate.year);
  };

  // Suporte à tecla Enter no input
  document.getElementById("newTaskInput").addEventListener("keydown", function (e) {
    if (e.key === "Enter") window.addTaskToDate();
  });

  // ── Navegação ─────────────────────────────────────────────────
  document.getElementById("prevMonth").addEventListener("click", function () {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar(currentMonth, currentYear);
  });

  document.getElementById("nextMonth").addEventListener("click", function () {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendar(currentMonth, currentYear);
  });

  renderCalendar(currentMonth, currentYear);
}); document.addEventListener("DOMContentLoaded", function () {
  const calendarGrid = document.getElementById("calendarGrid");
  const monthYear = document.getElementById("monthYear");
  const today = new Date();
  let currentMonth = today.getMonth();
  let currentYear = today.getFullYear();
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  let selectedDate = null;

  function getTasksForDate(day, month, year) {
    const key = `${day}-${month}-${year}`;
    const tasks = localStorage.getItem(key);
    return tasks ? JSON.parse(tasks) : [];
  }

  function saveTask(day, month, year, task) {
    const key = `${day}-${month}-${year}`;
    const tasks = getTasksForDate(day, month, year);
    tasks.push(task);
    localStorage.setItem(key, JSON.stringify(tasks));
  }

  function renderCalendar(month, year) {
    calendarGrid.innerHTML = "";
    monthYear.textContent = `${monthNames[month]} ${year}`;

    // Cabeçalho dos dias da semana
    dayNames.forEach(day => {
      const dayHeader = document.createElement("div");
      dayHeader.classList.add("day-header");
      dayHeader.textContent = day;
      calendarGrid.appendChild(dayHeader);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      const emptyCell = document.createElement("div");
      emptyCell.classList.add("calendar-day", "empty");
      calendarGrid.appendChild(emptyCell);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayCell = document.createElement("div");
      dayCell.classList.add("calendar-day");

      if (
        day === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear()
      ) {
        dayCell.classList.add("today");
      }

      dayCell.textContent = day;

      const tasks = getTasksForDate(day, month, year);
      if (tasks.length > 0) {
        const badge = document.createElement("span");
        badge.textContent = tasks.length;
        badge.classList.add("task-count-badge");
        dayCell.appendChild(badge);
      }

      dayCell.addEventListener("click", function () {
        openTaskModal(day, month, year);
      });

      calendarGrid.appendChild(dayCell);
    }
  }

  function openTaskModal(day, month, year) {
    selectedDate = { day, month, year };
    const taskList = document.getElementById("taskList");
    taskList.innerHTML = "";
    document.getElementById("newTaskInput").value = "";

    document.getElementById("selectedDateTitle").textContent =
      `Tarefas de ${day}/${month + 1}/${year}`;

    const tasks = getTasksForDate(day, month, year);
    tasks.forEach(task => {
      const li = document.createElement("li");
      li.textContent = task;
      taskList.appendChild(li);
    });

    document.getElementById("taskModal").style.display = "flex";
  }

  window.closeTaskModal = function () {
    document.getElementById("taskModal").style.display = "none";
  };

  window.addTaskToDate = function () {
    if (!selectedDate) return;

    const newTaskInput = document.getElementById("newTaskInput");
    const task = newTaskInput.value.trim();

    if (task !== "") {
      saveTask(selectedDate.day, selectedDate.month, selectedDate.year, task);
      openTaskModal(selectedDate.day, selectedDate.month, selectedDate.year);
    }
  };

  document.getElementById("prevMonth").addEventListener("click", function () {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    renderCalendar(currentMonth, currentYear);
  });

  document.getElementById("nextMonth").addEventListener("click", function () {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    renderCalendar(currentMonth, currentYear);
  });

  renderCalendar(currentMonth, currentYear);
});
