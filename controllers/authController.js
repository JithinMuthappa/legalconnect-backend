const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const pool = require('../config/db');
const { createUser, findUserByEmail, markUserVerified, saveOTP, verifyUserOTP, needsApprovalEmail, markApprovalEmailSent, approveAdvocate, updateLoginBarCouncilNumber, getPendingAdvocates } = require('../models/userModel');
const { generateOTP, getOTPExpiry } = require('../utils/generateOTP');

// ─── Email Transporter ────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp-relay.brevo.com',
  port: Number(process.env.EMAIL_PORT || 587),
  secure: process.env.EMAIL_SECURE === 'true',
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 20000,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ─── Send OTP Email ───────────────────────────────────────────────────────────
const sendOTPEmail = async (email, otp) => {
  if (!process.env.EMAIL_FROM) {
    throw new Error('Email service is not configured');
  }

  const subject = 'LegalConnect - Verify Your Email';
  const html = `
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
    `;

  // The HTTPS API uses port 443, which is more reliable than SMTP from cloud hosts.
  if (process.env.BREVO_API_KEY) {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: 'LegalConnect', email: process.env.EMAIL_FROM },
        to: [{ email }],
        subject,
        htmlContent: html,
      }),
    });

    if (!response.ok) {
      throw new Error(`Brevo API request failed (${response.status}): ${await response.text()}`);
    }
    return;
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Email service is not configured');
  }

  await transporter.sendMail({
    from: `"LegalConnect" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject,
    html,
  });
};

// Sent when registration status changes. It reuses the configured email
// provider so client and advocate emails follow the same setup as OTP emails.
const sendRegistrationStatusEmail = async (email, role, isApproved = false) => {
  if (!process.env.EMAIL_FROM) {
    throw new Error('Email service is not configured');
  }

  const isAdvocate = role === 'advocate';
  const subject = isAdvocate
    ? isApproved
      ? 'LegalConnect - Your Account Has Been Approved'
      : 'LegalConnect - Your Account Is Under Review'
    : 'LegalConnect - Account Created Successfully';
  const heading = isAdvocate
    ? isApproved
      ? 'Your Account Has Been Approved'
      : 'Your Account Is Under Review'
    : 'Account Created Successfully';
  const message = isAdvocate
    ? isApproved
      ? 'Your advocate account has been approved. You can now log in to LegalConnect.'
      : 'Your email has been verified and your advocate account is now under admin review. Please try logging in after 24 hours.'
    : 'Your email has been verified and your LegalConnect account has been created successfully. You can now log in and start using your account.';
  const html = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 30px; background: #1A1A2E; color: white; border-radius: 10px;">
        <h1 style="color: #D4AF37; text-align: center;">LegalConnect</h1>
        <h2 style="color: white;">${heading}</h2>
        <p style="color: #B0B0C0;">${message}</p>
      </div>
    `;

  if (process.env.BREVO_API_KEY) {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: 'LegalConnect', email: process.env.EMAIL_FROM },
        to: [{ email }],
        subject,
        htmlContent: html,
      }),
    });

    if (!response.ok) {
      throw new Error(`Brevo API request failed (${response.status}): ${await response.text()}`);
    }
    return;
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Email service is not configured');
  }

  await transporter.sendMail({
    from: `"LegalConnect" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject,
    html,
  });
};

const sendAdvocateApprovalEmailIfNeeded = async (email) => {
  if (!await needsApprovalEmail(email)) return;

  await sendRegistrationStatusEmail(email, 'advocate', true);
  await markApprovalEmailSent(email);
  console.log(`Advocate approval email sent to ${email}`);
};

// ─── Register ─────────────────────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role)
      return res.status(400).json({ success: false, message: 'All fields are required' });

    const existingUser = await findUserByEmail(email);
    if (existingUser && existingUser.is_verified)
      return res.status(400).json({ success: false, message: 'Email already registered' });

    if (existingUser) {
      const otp = generateOTP();
      const expiresAt = getOTPExpiry();

      try {
        await sendOTPEmail(email, otp);
        await saveOTP(email, otp, expiresAt);
        return res.json({
          success: true,
          message: 'A new OTP has been sent to your email.',
          requiresOTP: true,
          role: existingUser.role,
        });
      } catch (emailError) {
        console.error('Pending registration email failed:', emailError.message);
        return res.status(502).json({
          success: false,
          message: 'Unable to send OTP email. Please verify the email service configuration and try again.',
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUser(email, hashedPassword, role);

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = getOTPExpiry();
    await saveOTP(email, otp, expiresAt);

    // Send OTP email
    try {
      await sendOTPEmail(email, otp);
      console.log(`✅ OTP email sent to ${email}`);
    } catch (emailError) {
      console.error('Email send failed:', emailError.message);
      // Delete user if email fails
      await pool.query(`DELETE FROM users WHERE email = $1`, [email]);
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please check your email address and try again.',
      });
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

    const verifiedUser = await findUserByEmail(email);

    // Confirmation delivery must not alter an already successful verification.
    // This keeps the current client and advocate flows unchanged if mail is down.
    try {
      await sendRegistrationStatusEmail(email, verifiedUser.role);
      console.log(`Registration-status email sent to ${email}`);
    } catch (emailError) {
      console.error('Account-created email failed:', emailError.message);
    }

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

    if (user.is_verified)
      return res.status(400).json({ success: false, message: 'Email is already verified' });

    const otp = generateOTP();
    const expiresAt = getOTPExpiry();

    try {
      await sendOTPEmail(email, otp);
      await saveOTP(email, otp, expiresAt);
      console.log(`✅ OTP resent to ${email}`);
    } catch (emailError) {
      console.error('Resend email failed:', emailError.message);
      return res.status(502).json({
        success: false,
        message: 'Unable to send OTP email. Please try again later.',
      });
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

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ success: false, message: 'Invalid credentials' });

    if (user.role === 'advocate' && req.body.bar_council_number) {
      await updateLoginBarCouncilNumber(user.id, req.body.bar_council_number);
    }

    if (user.role === 'advocate' && !user.is_approved) {
      return res.status(403).json({
        success: false,
        message: 'Your application is under review. Please wait for admin approval.',
        isPending: true,
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Covers advocates approved directly in the database. A temporary mail
    // issue never blocks a valid login, and later logins will retry delivery.
    if (user.role === 'advocate') {
      sendAdvocateApprovalEmailIfNeeded(email).catch((emailError) => {
        console.error('Advocate approval email retry failed:', emailError.message);
      });
    }

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

    // If delivery fails, the advocate's first successful login will retry it.
    try {
      await sendAdvocateApprovalEmailIfNeeded(email);
    } catch (emailError) {
      console.error('Advocate approval email failed:', emailError.message);
    }

    res.json({ success: true, message: `Advocate ${email} approved!` });
  } catch (error) {
    console.error('Approve error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to approve' });
  }
};

module.exports = { register, verifyOTP, resendOTP, login, getPending, approve };
