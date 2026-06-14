const pool = require('../config/db');

const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded'
      });
    }

    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const userId = req.user.id;
    const role = req.user.role;

    if (role === 'advocate') {
      await pool.query(
        `UPDATE advocates SET profile_image = $1 WHERE user_id = $2`,
        [base64Image, userId]
      );
    } else if (role === 'client') {
      await pool.query(
        `UPDATE clients SET profile_image = $1 WHERE user_id = $2`,
        [base64Image, userId]
      );
    }

    res.json({
      success: true,
      message: 'Profile image uploaded successfully!',
      imageUrl: base64Image,
    });

  } catch (error) {
    console.error('Upload error:', error.message);
    res.status(500).json({ success: false, message: 'Image upload failed' });
  }
};

module.exports = { uploadProfileImage };