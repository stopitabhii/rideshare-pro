const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { uploadToCloudinary, getSignedUrl, deleteFromCloudinary } = require('../config/cloudinary');

// ─── Register new user ────────────────────────────────────────────────────────
exports.signup = async (req, res) => {
  try {
    const { name, email, password, phone, organization, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      organization,
      role,
      verificationStatus: 'pending'
    });

    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });

    res.status(201).json({
      message: 'User registered successfully. Please upload your organisation ID card to start riding.',
      token,
      user: _publicUser(user)
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });

    res.json({
      message: 'Login successful',
      token,
      user: _publicUser(user)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
};

// ─── Get current user ─────────────────────────────────────────────────────────
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password -idCardPublicId');
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── Upload ID card for verification ─────────────────────────────────────────
// POST /api/auth/verify-id   (multipart/form-data, field: idCard)
exports.uploadIdCard = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No ID card file uploaded' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Delete old upload from Cloudinary if it exists
    if (user.idCardPublicId) {
      await deleteFromCloudinary(user.idCardPublicId);
    }

    // Stream buffer to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, {
      public_id: `user_${req.userId}_id`,
      overwrite: true
    });

    user.idCardUrl = result.secure_url;
    user.idCardPublicId = result.public_id;
    user.verificationStatus = 'under_review';
    user.verificationNote = null;
    await user.save();

    res.json({
      message: 'ID card uploaded successfully. Our team will verify your account within 24 hours.',
      verificationStatus: user.verificationStatus
    });
  } catch (error) {
    console.error('ID upload error:', error);
    res.status(500).json({ error: 'Failed to upload ID card' });
  }
};

// ─── Admin: list users pending verification ───────────────────────────────────
// GET /api/auth/admin/pending-verifications
exports.getPendingVerifications = async (req, res) => {
  try {
    // Simple admin check via env secret header
    if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const users = await User.find({ verificationStatus: 'under_review' })
      .select('-password')
      .sort({ createdAt: 1 });

    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── Admin: approve or reject verification ────────────────────────────────────
// POST /api/auth/admin/verify/:userId
exports.adminVerifyUser = async (req, res) => {
  try {
    if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { action, note } = req.body; // action: 'approve' | 'reject'
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'action must be approve or reject' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.verificationStatus = action === 'approve' ? 'verified' : 'rejected';
    user.verificationNote = note || null;
    user.verifiedAt = action === 'approve' ? new Date() : null;
    await user.save();

    res.json({
      message: `User ${action === 'approve' ? 'verified' : 'rejected'} successfully`,
      user: _publicUser(user)
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── Admin: get signed Cloudinary URL to view ID card ────────────────────────
// GET /api/auth/admin/id-card/:userId
exports.adminViewIdCard = async (req, res) => {
  try {
    if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const user = await User.findById(req.params.userId).select('idCardPublicId idCardUrl name');
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.idCardPublicId) return res.status(404).json({ error: 'No ID card uploaded' });

    const signedUrl = getSignedUrl(user.idCardPublicId);
    res.json({ signedUrl, userName: user.name });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── Update trusted contacts ──────────────────────────────────────────────────
// PUT /api/auth/trusted-contacts
exports.updateTrustedContacts = async (req, res) => {
  try {
    const { trustedContacts } = req.body;

    if (!Array.isArray(trustedContacts)) {
      return res.status(400).json({ error: 'trustedContacts must be an array' });
    }
    if (trustedContacts.length > 3) {
      return res.status(400).json({ error: 'Maximum 3 trusted contacts allowed' });
    }

    for (const c of trustedContacts) {
      if (!c.name || !c.phone) {
        return res.status(400).json({ error: 'Each contact needs a name and phone' });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { trustedContacts },
      { new: true }
    ).select('-password -idCardPublicId');

    res.json({ message: 'Trusted contacts updated', trustedContacts: user.trustedContacts });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── Helper: safe user object for responses ───────────────────────────────────
function _publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    organization: user.organization,
    role: user.role,
    rating: user.rating,
    totalRatings: user.totalRatings,
    carbonSaved: user.carbonSaved,
    ridesCompleted: user.ridesCompleted,
    verificationStatus: user.verificationStatus,
    verificationNote: user.verificationNote,
    trustedContacts: user.trustedContacts
  };
}