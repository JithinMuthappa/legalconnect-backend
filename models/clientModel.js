const pool = require('../config/db');

const createClientProfile = async (userId, full_name, phone, city) => {
  const result = await pool.query(
    `INSERT INTO clients (user_id, full_name, phone, city)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [userId, full_name, phone, city]
  );
  return result.rows[0];
};

const getClientByUserId = async (userId) => {
  const result = await pool.query(
    `SELECT clients.*, users.email, users.role
     FROM clients
     JOIN users ON clients.user_id = users.id
     WHERE clients.user_id = $1`,
    [userId]
  );
  return result.rows[0];
};

const updateClientProfile = async (userId, full_name, phone, city) => {
  const result = await pool.query(
    `UPDATE clients SET full_name = $1, phone = $2, city = $3
     WHERE user_id = $4 RETURNING *`,
    [full_name, phone, city, userId]
  );
  return result.rows[0];
};

module.exports = { createClientProfile, getClientByUserId, updateClientProfile };