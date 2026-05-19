const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Подключение к базе данных
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Создаём таблицу при запуске
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(20) PRIMARY KEY,
        type VARCHAR(20) NOT NULL,
        title TEXT NOT NULL,
        instructions TEXT DEFAULT '',
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('База данных готова');
  } catch (err) {
    console.error('Ошибка инициализации БД:', err);
  }
}
initDB();

// Сохранение задания
app.post('/api/tasks', async (req, res) => {
  const { id, type, title, instructions, data } = req.body;
  let taskId = id;
  if (!taskId) {
    taskId = crypto.randomBytes(3).toString('hex');
  }
  try {
    await pool.query(
      `INSERT INTO tasks (id, type, title, instructions, data, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (id) DO UPDATE SET
         type = EXCLUDED.type,
         title = EXCLUDED.title,
         instructions = EXCLUDED.instructions,
         data = EXCLUDED.data,
         updated_at = NOW()`,
      [taskId, type, title, instructions || '', JSON.stringify(data)]
    );
    res.json({ id: taskId });
  } catch (err) {
    console.error('Ошибка сохранения:', err);
    res.status(500).json({ error: 'Ошибка сохранения' });
  }
});

// Получение задания
app.get('/api/tasks/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Задание не найдено' });
    }
    const row = result.rows[0];
    res.json({
      id: row.id,
      type: row.type,
      title: row.title,
      instructions: row.instructions,
      data: row.data,
      updatedAt: row.updated_at
    });
  } catch (err) {
    console.error('Ошибка получения:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.get('/task/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});