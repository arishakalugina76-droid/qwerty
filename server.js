const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Папка, которая не стирается на Render
const DATA_DIR = process.env.RENDER_DISK ? '/data' : __dirname;
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');

function loadTasks() {
  try {
    if (fs.existsSync(TASKS_FILE)) {
      return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Ошибка чтения заданий:', e);
  }
  return {};
}

function saveTasks(tasks) {
  const dir = path.dirname(TASKS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
}

app.post('/api/tasks', (req, res) => {
  const { id, type, title, instructions, data } = req.body;
  const tasks = loadTasks();
  let taskId = id;
  if (!taskId) {
    taskId = crypto.randomBytes(3).toString('hex');
    while (tasks[taskId]) taskId = crypto.randomBytes(3).toString('hex');
  }
  tasks[taskId] = {
    id: taskId,
    type,
    title,
    instructions: instructions || '',
    data,
    updatedAt: new Date().toISOString()
  };
  saveTasks(tasks);
  res.json({ id: taskId });
});

app.get('/api/tasks/:id', (req, res) => {
  const tasks = loadTasks();
  const task = tasks[req.params.id];
  if (!task) return res.status(404).json({ error: 'Задание не найдено' });
  res.json(task);
});

app.get('/task/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});