const {
  addAchievement,
  getAchievementsByAdvocateId,
  updateAchievement,
  deleteAchievement,
} = require('../models/achievementModel');
const { getAdvocateByUserId } = require('../models/advocateModel');

// ─── Add Achievement ──────────────────────────────────────────────────────────
const add = async (req, res) => {
  try {
    const { title, description, year } = req.body;

    if (!title || !year)
      return res.status(400).json({ success: false, message: 'Title and year are required' });

    const advocate = await getAdvocateByUserId(req.user.id);
    if (!advocate)
      return res.status(404).json({ success: false, message: 'Advocate profile not found' });

    const achievement = await addAchievement(advocate.id, title, description, year);
    res.status(201).json({ success: true, message: 'Achievement added!', achievement });

  } catch (error) {
    console.error('Add achievement error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to add achievement' });
  }
};

// ─── Get Achievements ─────────────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const advocateId = req.params.advocateId;
    const achievements = await getAchievementsByAdvocateId(advocateId);
    res.json({ success: true, achievements });

  } catch (error) {
    console.error('Get achievements error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to get achievements' });
  }
};

// ─── Update Achievement ───────────────────────────────────────────────────────
const update = async (req, res) => {
  try {
    const { title, description, year } = req.body;
    const { id } = req.params;

    if (!title || !year)
      return res.status(400).json({ success: false, message: 'Title and year are required' });

    const advocate = await getAdvocateByUserId(req.user.id);
    if (!advocate)
      return res.status(404).json({ success: false, message: 'Advocate profile not found' });

    const achievement = await updateAchievement(id, advocate.id, title, description, year);
    if (!achievement)
      return res.status(404).json({ success: false, message: 'Achievement not found' });

    res.json({ success: true, message: 'Achievement updated!', achievement });

  } catch (error) {
    console.error('Update achievement error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update achievement' });
  }
};

// ─── Delete Achievement ───────────────────────────────────────────────────────
const remove = async (req, res) => {
  try {
    const { id } = req.params;

    const advocate = await getAdvocateByUserId(req.user.id);
    if (!advocate)
      return res.status(404).json({ success: false, message: 'Advocate profile not found' });

    const achievement = await deleteAchievement(id, advocate.id);
    if (!achievement)
      return res.status(404).json({ success: false, message: 'Achievement not found' });

    res.json({ success: true, message: 'Achievement deleted!' });

  } catch (error) {
    console.error('Delete achievement error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to delete achievement' });
  }
};

module.exports = { add, getAll, update, remove };