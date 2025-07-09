document.addEventListener("DOMContentLoaded", function () {
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
