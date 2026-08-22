const pool = require('../config/db');

const ensureCalendarTable = async () => {
  await pool.query(`CREATE TABLE IF NOT EXISTS calendar_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    event_at TIMESTAMPTZ NOT NULL,
    reminder_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
};

const listEvents = async (userId) => {
  await ensureCalendarTable();
  const result = await pool.query(
    `SELECT id, title, description, event_at, reminder_at
     FROM calendar_events WHERE user_id = $1 ORDER BY event_at ASC`,
    [userId],
  );
  return result.rows;
};

const createEvent = async (userId, event) => {
  await ensureCalendarTable();
  const result = await pool.query(
    `INSERT INTO calendar_events (user_id, title, description, event_at, reminder_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, title, description, event_at, reminder_at`,
    [userId, event.title, event.description || null, event.eventAt, event.reminderAt || null],
  );
  return result.rows[0];
};

const updateEvent = async (userId, id, event) => {
  await ensureCalendarTable();
  const result = await pool.query(
    `UPDATE calendar_events
     SET title = $1, description = $2, event_at = $3, reminder_at = $4, updated_at = NOW()
     WHERE id = $5 AND user_id = $6
     RETURNING id, title, description, event_at, reminder_at`,
    [event.title, event.description || null, event.eventAt, event.reminderAt || null, id, userId],
  );
  return result.rows[0];
};

const removeEvent = async (userId, id) => {
  await ensureCalendarTable();
  const result = await pool.query(
    'DELETE FROM calendar_events WHERE id = $1 AND user_id = $2 RETURNING id',
    [id, userId],
  );
  return result.rows[0];
};

module.exports = { listEvents, createEvent, updateEvent, removeEvent };
