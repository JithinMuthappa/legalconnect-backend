const pool = require('../config/db');

const createUser = async (email, hashedPassword, role) => {
  const result = await pool.query(
    `INSERT INTO users (email, password, role)
     VALUES ($1, $2, $3) RETURNING id, email, role`,
    [email, hashedPassword, role]
  );
  return result.rows[0];
};

const findUserByEmail = async (email) => {
  const result = await pool.query(
    `SELECT * FROM users WHERE email = $1`,
    [email]
  );
  return result.rows[0];
};

const saveOTP = async (email, otp, expiresAt) => {
  await pool.query(
    `UPDATE users SET otp = $1, otp_expires_at = $2 WHERE email = $3`,
    [otp, expiresAt, email]
  );
};

const verifyUserOTP = async (email, otp) => {
  const result = await pool.query(
    `SELECT * FROM users WHERE email = $1 AND otp = $2
     AND otp_expires_at > NOW()`,
    [email, otp]
  );
  return result.rows[0];
};

const markUserVerified = async (email) => {
  await pool.query(
    `UPDATE users SET is_verified = TRUE, otp = NULL,
     otp_expires_at = NULL WHERE email = $1`,
    [email]
  );
};

module.exports = {
  createUser,
  findUserByEmail,
  saveOTP,
  verifyUserOTP,
  markUserVerified,
};