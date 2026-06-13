const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static folder for uploads
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth',         require('./routes/authRoutes'));
app.use('/api/clients',      require('./routes/clientRoutes'));
app.use('/api/advocates',    require('./routes/advocateRoutes'));
app.use('/api/chat',         require('./routes/chatRoutes'));
app.use('/api/achievements', require('./routes/achievementRoutes'));
app.use('/api/client',       require('./routes/clientDashboardRoutes'));
app.use('/api/upload',       require('./routes/uploadRoutes'));

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