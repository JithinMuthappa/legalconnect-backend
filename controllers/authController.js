const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { createUser, findUserByEmail, saveOTP, verifyUserOTP, markUserVerified } = require('../models/userModel');
const { generateOTP, getOTPExpiry } = require('../utils/generateOTP');

// ─── Email Transporter ────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

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

    const otp = generateOTP();
    const expiresAt = getOTPExpiry();
    await saveOTP(email, otp, expiresAt);

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'LegalConnect - Verify Your Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 30px; background: #1A1A2E; color: white; border-radius: 10px;">
          <h1 style="color: #D4AF37; text-align: center;">⚖️ LegalConnect</h1>
          <h2 style="color: white;">Verify Your Email</h2>
          <p style="color: #B0B0C0;">Your OTP verification code is:</p>
          <div style="background: #252540; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h1 style="color: #D4AF37; letter-spacing: 10px; font-size: 36px;">${otp}</h1>
          </div>
          <p style="color: #B0B0C0;">This OTP is valid for <strong>10 minutes</strong>.</p>
          <p style="color: #B0B0C0;">If you did not register, please ignore this email.</p>
        </div>
      `,
    });

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