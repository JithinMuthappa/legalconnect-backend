const pool = require('../config/db');

const createUser = async (email, hashedPassword, role) => {
  const result = await pool.query(
    `INSERT INTO users (email, password, role, is_verified, is_approved)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, email, role`,
    [email, hashedPassword, role, false, role === 'client' ? true : false]
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

const approveAdvocate = async (email) => {
  await pool.query(
    `UPDATE users SET is_approved = TRUE WHERE email = $1`,
    [email]
  );
  await pool.query(
    `UPDATE advocates SET status = 'approved' 
     WHERE user_id = (SELECT id FROM users WHERE email = $1)`,
    [email]
  );
};

const getPendingAdvocates = async () => {
  const result = await pool.query(
    `SELECT users.id, users.email, users.created_at,
     advocates.full_name, advocates.bar_council_number,
     advocates.specialization, advocates.city, advocates.status
     FROM users
     LEFT JOIN advocates ON advocates.user_id = users.id
     WHERE users.role = 'advocate' AND users.is_approved = FALSE
     ORDER BY users.created_at DESC`
  );
  return result.rows;
};

module.exports = {
  createUser,
  findUserByEmail,
  saveOTP,
  verifyUserOTP,
  markUserVerified,
  approveAdvocate,
  getPendingAdvocates,
};
