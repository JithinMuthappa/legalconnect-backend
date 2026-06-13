const pool = require('../config/db');

const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ success: false, message: 'No image file uploaded' });

    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    // Update advocate profile image in database
    await pool.query(
      `UPDATE advocates SET profile_image = $1 WHERE user_id = $2`,
      [imageUrl, req.user.id]
    );

    res.json({
      success: true,
      message: 'Profile image uploaded successfully!',
      imageUrl,
    });

  } catch (error) {
    console.error('Upload error:', error.message);
    res.status(500).json({ success: false, message: 'Image upload failed' });
  }
};

module.exports = { uploadProfileImage };