(function () {
  const STORAGE_KEY = 'flow-tasks-v1';
  const PRIORITY_LABELS = {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
  };

  function createTask({ text, priority = 'medium', dueDate = '', completed = false }) {
    const cleanedText = String(text || '').trim();
    if (!cleanedText) {
      throw new Error('La tarea no puede estar vacía.');
    }

    const safePriority = ['low', 'medium', 'high'].includes(priority) ? priority : 'medium';

    return {
      id: Date.now() + Math.random(),
      text: cleanedText,
      priority: safePriority,
      dueDate: dueDate || '',
      completed: Boolean(completed),
      createdAt: new Date().toISOString(),
    };
  }

  function filterTasks(taskList, currentFilter = 'all') {
    if (currentFilter === 'active') return taskList.filter((task) => !task.completed);
    if (currentFilter === 'completed') return taskList.filter((task) => task.completed);
    return [...taskList];
  }

  function getTaskSummary(taskList) {
    return {
      total: taskList.length,
      pending: taskList.filter((task) => !task.completed).length,
      completed: taskList.filter((task) => task.completed).length,
    };
  }

  function loadTasks() {
    if (typeof localStorage === 'undefined') return [];

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('No se pudieron cargar las tareas:', error);
      return [];
    }
  }

  function saveTasks(taskList) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(taskList));
  }

  function formatDate(dateString) {
    if (!dateString) return 'Sin fecha';

    const date = new Date(dateString + 'T00:00:00');
    if (Number.isNaN(date.getTime())) return 'Sin fecha';

    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
    }).format(date);
  }

  function renderTaskList(taskList, currentFilter, taskTemplate, container) {
    const filteredTasks = filterTasks(taskList, currentFilter);
    container.innerHTML = '';

    if (!filteredTasks.length) {
      const empty = document.createElement('li');
      empty.className = 'empty-state';
      empty.textContent = 'No hay tareas en esta vista.';
      container.appendChild(empty);
      return;
    }

    filteredTasks.forEach((task) => {
      const fragment = taskTemplate.content.cloneNode(true);
      const taskItem = fragment.querySelector('.task-item');
      const checkbox = fragment.querySelector('.task-check');
      const text = fragment.querySelector('.task-text');
      const priorityPill = fragment.querySelector('.priority-pill');
      const dateLabel = fragment.querySelector('.task-date');
      const deleteBtn = fragment.querySelector('.delete-btn');
      const editBtn = fragment.querySelector('.edit-btn');

      taskItem.dataset.id = String(task.id);
      taskItem.classList.toggle('completed', task.completed);
      checkbox.checked = task.completed;
      text.textContent = task.text;
      priorityPill.classList.add(task.priority);
      priorityPill.textContent = PRIORITY_LABELS[task.priority] || 'Media';
      dateLabel.textContent = formatDate(task.dueDate);

      checkbox.addEventListener('change', () => {
        task.completed = checkbox.checked;
        saveTasks(taskList);
        renderDashboard(taskList, currentFilter);
      });

      deleteBtn.addEventListener('click', () => {
        const updated = taskList.filter((item) => item.id !== task.id);
        saveTasks(updated);
        renderDashboard(updated, currentFilter);
      });

      editBtn.addEventListener('click', () => {
        const input = document.getElementById('task-input');
        const prioritySelect = document.getElementById('task-priority');
        const dateInput = document.getElementById('task-date');
        const submitBtn = document.querySelector('.primary-btn');

        input.value = task.text;
        prioritySelect.value = task.priority;
        dateInput.value = task.dueDate;

        const form = document.getElementById('task-form');
        form.dataset.editingId = String(task.id);
        submitBtn.textContent = 'Guardar';
        input.focus();
      });

      container.appendChild(fragment);
    });
  }

  function renderDashboard(taskList, currentFilter) {
    const summary = getTaskSummary(taskList);
    document.getElementById('total-count').textContent = String(summary.total);
    document.getElementById('pending-count').textContent = String(summary.pending);
    document.getElementById('completed-count').textContent = String(summary.completed);

    const taskTemplate = document.getElementById('task-template');
    const taskListContainer = document.getElementById('task-list');
    renderTaskList(taskList, currentFilter, taskTemplate, taskListContainer);
  }

  function initApp() {
    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const taskPriority = document.getElementById('task-priority');
    const taskDate = document.getElementById('task-date');
    const clearCompletedBtn = document.getElementById('clear-completed');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const themeToggle = document.getElementById('theme-toggle');

    let tasks = loadTasks();
    let currentFilter = 'all';

    const savedTheme = localStorage.getItem('flow-theme') || 'light';
    document.body.dataset.theme = savedTheme;
    themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

    themeToggle.addEventListener('click', () => {
      const nextTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
      document.body.dataset.theme = nextTheme;
      localStorage.setItem('flow-theme', nextTheme);
      themeToggle.textContent = nextTheme === 'dark' ? '☀️' : '🌙';
    });

    taskForm.addEventListener('submit', (event) => {
      event.preventDefault();

      const editingId = taskForm.dataset.editingId;
      const textValue = taskInput.value.trim();
      const priorityValue = taskPriority.value;
      const dateValue = taskDate.value;

      if (!textValue) return;

      if (editingId) {
        tasks = tasks.map((task) => {
          if (String(task.id) !== editingId) return task;
          return {
            ...task,
            text: textValue,
            priority: priorityValue,
            dueDate: dateValue,
          };
        });

        delete taskForm.dataset.editingId;
        document.querySelector('.primary-btn').textContent = 'Agregar';
      } else {
        tasks = [createTask({
          text: textValue,
          priority: priorityValue,
          dueDate: dateValue,
        }), ...tasks];
      }

      saveTasks(tasks);
      taskForm.reset();
      taskPriority.value = 'medium';
      renderDashboard(tasks, currentFilter);
      taskInput.focus();
    });

    clearCompletedBtn.addEventListener('click', () => {
      tasks = tasks.filter((task) => !task.completed);
      saveTasks(tasks);
      renderDashboard(tasks, currentFilter);
    });

    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        currentFilter = button.dataset.filter;
        filterButtons.forEach((btn) => btn.classList.toggle('active', btn === button));
        renderDashboard(tasks, currentFilter);
      });
    });

    renderDashboard(tasks, currentFilter);
  }

  if (typeof document !== 'undefined') {
    initApp();
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      createTask,
      filterTasks,
      getTaskSummary,
    };
  }
})();
