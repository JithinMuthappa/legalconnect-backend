const { getAllAdvocates, searchAdvocates, getAdvocateWithAchievements } = require('../models/advocateModel');
const { getClientByUserId } = require('../models/clientModel');

// ─── Client Dashboard ─────────────────────────────────────────────────────────
const getDashboard = async (req, res) => {
  try {
    const client = await getClientByUserId(req.user.id);
    if (!client)
      return res.status(404).json({ success: false, message: 'Client profile not found' });

    const advocates = await getAllAdvocates();

    res.json({
      success: true,
      dashboard: {
        client,
        totalAdvocates: advocates.length,
        recentAdvocates: advocates.slice(0, 5),
      },
    });

  } catch (error) {
    console.error('Dashboard error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load dashboard' });
  }
};

// ─── Search Advocates ─────────────────────────────────────────────────────────
const search = async (req, res) => {
  try {
    const { specialization, city } = req.query;
    const advocates = await searchAdvocates(specialization, city);

    res.json({
      success: true,
      count: advocates.length,
      advocates,
    });

  } catch (error) {
    console.error('Search error:', error.message);
    res.status(500).json({ success: false, message: 'Search failed' });
  }
};

// ─── Get Advocate Full Profile with Achievements ──────────────────────────────
const getAdvocateFullProfile = async (req, res) => {
  try {
    const advocate = await getAdvocateWithAchievements(req.params.id);
    if (!advocate)
      return res.status(404).json({ success: false, message: 'Advocate not found' });

    res.json({ success: true, advocate });

  } catch (error) {
    console.error('Full profile error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to get advocate profile' });
  }
};

module.exports = { getDashboard, search, getAdvocateFullProfile };