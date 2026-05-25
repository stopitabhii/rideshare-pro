const Report = require('../models/Report');
const User = require('../models/User');

// ─── Submit a report ──────────────────────────────────────────────────────────
exports.createReport = async (req, res) => {
  try {
    const { reportedUserId, rideId, reason, description } = req.body;
    const reporterId = req.userId;

    if (reporterId === reportedUserId) {
      return res.status(400).json({ error: 'Cannot report yourself' });
    }

    // Check for duplicate recent report
    const existing = await Report.findOne({
      reporter: reporterId,
      reportedUser: reportedUserId,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    if (existing) {
      return res.status(400).json({ error: 'You already reported this user recently' });
    }

    const report = new Report({
      reporter: reporterId,
      reportedUser: reportedUserId,
      ride: rideId || undefined,
      reason,
      description: description || '',
    });
    await report.save();

    // Increment report count on target user
    await User.findByIdAndUpdate(reportedUserId, { $inc: { reportCount: 1 } });

    res.status(201).json({ message: 'Report submitted. We will review it within 24 hours.', report });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit report' });
  }
};

// ─── Get my reports ──────────────────────────────────────────────────────────
exports.getMyReports = async (req, res) => {
  try {
    const reports = await Report.find({ reporter: req.userId })
      .populate('reportedUser', 'name')
      .sort({ createdAt: -1 });
    res.json({ reports });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── Block a user ─────────────────────────────────────────────────────────────
exports.blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId === req.userId) return res.status(400).json({ error: 'Cannot block yourself' });

    await User.findByIdAndUpdate(req.userId, { $addToSet: { blockedUsers: userId } });
    res.json({ message: 'User blocked' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── Unblock a user ──────────────────────────────────────────────────────────
exports.unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    await User.findByIdAndUpdate(req.userId, { $pull: { blockedUsers: userId } });
    res.json({ message: 'User unblocked' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── List blocked users ──────────────────────────────────────────────────────
exports.getBlockedUsers = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('blockedUsers', 'name email organization');
    res.json({ blockedUsers: user.blockedUsers || [] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
