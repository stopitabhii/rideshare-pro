const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['carpool', 'bikepool'], required: true },
  from: { type: String, required: true },
  to: { type: String, required: true },

  // Phase 1: Auto-calculated via Maps API
  fromCoords: {
    lat: { type: Number },
    lng: { type: Number }
  },
  toCoords: {
    lat: { type: Number },
    lng: { type: Number }
  },

  date: { type: Date, required: true },
  time: { type: String, required: true },
  seats: { type: Number, required: true },
  price: { type: Number, required: true },
  distance: { type: Number, required: true },
  duration: { type: Number, default: null }, // minutes, from Maps API

  recurring: { type: Boolean, default: false },
  days: [{ type: String, enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }],
  helmetProvided: { type: Boolean, default: false },

  status: {
    type: String,
    enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
    default: 'scheduled'
  },

  bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Phase 1: Cancellation tracking
  cancelledBookings: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      cancelledAt: { type: Date, default: Date.now },
      reason: { type: String, default: '' }
    }
  ],

  // Driver cancellation
  cancelledAt: { type: Date, default: null },
  cancelReason: { type: String, default: '' },

  // Phase 1: Review tracking — who has reviewed after this ride
  reviewsGiven: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ride', rideSchema);