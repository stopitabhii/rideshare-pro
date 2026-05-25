const User = require('../models/User');
const Ride = require('../models/Ride');
const Report = require('../models/Report');
const Review = require('../models/Review');

// Middleware: check admin
const requireAdmin = async (req, res, next) => {
  // Check JWT-based admin OR secret header
  if (req.user?.isAdmin || req.headers['x-admin-secret'] === process.env.ADMIN_SECRET) {
    return next();
  }
  return res.status(403).json({ error: 'Admin access required' });
};

// ─── Platform stats ───────────────────────────────────────────────────────────
const getStats = async (req, res) => {
  try {
    const [totalUsers, totalRides, pendingVerifications, openReports, totalReviews, activeRides] = await Promise.all([
      User.countDocuments(),
      Ride.countDocuments(),
      User.countDocuments({ verificationStatus: 'under_review' }),
      Report.countDocuments({ status: { $in: ['pending', 'reviewing'] } }),
      Review.countDocuments(),
      Ride.countDocuments({ status: { $in: ['scheduled', 'ongoing'] } }),
    ]);

    const [usersByStatus] = await User.aggregate([
      { $group: { _id: '$verificationStatus', count: { $sum: 1 } } },
    ]);

    const recentUsers = await User.find()
      .select('name email organization verificationStatus createdAt gender')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      totalUsers, totalRides, pendingVerifications, openReports,
      totalReviews, activeRides, recentUsers,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── List users (paginated) ──────────────────────────────────────────────────
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, org, search, role } = req.query;
    const query = {};
    if (status) query.verificationStatus = status;
    if (org) query.organization = org;
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -idCardPublicId')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      User.countDocuments(query),
    ]);

    res.json({ users, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── Ban / unban user ─────────────────────────────────────────────────────────
const banUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { ban, reason } = req.body; // ban: true/false

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.isBanned = !!ban;
    await user.save();

    // If banning, cancel all their active rides
    if (ban) {
      await Ride.updateMany(
        { driver: userId, status: { $in: ['scheduled', 'ongoing'] } },
        { status: 'cancelled', cancelReason: 'Driver account suspended', cancelledAt: new Date() }
      );
    }

    res.json({ message: `User ${ban ? 'banned' : 'unbanned'} successfully`, isBanned: user.isBanned });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── Get reports ──────────────────────────────────────────────────────────────
const getReports = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = {};
    if (status) query.status = status;

    const [reports, total] = await Promise.all([
      Report.find(query)
        .populate('reporter', 'name email organization')
        .populate('reportedUser', 'name email organization isBanned')
        .populate('ride', 'from to date')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Report.countDocuments(query),
    ]);

    res.json({ reports, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── Resolve report ──────────────────────────────────────────────────────────
const resolveReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { resolution, action } = req.body; // action: 'warn' | 'ban' | 'dismiss'

    const report = await Report.findById(reportId);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    report.status = action === 'dismiss' ? 'dismissed' : 'resolved';
    report.resolution = resolution || '';
    report.resolvedBy = req.user?._id || req.userId;
    report.resolvedAt = new Date();
    await report.save();

    // If action is ban, ban the reported user
    if (action === 'ban') {
      await User.findByIdAndUpdate(report.reportedUser, { isBanned: true });
      await Ride.updateMany(
        { driver: report.reportedUser, status: { $in: ['scheduled', 'ongoing'] } },
        { status: 'cancelled', cancelReason: 'Account suspended', cancelledAt: new Date() }
      );
    }

    res.json({ message: 'Report resolved', report });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── Admin rides overview ─────────────────────────────────────────────────────
const getAdminRides = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = {};
    if (status) query.status = status;

    const [rides, total] = await Promise.all([
      Ride.find(query)
        .populate('driver', 'name email organization')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Ride.countDocuments(query),
    ]);

    res.json({ rides, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { requireAdmin, getStats, getUsers, banUser, getReports, resolveReport, getAdminRides };
