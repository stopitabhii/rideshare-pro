const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['carpool', 'bikepool'], required: true },
  from: { type: String, required: true },
  to: { type: String, required: true },

  fromCoords: { lat: Number, lng: Number },
  toCoords:   { lat: Number, lng: Number },

  date:     { type: Date,   required: true },
  time:     { type: String, required: true },
  seats:    { type: Number, required: true },
  price:    { type: Number, required: true },
  distance: { type: Number, required: true },
  duration: { type: Number, default: null }, // minutes, from Maps API

  recurring:       { type: Boolean, default: false },
  days:            [{ type: String, enum: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] }],
  helmetProvided:  { type: Boolean, default: false },

  // public  → any verified org-member can book instantly
  // private → passengers must REQUEST; driver approves/declines
  visibility: {
    type: String,
    enum: ['public', 'private'],
    default: 'public',
  },

  status: {
    type: String,
    enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
    default: 'scheduled',
  },

  bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Private-ride request queue
  pendingBookings: [
    {
      user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      requestedAt: { type: Date, default: Date.now },
      message:     { type: String, default: '' },
    }
  ],

  // Cancellation tracking
  cancelledBookings: [
    {
      user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      cancelledAt: { type: Date, default: Date.now },
      reason:      { type: String, default: '' },
    }
  ],

  cancelledAt:  { type: Date,   default: null },
  cancelReason: { type: String, default: '' },

  // Review tracking
  reviewsGiven: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Ride', rideSchema);