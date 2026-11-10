const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const loginPanel = document.getElementById('login-panel');
const registerPanel = document.getElementById('register-panel');
const recoveryPanel = document.getElementById('recovery-panel');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const recoveryForm = document.getElementById('recovery-form');
const loginMessage = document.getElementById('login-message');
const registerMessage = document.getElementById('register-message');
const recoveryMessage = document.getElementById('recovery-message');
const showRegisterBtn = document.getElementById('show-register-btn');
const showRecoveryBtn = document.getElementById('show-recovery-btn');
const showLoginBtn = document.getElementById('show-login-btn');
const backLoginBtn = document.getElementById('back-login-btn');
const logoutBtn = document.getElementById('logout-btn');
const profileBtn = document.getElementById('profile-btn');
const userLabel = document.getElementById('user-label');
const userAvatar = document.getElementById('user-avatar');
const profileAvatar = document.getElementById('profile-avatar');
const profileCard = document.getElementById('profile-card');
const profileForm = document.getElementById('profile-form');
const profileFullName = document.getElementById('profile-fullname');
const profileEmail = document.getElementById('profile-email');
const profileName = document.getElementById('profile-name');
const profileMessage = document.getElementById('profile-message');
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const taskPriority = document.getElementById('task-priority');
const taskDate = document.getElementById('task-date');
const taskList = document.getElementById('task-list');
const taskTemplate = document.getElementById('task-template');
const clearCompletedBtn = document.getElementById('clear-completed');
const filterButtons = document.querySelectorAll('.filter-btn');
const totalCount = document.getElementById('total-count');
const pendingCount = document.getElementById('pending-count');
const completedCount = document.getElementById('completed-count');

let currentFilter = 'all';
let tasks = [];

function getPasswordStrength(password) {
  const rules = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const passedRules = Object.values(rules).filter(Boolean).length;

  let label = 'Muy débil';
  let width = 20;

  if (passedRules >= 3) {
    label = 'Buena';
    width = 60;
  }

  if (passedRules >= 4) {
    label = 'Muy buena';
    width = 80;
  }

  if (passedRules === 5) {
    label = 'Fuerte';
    width = 100;
  }

  return { rules, passedRules, label, width };
}

function updatePasswordStrength() {
  const input = document.getElementById('register-password');
  const strengthFill = document.getElementById('strength-fill');
  const strengthLabel = document.getElementById('strength-label');
  const ruleEls = document.querySelectorAll('.strength-rules li');

  const value = input.value;
  const { rules, passedRules, label, width } = getPasswordStrength(value);

  strengthFill.style.width = `${width}%`;
  strengthLabel.textContent = label;

  ruleEls.forEach((ruleEl) => {
    const ruleName = ruleEl.dataset.rule;
    ruleEl.classList.toggle('active', rules[ruleName]);
  });

  if (!value) {
    strengthLabel.textContent = 'Muy débil';
    strengthFill.style.width = '0%';
  }

  return passedRules;
}

function updateUserBadge(user) {
  const fullName = user?.fullName || user?.username || 'Usuario';
  const short = fullName
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 2) || 'U';

  userLabel.textContent = fullName;
  userAvatar.textContent = short;
  profileAvatar.textContent = short;
  profileName.textContent = fullName;
  profileFullName.value = fullName;
  profileEmail.value = user?.email || '';
}

function setAuthState(token, user) {
  if (token && user) {
    localStorage.setItem('flow-token', token);
    localStorage.setItem('flow-user', JSON.stringify(user));
    loginScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    updateUserBadge(user);
    loadTasks();
  } else {
    localStorage.removeItem('flow-token');
    localStorage.removeItem('flow-user');
    appScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
  }
}

function applyAuthFromStorage() {
  const token = localStorage.getItem('flow-token');
  const user = JSON.parse(localStorage.getItem('flow-user') || 'null');

  if (token && user) {
    setAuthState(token, user);
    return;
  }

  setAuthState(null, null);
}

async function login(username, password) {
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al iniciar sesión');
    }

    setAuthState(data.token, data.user);
  } catch (error) {
    loginMessage.textContent = error.message;
  }
}

async function register(username, password, confirmPassword, email, fullName) {
  const strength = getPasswordStrength(password);

  if (strength.passedRules < 3) {
    registerMessage.textContent = 'La contraseña debe tener al menos 3 criterios de seguridad.';
    return;
  }

  if (password !== confirmPassword) {
    registerMessage.textContent = 'Las contraseñas no coinciden.';
    return;
  }

  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, confirmPassword, email, fullName }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al registrar usuario');
    }

    setAuthState(data.token, data.user);
  } catch (error) {
    registerMessage.textContent = error.message;
  }
}

async function recoverPassword(email) {
  try {
    const response = await fetch('/api/recover-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'No se pudo recuperar la contraseña');
    }

    recoveryMessage.textContent = data.message;
    recoveryMessage.style.color = '#166534';
    recoveryForm.reset();
    setTimeout(() => {
      recoveryPanel.classList.add('hidden');
      loginPanel.classList.remove('hidden');
    }, 2000);
  } catch (error) {
    recoveryMessage.textContent = error.message;
    recoveryMessage.style.color = '#dc2626';
  }
}

async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('flow-token');

  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

async function loadProfile() {
  const response = await fetchWithAuth('/api/profile');
  if (!response.ok) return;

  const data = await response.json();
  updateUserBadge(data);
  localStorage.setItem('flow-user', JSON.stringify(data));
}

async function loadTasks() {
  const response = await fetchWithAuth('/api/tasks');

  if (!response.ok) {
    setAuthState(null, null);
    return;
  }

  tasks = await response.json();
  renderTasks();
  await loadProfile();
}

function renderTasks() {
  const filteredTasks = tasks.filter((task) => {
    if (currentFilter === 'active') return !task.completed;
    if (currentFilter === 'completed') return task.completed;
    return true;
  });

  taskList.innerHTML = '';

  if (!filteredTasks.length) {
    const empty = document.createElement('li');
    empty.className = 'empty-state';
    empty.textContent = 'No hay tareas en esta vista.';
    taskList.appendChild(empty);
  } else {
    filteredTasks.forEach((task) => {
      const fragment = taskTemplate.content.cloneNode(true);
      const item = fragment.querySelector('.task-item');
      const checkbox = fragment.querySelector('.task-check');
      const text = fragment.querySelector('.task-text');
      const priority = fragment.querySelector('.priority-pill');
      const date = fragment.querySelector('.task-date');
      const deleteBtn = fragment.querySelector('.delete-btn');
      const editBtn = fragment.querySelector('.edit-btn');

      item.classList.toggle('completed', task.completed);
      checkbox.checked = task.completed;
      text.textContent = task.text;
      priority.classList.add(task.priority || 'medium');
      priority.textContent = {
        low: 'Baja',
        medium: 'Media',
        high: 'Alta',
      }[task.priority || 'medium'];
      date.textContent = task.dueDate ? formatDate(task.dueDate) : 'Sin fecha';

      checkbox.addEventListener('change', async () => {
        await updateTask(task.id, { completed: checkbox.checked });
      });

      deleteBtn.addEventListener('click', async () => {
        await deleteTask(task.id);
      });

      editBtn.addEventListener('click', () => {
        taskInput.value = task.text;
        taskPriority.value = task.priority || 'medium';
        taskDate.value = task.dueDate || '';
        taskForm.dataset.editingId = String(task.id);
        taskForm.querySelector('.primary-btn').textContent = 'Guardar';
        taskInput.focus();
      });

      taskList.appendChild(fragment);
    });
  }

  const total = tasks.length;
  const pending = tasks.filter((task) => !task.completed).length;
  const completed = tasks.filter((task) => task.completed).length;

  totalCount.textContent = String(total);
  pendingCount.textContent = String(pending);
  completedCount.textContent = String(completed);
}

function formatDate(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
  }).format(date);
}

async function addTask(task) {
  const response = await fetchWithAuth('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task),
  });

  if (response.ok) {
    taskForm.reset();
    taskPriority.value = 'medium';
    taskForm.querySelector('.primary-btn').textContent = 'Agregar';
    delete taskForm.dataset.editingId;
    loadTasks();
  }
}

async function updateTask(id, changes) {
  const response = await fetchWithAuth(`/api/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes),
  });

  if (response.ok) {
    loadTasks();
  }
}

async function deleteTask(id) {
  const response = await fetchWithAuth(`/api/tasks/${id}`, { method: 'DELETE' });

  if (response.ok) {
    loadTasks();
  }
}

showRegisterBtn.addEventListener('click', () => {
  loginMessage.textContent = '';
  loginPanel.classList.add('hidden');
  registerPanel.classList.remove('hidden');
  recoveryPanel.classList.add('hidden');
});

showRecoveryBtn.addEventListener('click', () => {
  loginMessage.textContent = '';
  loginPanel.classList.add('hidden');
  recoveryPanel.classList.remove('hidden');
  registerPanel.classList.add('hidden');
});

showLoginBtn.addEventListener('click', () => {
  registerMessage.textContent = '';
  registerPanel.classList.add('hidden');
  recoveryPanel.classList.add('hidden');
  loginPanel.classList.remove('hidden');
});

backLoginBtn.addEventListener('click', () => {
  recoveryMessage.textContent = '';
  recoveryPanel.classList.add('hidden');
  loginPanel.classList.remove('hidden');
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  loginMessage.textContent = '';
  await login(username, password);
});

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const fullName = document.getElementById('register-fullname').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const username = document.getElementById('register-username').value.trim();
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  registerMessage.textContent = '';
  await register(username, password, confirmPassword, email, fullName);
});

recoveryForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = document.getElementById('recovery-email').value.trim();
  recoveryMessage.textContent = '';
  await recoverPassword(email);
});

document.getElementById('register-password').addEventListener('input', updatePasswordStrength);

profileBtn.addEventListener('click', () => {
  profileCard.classList.toggle('hidden');
});

profileForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  profileMessage.textContent = '';

  const response = await fetchWithAuth('/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: profileFullName.value.trim(),
      email: profileEmail.value.trim(),
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    profileMessage.textContent = data.message || 'No se pudo guardar el perfil';
    return;
  }

  profileMessage.textContent = 'Perfil actualizado correctamente.';
  updateUserBadge(data);
  localStorage.setItem('flow-user', JSON.stringify(data));
});

logoutBtn.addEventListener('click', () => {
  setAuthState(null, null);
});

taskForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const text = taskInput.value.trim();
  if (!text) return;

  const taskPayload = {
    text,
    priority: taskPriority.value,
    dueDate: taskDate.value,
  };

  const editingId = taskForm.dataset.editingId;

  if (editingId) {
    await updateTask(editingId, taskPayload);
    taskForm.querySelector('.primary-btn').textContent = 'Agregar';
    delete taskForm.dataset.editingId;
  } else {
    await addTask(taskPayload);
  }

  taskForm.reset();
  taskPriority.value = 'medium';
  taskInput.focus();
});

clearCompletedBtn.addEventListener('click', async () => {
  for (const task of [...tasks]) {
    if (task.completed) {
      await deleteTask(task.id);
    }
  }
});

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    currentFilter = button.dataset.filter;
    filterButtons.forEach((btn) => btn.classList.toggle('active', btn === button));
    renderTasks();
  });
});

applyAuthFromStorage();
