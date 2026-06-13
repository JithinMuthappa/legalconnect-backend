const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createUser, findUserByEmail, saveOTP, verifyUserOTP, markUserVerified } = require('../models/userModel');
const { generateOTP, getOTPExpiry } = require('../utils/generateOTP');

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

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = getOTPExpiry();
    await saveOTP(email, otp, expiresAt);

    // DEV MODE: Print OTP in terminal instead of email
    console.log(`🔐 OTP for ${email}: ${otp}`);

    res.status(201).json({
      success: true,
      message: 'Registration successful! OTP sent to your email.',
      userId: user.id,
    });

  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
};

// ─── Verify OTP ───────────────────────────────────────────────────────────────
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp)
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });

    const user = await verifyUserOTP(email, otp);
    if (!user)
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });

    await markUserVerified(email);

    res.json({ success: true, message: 'Email verified successfully! You can now login.' });

  } catch (error) {
    console.error('OTP error:', error.message);
    res.status(500).json({ success: false, message: 'OTP verification failed' });
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

module.exports = { register, verifyOTP, login };