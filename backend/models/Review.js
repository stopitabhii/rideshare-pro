const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reviewee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ride: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    maxlength: 500,
    default: ''
  },
  // Who is being reviewed in context of this ride
  revieweeRole: {
    type: String,
    enum: ['driver', 'passenger'],
    required: true
  },
  tags: [
    {
      type: String,
      enum: [
        'punctual', 'safe_driver', 'friendly', 'clean_vehicle',
        'good_conversation', 'music_ok', 'on_time',
        'respectful', 'reliable', 'recommended'
      ]
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

// One review per reviewer per ride per reviewee
reviewSchema.index({ reviewer: 1, ride: 1, reviewee: 1 }, { unique: true });

// After saving a review, update the reviewee's average rating
reviewSchema.post('save', async function () {
  try {
    const User = mongoose.model('User');
    const Review = mongoose.model('Review');

    const stats = await Review.aggregate([
      { $match: { reviewee: this.reviewee } },
      {
        $group: {
          _id: '$reviewee',
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 }
        }
      }
    ]);

    if (stats.length > 0) {
      await User.findByIdAndUpdate(this.reviewee, {
        rating: parseFloat(stats[0].avgRating.toFixed(1)),
        totalRatings: stats[0].count
      });
    }
  } catch (err) {
    console.error('Rating update error:', err.message);
  }
});

module.exports = mongoose.model('Review', reviewSchema);