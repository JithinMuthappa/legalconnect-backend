const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const pool = require('./config/db');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true }));

// Static folder for uploads
app.use('/uploads', express.static('uploads'));

// Ensure login Bar Council column exists before routes are mounted
(async () => {
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS login_bar_council_number TEXT`);
    await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_data TEXT`);
    await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_name TEXT`);
    await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_type TEXT`);
    console.log('✅ Ensured users.login_bar_council_number exists');
  } catch (error) {
    console.error('❌ Failed to create users.login_bar_council_number column:', error.message);
    process.exit(1);
  }
})();

// Routes
app.use('/api/auth',         require('./routes/authRoutes'));
app.use('/api/clients',      require('./routes/clientRoutes'));
app.use('/api/advocates',    require('./routes/advocateRoutes'));
app.use('/api/chat',         require('./routes/chatRoutes'));
app.use('/api/achievements', require('./routes/achievementRoutes'));
app.use('/api/client',       require('./routes/clientDashboardRoutes'));
app.use('/api/upload',       require('./routes/uploadRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/news', require('./routes/newsRoutes'));

// Health Check
app.get('/', (req, res) => {
  res.json({ message: 'LegalConnect API is running ✅', version: '1.0.0' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 LegalConnect server running on port ${PORT}`);
});