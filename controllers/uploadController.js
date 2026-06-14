const pool = require('../config/db');

const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No image file uploaded' 
      });
    }

    // Convert image to base64
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    // Update advocate profile image in database
    await pool.query(
      `UPDATE advocates SET profile_image = $1 WHERE user_id = $2`,
      [base64Image, req.user.id]
    );

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