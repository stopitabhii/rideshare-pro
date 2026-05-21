const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  ride: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
    required: true
  },
  payer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  payee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'refunded', 'failed'],
    default: 'pending'
  },
  method: {
    type: String,
    enum: ['upi', 'cash', 'wallet', 'none'],
    default: 'cash'
  },
  transactionId: {
    type: String,
    default: null
  },
  note: {
    type: String,
    default: ''
  },
  completedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

paymentSchema.index({ ride: 1, payer: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
