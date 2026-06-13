const pool = require('../config/db');

const addAchievement = async (advocateId, title, description, year) => {
  const result = await pool.query(
    `INSERT INTO achievements (advocate_id, title, description, year)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [advocateId, title, description, year]
  );
  return result.rows[0];
};

const getAchievementsByAdvocateId = async (advocateId) => {
  const result = await pool.query(
    `SELECT * FROM achievements WHERE advocate_id = $1
     ORDER BY year DESC`,
    [advocateId]
  );
  return result.rows;
};

const updateAchievement = async (id, advocateId, title, description, year) => {
  const result = await pool.query(
    `UPDATE achievements SET title=$1, description=$2, year=$3
     WHERE id=$4 AND advocate_id=$5 RETURNING *`,
    [title, description, year, id, advocateId]
  );
  return result.rows[0];
};

const deleteAchievement = async (id, advocateId) => {
  const result = await pool.query(
    `DELETE FROM achievements WHERE id=$1 AND advocate_id=$2 RETURNING *`,
    [id, advocateId]
  );
  return result.rows[0];
};

module.exports = {
  addAchievement,
  getAchievementsByAdvocateId,
  updateAchievement,
  deleteAchievement,
};