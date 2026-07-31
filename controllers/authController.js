const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { createUser, findUserByEmail, markUserVerified, saveOTP, verifyUserOTP, approveAdvocate, getPendingAdvocates } = require('../models/userModel');
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

// ─── Send OTP Email ───────────────────────────────────────────────────────────
const sendOTPEmail = async (email, otp) => {
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
};

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

    // Send OTP email
    try {
      await sendOTPEmail(email, otp);
    } catch (emailError) {
      console.error('Email error:', emailError.message);
      console.log(`🔐 OTP for ${email}: ${otp}`);
    }

    res.status(201).json({
      success: true,
      message: 'OTP sent to your email. Please verify to continue.',
      userId: user.id,
      requiresOTP: true,
      role: role,
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
      return res.status(400).json({ success: false, message: 'Email and OTP required' });

    const user = await verifyUserOTP(email, otp);
    if (!user)
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });

    await markUserVerified(email);

    // Get user role
    const verifiedUser = await findUserByEmail(email);

    if (verifiedUser.role === 'advocate') {
      return res.json({
        success: true,
        message: 'Email verified! Your application is under admin review.',
        isPending: true,
      });
    }

    res.json({
      success: true,
      message: 'Email verified successfully! You can now login.',
      isPending: false,
    });

  } catch (error) {
    console.error('OTP error:', error.message);
    res.status(500).json({ success: false, message: 'OTP verification failed' });
  }
};

// ─── Resend OTP ───────────────────────────────────────────────────────────────
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await findUserByEmail(email);
    if (!user)
      return res.status(400).json({ success: false, message: 'Email not found' });

    const otp = generateOTP();
    const expiresAt = getOTPExpiry();
    await saveOTP(email, otp, expiresAt);

    try {
      await sendOTPEmail(email, otp);
    } catch (emailError) {
      console.log(`🔐 OTP for ${email}: ${otp}`);
    }

    res.json({ success: true, message: 'OTP resent successfully!' });

  } catch (error) {
    console.error('Resend OTP error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to resend OTP' });
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
      return res.status(400).json({
        success: false,
        message: 'Please verify your email first',
        requiresOTP: true,
        email: email,
      });

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

module.exports = { register, verifyOTP, resendOTP, login, getPending, approve };