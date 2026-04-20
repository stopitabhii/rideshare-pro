const Review = require('../models/Review');
const Ride = require('../models/Ride');
const User = require('../models/User');

// ─── Submit a review after a completed ride ───────────────────────────────────
// POST /api/reviews/:rideId
exports.submitReview = async (req, res) => {
  try {
    const { rideId } = req.params;
    const reviewerId = req.userId;
    const { revieweeId, rating, comment, tags } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });

    // Only allow reviews for completed rides
    if (ride.status !== 'completed') {
      return res.status(400).json({ error: 'You can only review completed rides' });
    }

    const driverId = ride.driver.toString();
    const passengerIds = ride.bookings.map(b => b.toString());
    const allParticipants = [driverId, ...passengerIds];

    // Reviewer must be part of the ride
    if (!allParticipants.includes(reviewerId)) {
      return res.status(403).json({ error: 'You were not part of this ride' });
    }

    // Reviewee must be part of the ride
    if (!allParticipants.includes(revieweeId)) {
      return res.status(400).json({ error: 'Reviewee was not part of this ride' });
    }

    // Can't review yourself
    if (reviewerId === revieweeId) {
      return res.status(400).json({ error: 'You cannot review yourself' });
    }

    // Determine the role of reviewee
    const revieweeRole = revieweeId === driverId ? 'driver' : 'passenger';

    // Check for duplicate review
    const existing = await Review.findOne({ reviewer: reviewerId, ride: rideId, reviewee: revieweeId });
    if (existing) {
      return res.status(400).json({ error: 'You have already reviewed this person for this ride' });
    }

    const review = new Review({
      reviewer: reviewerId,
      reviewee: revieweeId,
      ride: rideId,
      rating,
      comment: comment || '',
      revieweeRole,
      tags: tags || []
    });

    await review.save();

    // Track that reviewer has given a review for this ride
    await Ride.findByIdAndUpdate(rideId, {
      $addToSet: { reviewsGiven: reviewerId }
    });

    res.status(201).json({
      message: 'Review submitted successfully',
      review
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'You have already reviewed this person for this ride' });
    }
    console.error('Submit review error:', error);
    res.status(500).json({ error: 'Server error submitting review' });
  }
};

// ─── Get reviews for a user ───────────────────────────────────────────────────
// GET /api/reviews/user/:userId
exports.getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find({ reviewee: userId })
        .populate('reviewer', 'name organization rating')
        .populate('ride', 'from to date type')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments({ reviewee: userId })
    ]);

    // Aggregate rating breakdown
    const breakdown = await Review.aggregate([
      { $match: { reviewee: require('mongoose').Types.ObjectId.createFromHexString(userId) } },
      { $group: { _id: '$rating', count: { $sum: 1 } } }
    ]);

    const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    breakdown.forEach(b => { ratingBreakdown[b._id] = b.count; });

    const user = await User.findById(userId).select('name rating totalRatings');

    res.json({
      user: { name: user?.name, rating: user?.rating, totalRatings: user?.totalRatings },
      ratingBreakdown,
      reviews,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Server error fetching reviews' });
  }
};

// ─── Get pending reviews for current user (rides completed, not yet reviewed) ─
// GET /api/reviews/pending
exports.getPendingReviews = async (req, res) => {
  try {
    const userId = req.userId;

    // Find completed rides where user participated but hasn't reviewed all participants
    const completedRides = await Ride.find({
      status: 'completed',
      $or: [{ driver: userId }, { bookings: userId }]
    })
      .populate('driver', 'name rating organization')
      .populate('bookings', 'name rating organization')
      .sort({ date: -1 })
      .limit(20);

    const pendingReviews = [];

    for (const ride of completedRides) {
      const driverId = ride.driver._id.toString();
      const passengerIds = ride.bookings.map(b => b._id.toString());
      const allParticipants = [
        { user: ride.driver, role: 'driver' },
        ...ride.bookings.map(b => ({ user: b, role: 'passenger' }))
      ];

      // Find who this user hasn't reviewed yet
      const existingReviews = await Review.find({
        reviewer: userId,
        ride: ride._id
      }).select('reviewee');

      const alreadyReviewed = new Set(existingReviews.map(r => r.reviewee.toString()));

      for (const { user: participant, role } of allParticipants) {
        if (participant._id.toString() !== userId && !alreadyReviewed.has(participant._id.toString())) {
          pendingReviews.push({
            ride: {
              _id: ride._id,
              from: ride.from,
              to: ride.to,
              date: ride.date,
              type: ride.type
            },
            reviewee: {
              _id: participant._id,
              name: participant.name,
              rating: participant.rating,
              organization: participant.organization,
              role
            }
          });
        }
      }
    }

    res.json({ pendingReviews });
  } catch (error) {
    console.error('Pending reviews error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};