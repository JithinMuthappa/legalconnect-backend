const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createUser, findUserByEmail, markUserVerified, approveAdvocate, getPendingAdvocates } = require('../models/userModel');

// ─── Register ─────────────────────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role)
      return res.status(400).json({ success: false, message: 'All fields are required' });

    const existingUser = await findUserByEmail(email);
    if (existingUser)
      return res.status(400).json({ success: false, message: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUser(email, hashedPassword, role);

    // Auto verify
    await markUserVerified(email);

    if (role === 'advocate') {
      return res.status(201).json({
        success: true,
        message: 'Application submitted! Please wait for admin approval before logging in.',
        userId: user.id,
        isPending: true,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful! You can now login.',
      userId: user.id,
    });

  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ success: false, message: 'All fields are required' });

    const user = await findUserByEmail(email);
    if (!user)
      return res.status(400).json({ success: false, message: 'Invalid credentials' });

    if (!user.is_verified)
      return res.status(400).json({ success: false, message: 'Please verify your email first' });

    // Check if advocate is approved
    if (user.role === 'advocate' && !user.is_approved) {
      return res.status(403).json({
        success: false,
        message: 'Your application is under review. Please wait for admin approval.',
        isPending: true,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: { id: user.id, email: user.email, role: user.role },
    });

  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

// ─── Admin: Get Pending Advocates ─────────────────────────────────────────────
const getPending = async (req, res) => {
  try {
    const advocates = await getPendingAdvocates();
    res.json({ success: true, advocates });
  } catch (error) {
    console.error('Get pending error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to get pending advocates' });
  }
};

// ─── Admin: Approve Advocate ──────────────────────────────────────────────────
const approve = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ success: false, message: 'Email is required' });

    await approveAdvocate(email);
    res.json({ success: true, message: `Advocate ${email} approved!` });
  } catch (error) {
    console.error('Approve error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to approve' });
  }
};

module.exports = { register, login, getPending, approve };