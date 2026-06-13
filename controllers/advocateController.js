const {
  createAdvocateProfile,
  getAdvocateByUserId,
  updateAdvocateProfile,
  getAllAdvocates,
  getAdvocateById,
} = require('../models/advocateModel');

// ─── Create Advocate Profile ──────────────────────────────────────────────────
const createProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { full_name, phone, city, specialization, experience_years, bio, bar_council_number } = req.body;

    if (!full_name || !specialization || !bar_council_number)
      return res.status(400).json({ success: false, message: 'Full name, specialization and bar council number are required' });

    const existing = await getAdvocateByUserId(userId);
    if (existing)
      return res.status(400).json({ success: false, message: 'Profile already exists' });

    const advocate = await createAdvocateProfile(userId, req.body);
    res.status(201).json({ success: true, message: 'Advocate profile created!', advocate });

  } catch (error) {
    console.error('Create advocate error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to create profile' });
  }
};

// ─── Get My Advocate Profile ──────────────────────────────────────────────────
const getMyProfile = async (req, res) => {
  try {
    const advocate = await getAdvocateByUserId(req.user.id);
    if (!advocate)
      return res.status(404).json({ success: false, message: 'Profile not found' });

    res.json({ success: true, advocate });

  } catch (error) {
    console.error('Get advocate error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to get profile' });
  }
};

// ─── Update Advocate Profile ──────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const { full_name, specialization, bar_council_number } = req.body;

    if (!full_name || !specialization || !bar_council_number)
      return res.status(400).json({ success: false, message: 'Full name, specialization and bar council number are required' });

    const advocate = await updateAdvocateProfile(req.user.id, req.body);
    if (!advocate)
      return res.status(404).json({ success: false, message: 'Profile not found' });

    res.json({ success: true, message: 'Profile updated!', advocate });

  } catch (error) {
    console.error('Update advocate error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

// ─── Get All Advocates (for clients to browse) ────────────────────────────────
const getAllAdvocatesList = async (req, res) => {
  try {
    const advocates = await getAllAdvocates();
    res.json({ success: true, advocates });

  } catch (error) {
    console.error('Get all advocates error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to get advocates' });
  }
};

// ─── Get Single Advocate by ID ────────────────────────────────────────────────
const getAdvocateDetails = async (req, res) => {
  try {
    const advocate = await getAdvocateById(req.params.id);
    if (!advocate)
      return res.status(404).json({ success: false, message: 'Advocate not found' });

    res.json({ success: true, advocate });

  } catch (error) {
    console.error('Get advocate details error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to get advocate' });
  }
};

module.exports = { createProfile, getMyProfile, updateProfile, getAllAdvocatesList, getAdvocateDetails };