const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');

const SESSION_TOKENS = new Map();

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(
      USERS_FILE,
      JSON.stringify(
        [
          {
            id: 1,
            username: 'admin',
            password: hashPassword('123456'),
            email: 'admin@flowtasks.com',
            fullName: 'Administrador',
          },
        ],
        null,
        2,
      ),
    );
  }

  if (!fs.existsSync(TASKS_FILE)) {
    fs.writeFileSync(TASKS_FILE, JSON.stringify([], null, 2));
  }
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

function readJson(filePath, fallback = []) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getUsers() {
  return readJson(USERS_FILE, []);
}

function getTasks() {
  return readJson(TASKS_FILE, []);
}

function saveTasks(tasks) {
  writeJson(TASKS_FILE, tasks);
}

function createToken() {
  return crypto.randomUUID();
}

function createTemporaryPassword() {
  return `Reset-${Math.random().toString(36).slice(2, 8)}!`;
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token || !SESSION_TOKENS.has(token)) {
    return res.status(401).json({ message: 'No autorizado' });
  }

  req.user = SESSION_TOKENS.get(token);
  next();
}

app.use(express.json());
app.use(express.static(path.join(ROOT, 'public')));

app.post('/api/register', (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  const confirmPassword = String(req.body?.confirmPassword || '');
  const email = String(req.body?.email || '').trim();
  const fullName = String(req.body?.fullName || '').trim();

  if (!username || !password || password.length < 4) {
    return res.status(400).json({ message: 'Usuario y contraseña (mínimo 4 caracteres) son obligatorios.' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Las contraseñas no coinciden.' });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Introduce un correo electrónico válido.' });
  }

  if (!fullName) {
    return res.status(400).json({ message: 'El nombre completo es obligatorio.' });
  }

  const users = getUsers();
  const exists = users.some((user) => user.username === username || user.email?.toLowerCase() === email.toLowerCase());

  if (exists) {
    return res.status(409).json({ message: 'Ese usuario o correo ya existe.' });
  }

  const newUser = {
    id: Date.now(),
    username,
    password: hashPassword(password),
    email,
    fullName,
  };

  users.push(newUser);
  writeJson(USERS_FILE, users);

  const token = createToken();
  SESSION_TOKENS.set(token, { id: newUser.id, username: newUser.username, email: newUser.email, fullName: newUser.fullName });

  return res.status(201).json({
    token,
    user: { id: newUser.id, username: newUser.username, email: newUser.email, fullName: newUser.fullName },
  });
});

app.post('/api/login', (req, res) => {
  const usernameInput = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  const users = getUsers();
  const user = users.find(
    (item) =>
      (item.username === usernameInput || item.email?.toLowerCase() === usernameInput.toLowerCase()) &&
      item.password === hashPassword(password),
  );

  if (!user) {
    return res.status(401).json({ message: 'Credenciales inválidas' });
  }

  const token = createToken();
  SESSION_TOKENS.set(token, { id: user.id, username: user.username, email: user.email, fullName: user.fullName });

  return res.json({
    token,
    user: { id: user.id, username: user.username, email: user.email, fullName: user.fullName },
  });
});

app.post('/api/recover-password', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Introduce un correo electrónico válido.' });
  }

  const users = getUsers();
  const user = users.find((item) => String(item.email || '').toLowerCase() === email);

  if (!user) {
    return res.status(404).json({ message: 'No existe ninguna cuenta con ese correo.' });
  }

  const temporaryPassword = createTemporaryPassword();
  user.password = hashPassword(temporaryPassword);
  writeJson(USERS_FILE, users);

  return res.json({
    message: `Se ha restablecido tu contraseña. Tu nueva contraseña temporal es: ${temporaryPassword}. Cámbiala cuando vuelvas a iniciar sesión.`,
    tempPassword: temporaryPassword,
  });
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.get('/api/tasks', requireAuth, (req, res) => {
  res.json(getTasks());
});

app.post('/api/tasks', requireAuth, (req, res) => {
  const { text, priority = 'medium', dueDate = '' } = req.body || {};
  const cleanText = String(text || '').trim();

  if (!cleanText) {
    return res.status(400).json({ message: 'La tarea no puede estar vacía' });
  }

  const tasks = getTasks();
  const newTask = {
    id: Date.now(),
    text: cleanText,
    priority: ['low', 'medium', 'high'].includes(priority) ? priority : 'medium',
    dueDate,
    completed: false,
    createdAt: new Date().toISOString(),
  };

  tasks.unshift(newTask);
  saveTasks(tasks);
  res.status(201).json(newTask);
});

app.put('/api/tasks/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const tasks = getTasks();
  const taskIndex = tasks.findIndex((task) => String(task.id) === String(id));

  if (taskIndex === -1) {
    return res.status(404).json({ message: 'Tarea no encontrada' });
  }

  const updated = {
    ...tasks[taskIndex],
    ...req.body,
    priority: ['low', 'medium', 'high'].includes(req.body.priority) ? req.body.priority : tasks[taskIndex].priority,
  };

  tasks[taskIndex] = updated;
  saveTasks(tasks);
  res.json(updated);
});

app.get('/api/profile', requireAuth, (req, res) => {
  const users = getUsers();
  const user = users.find((item) => item.id === req.user.id);

  if (!user) {
    return res.status(404).json({ message: 'Usuario no encontrado' });
  }

  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
  });
});

app.put('/api/profile', requireAuth, (req, res) => {
  const { fullName, email } = req.body || {};
  const users = getUsers();
  const userIndex = users.findIndex((item) => item.id === req.user.id);

  if (userIndex === -1) {
    return res.status(404).json({ message: 'Usuario no encontrado' });
  }

  const newEmail = String(email || '').trim();
  const newFullName = String(fullName || '').trim();

  if (!newFullName) {
    return res.status(400).json({ message: 'El nombre completo no puede estar vacío.' });
  }

  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    return res.status(400).json({ message: 'Introduce un correo electrónico válido.' });
  }

  users[userIndex] = {
    ...users[userIndex],
    email: newEmail,
    fullName: newFullName,
  };

  writeJson(USERS_FILE, users);

  const updatedUser = {
    id: users[userIndex].id,
    username: users[userIndex].username,
    email: users[userIndex].email,
    fullName: users[userIndex].fullName,
  };

  SESSION_TOKENS.set(req.headers.authorization?.replace('Bearer ', '') || '', updatedUser);

  res.json(updatedUser);
});

app.delete('/api/tasks/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const tasks = getTasks().filter((task) => String(task.id) !== String(id));
  saveTasks(tasks);
  res.json({ success: true });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(ROOT, 'public', 'index.html'));
});

ensureDataFiles();

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
