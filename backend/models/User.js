const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  organization: { type: String, required: true },
  role: { type: String, enum: ['rider', 'driver', 'both'], required: true },
  rating: { type: Number, default: 5.0 },
  totalRatings: { type: Number, default: 0 },
  carbonSaved: { type: Number, default: 0 },
  ridesCompleted: { type: Number, default: 0 },

  // Phase 1: Identity Verification
  verificationStatus: {
    type: String,
    enum: ['pending', 'under_review', 'verified', 'rejected'],
    default: 'pending'
  },
  idCardUrl: { type: String, default: null },
  idCardPublicId: { type: String, default: null }, // Cloudinary public_id
  verificationNote: { type: String, default: null }, // Admin rejection reason
  verifiedAt: { type: Date, default: null },

  // Phase 2: Safety
  trustedContacts: [
    {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      relation: { type: String, default: 'Emergency Contact' }
    }
  ],

  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Virtual: can this user book/offer rides?
userSchema.virtual('canRide').get(function () {
  return this.verificationStatus === 'verified';
});

module.exports = mongoose.model('User', userSchema);