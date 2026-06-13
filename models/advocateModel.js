const pool = require('../config/db');

const createAdvocateProfile = async (userId, data) => {
  const { full_name, phone, city, specialization, experience_years, bio, bar_council_number } = data;
  const result = await pool.query(
    `INSERT INTO advocates (user_id, full_name, phone, city, specialization, experience_years, bio, bar_council_number)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [userId, full_name, phone, city, specialization, experience_years, bio, bar_council_number]
  );
  return result.rows[0];
};

const getAdvocateByUserId = async (userId) => {
  const result = await pool.query(
    `SELECT advocates.*, users.email, users.role
     FROM advocates
     JOIN users ON advocates.user_id = users.id
     WHERE advocates.user_id = $1`,
    [userId]
  );
  return result.rows[0];
};

const updateAdvocateProfile = async (userId, data) => {
  const { full_name, phone, city, specialization, experience_years, bio, bar_council_number } = data;
  const result = await pool.query(
    `UPDATE advocates SET full_name=$1, phone=$2, city=$3, specialization=$4,
     experience_years=$5, bio=$6, bar_council_number=$7
     WHERE user_id=$8 RETURNING *`,
    [full_name, phone, city, specialization, experience_years, bio, bar_council_number, userId]
  );
  return result.rows[0];
};

const getAllAdvocates = async () => {
  const result = await pool.query(
    `SELECT advocates.*, users.email
     FROM advocates
     JOIN users ON advocates.user_id = users.id
     ORDER BY advocates.created_at DESC`
  );
  return result.rows;
};

const getAdvocateById = async (id) => {
  const result = await pool.query(
    `SELECT advocates.*, users.email
     FROM advocates
     JOIN users ON advocates.user_id = users.id
     WHERE advocates.id = $1`,
    [id]
  );
  return result.rows[0];
};

const searchAdvocates = async (specialization, city) => {
  let query = `SELECT advocates.*, users.email
               FROM advocates
               JOIN users ON advocates.user_id = users.id
               WHERE 1=1`;
  const params = [];

  if (specialization) {
    params.push(`%${specialization}%`);
    query += ` AND advocates.specialization ILIKE $${params.length}`;
  }

  if (city) {
    params.push(`%${city}%`);
    query += ` AND advocates.city ILIKE $${params.length}`;
  }

  query += ` ORDER BY advocates.experience_years DESC`;

  const result = await pool.query(query, params);
  return result.rows;
};

const getAdvocateWithAchievements = async (id) => {
  const advocate = await pool.query(
    `SELECT advocates.*, users.email
     FROM advocates
     JOIN users ON advocates.user_id = users.id
     WHERE advocates.id = $1`,
    [id]
  );

  const achievements = await pool.query(
    `SELECT * FROM achievements WHERE advocate_id = $1 ORDER BY year DESC`,
    [id]
  );

  return {
    ...advocate.rows[0],
    achievements: achievements.rows,
  };
};

module.exports = {
  createAdvocateProfile,
  getAdvocateByUserId,
  updateAdvocateProfile,
  getAllAdvocates,
  getAdvocateById,
  searchAdvocates,
  getAdvocateWithAchievements,
};