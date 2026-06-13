const { createClientProfile, getClientByUserId, updateClientProfile } = require('../models/clientModel');

// ─── Create Client Profile ────────────────────────────────────────────────────
const createProfile = async (req, res) => {
  try {
    const { full_name, phone, city } = req.body;
    const userId = req.user.id;

    if (!full_name)
      return res.status(400).json({ success: false, message: 'Full name is required' });

    const existing = await getClientByUserId(userId);
    if (existing)
      return res.status(400).json({ success: false, message: 'Profile already exists' });

    const client = await createClientProfile(userId, full_name, phone, city);

    res.status(201).json({ success: true, message: 'Profile created!', client });

  } catch (error) {
    console.error('Create profile error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to create profile' });
  }
};

// ─── Get Client Profile ───────────────────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const client = await getClientByUserId(userId);

    if (!client)
      return res.status(404).json({ success: false, message: 'Profile not found' });

    res.json({ success: true, client });

  } catch (error) {
    console.error('Get profile error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to get profile' });
  }
};

// ─── Update Client Profile ────────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const { full_name, phone, city } = req.body;
    const userId = req.user.id;

    if (!full_name)
      return res.status(400).json({ success: false, message: 'Full name is required' });

    const client = await updateClientProfile(userId, full_name, phone, city);

    if (!client)
      return res.status(404).json({ success: false, message: 'Profile not found' });

    res.json({ success: true, message: 'Profile updated!', client });

  } catch (error) {
    console.error('Update profile error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

module.exports = { createProfile, getProfile, updateProfile };