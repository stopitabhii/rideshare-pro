const axios = require('axios');
const Ride = require('../models/Ride');
const User = require('../models/User');
const Review = require('../models/Review');
const { calculateCarbonSaved } = require('../utils/carbon');

// ─── Helper: get distance & duration from Google Maps ────────────────────────
async function getDistanceFromMaps(from, to) {
  try {
    const key = process.env.GOOGLE_MAPS_KEY;
    if (!key) throw new Error('No Maps key');

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json`;
    const { data } = await axios.get(url, {
      params: {
        origins: from,
        destinations: to,
        units: 'metric',
        key
      }
    });

    const element = data?.rows?.[0]?.elements?.[0];
    if (!element || element.status !== 'OK') {
      throw new Error('Maps API returned no result');
    }

    return {
      distance: parseFloat((element.distance.value / 1000).toFixed(1)), // km
      duration: Math.ceil(element.duration.value / 60),                  // minutes
      fromFormatted: data.origin_addresses?.[0] || from,
      toFormatted: data.destination_addresses?.[0] || to
    };
  } catch (err) {
    console.warn('Maps distance fallback:', err.message);
    return null;
  }
}

// ─── Helper: get lat/lng from geocoding ──────────────────────────────────────
async function geocodeAddress(address) {
  try {
    const key = process.env.GOOGLE_MAPS_KEY;
    if (!key) return null;
    const { data } = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: { address, key }
    });
    const loc = data?.results?.[0]?.geometry?.location;
    return loc ? { lat: loc.lat, lng: loc.lng } : null;
  } catch {
    return null;
  }
}

// ─── Create new ride ──────────────────────────────────────────────────────────
exports.createRide = async (req, res) => {
  try {
    // Block unverified users from offering rides
    const user = await User.findById(req.userId);
    if (user.verificationStatus !== 'verified') {
      return res.status(403).json({
        error: 'Account not verified. Please upload your organisation ID card first.',
        verificationStatus: user.verificationStatus
      });
    }

    const rideData = { ...req.body, driver: req.userId };

    // Auto-calculate distance via Google Maps if key is present
    const mapsResult = await getDistanceFromMaps(rideData.from, rideData.to);
    if (mapsResult) {
      rideData.distance = mapsResult.distance;
      rideData.duration = mapsResult.duration;
    }
    // If no Maps key or API fails, keep the manually entered distance (req.body.distance)
    if (!rideData.distance) {
      return res.status(400).json({ error: 'Could not calculate distance. Please enter it manually.' });
    }

    // Geocode start/end for future proximity search
    const [fromCoords, toCoords] = await Promise.all([
      geocodeAddress(rideData.from),
      geocodeAddress(rideData.to)
    ]);
    if (fromCoords) rideData.fromCoords = fromCoords;
    if (toCoords) rideData.toCoords = toCoords;

    const ride = new Ride(rideData);
    await ride.save();

    const populatedRide = await Ride.findById(ride._id).populate('driver', '-password -idCardPublicId');

    res.status(201).json({ message: 'Ride created successfully', ride: populatedRide });
  } catch (error) {
    console.error('Create ride error:', error);
    res.status(500).json({ error: 'Server error creating ride' });
  }
};

// ─── Get distance estimate (used by frontend form before creating ride) ───────
// GET /api/rides/distance?from=...&to=...
exports.getDistanceEstimate = async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'from and to are required' });

    const result = await getDistanceFromMaps(from, to);
    if (!result) {
      return res.status(422).json({ error: 'Could not calculate distance for these locations' });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate distance' });
  }
};

// ─── Search rides ─────────────────────────────────────────────────────────────
exports.searchRides = async (req, res) => {
  try {
    const { type, from, to, organization, date } = req.query;

    let query = { status: 'scheduled' };
    if (type) query.type = type;
    if (from) query.from = new RegExp(from, 'i');
    if (to) query.to = new RegExp(to, 'i');
    if (date) {
      const d = new Date(date);
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      query.date = { $gte: d, $lt: next };
    }

    let rides = await Ride.find(query).populate('driver', '-password -idCardPublicId');

    // Filter by org — only show rides from same org as requester
    if (organization) {
      rides = rides.filter(ride => ride.driver?.organization === organization);
    }

    // Enrich with available seats count
    const enriched = rides.map(ride => ({
      ...ride.toObject(),
      availableSeats: ride.seats - ride.bookings.length
    })).filter(r => r.availableSeats > 0);

    res.json({ rides: enriched });
  } catch (error) {
    console.error('Search rides error:', error);
    res.status(500).json({ error: 'Failed to fetch rides' });
  }
};

// ─── Book a ride ──────────────────────────────────────────────────────────────
exports.bookRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const userId = req.userId;

    // Verification gate
    const user = await User.findById(userId);
    if (user.verificationStatus !== 'verified') {
      return res.status(403).json({
        error: 'Account not verified. Please upload your organisation ID card first.',
        verificationStatus: user.verificationStatus
      });
    }

    const ride = await Ride.findById(rideId).populate('driver', 'name organization verificationStatus');
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    if (ride.status !== 'scheduled') return res.status(400).json({ error: 'This ride is no longer available' });
    if (ride.driver._id.toString() === userId) return res.status(400).json({ error: 'Cannot book your own ride' });
    if (ride.bookings.includes(userId)) return res.status(400).json({ error: 'Already booked this ride' });
    if (ride.bookings.length >= ride.seats) return res.status(400).json({ error: 'No seats available' });

    // Org isolation: rider must be from same org as driver
    if (ride.driver.organization !== user.organization) {
      return res.status(403).json({ error: 'You can only book rides within your organisation' });
    }

    ride.bookings.push(userId);
    await ride.save();

    const io = req.app.get('io');
    io.emit('ride-updated', { rideId: ride._id });

    const carbonSaved = calculateCarbonSaved(ride.distance, 1, ride.type === 'bikepool' ? 'bike' : 'car');
    await User.findByIdAndUpdate(userId, {
      $inc: { carbonSaved, ridesCompleted: 1 }
    });

    // Notify driver
    io.to(`user_${ride.driver._id}`).emit('booking-notification', {
      title: 'New Booking!',
      message: `${user.name} booked your ride`,
      rideDetails: { from: ride.from, to: ride.to, date: ride.date }
    });

    const populatedRide = await Ride.findById(rideId)
      .populate('driver', '-password -idCardPublicId')
      .populate('bookings', '-password -idCardPublicId');

    res.json({ message: 'Ride booked successfully', ride: populatedRide, carbonSaved });
  } catch (error) {
    console.error('Book ride error:', error);
    res.status(500).json({ error: 'Server error booking ride' });
  }
};

// ─── Cancel booking (passenger cancels their seat) ───────────────────────────
// DELETE /api/rides/:rideId/cancel-booking
exports.cancelBooking = async (req, res) => {
  try {
    const { rideId } = req.params;
    const userId = req.userId;
    const { reason } = req.body;

    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });

    if (!ride.bookings.map(b => b.toString()).includes(userId)) {
      return res.status(400).json({ error: 'You have not booked this ride' });
    }

    // Cancellation window: allow cancel up to 30 min before ride
    const rideDateTime = new Date(ride.date);
    const [hours, minutes] = ride.time.split(':').map(Number);
    rideDateTime.setHours(hours, minutes, 0, 0);
    const minutesUntilRide = (rideDateTime - new Date()) / 60000;

    if (minutesUntilRide < 30 && ride.status === 'scheduled') {
      return res.status(400).json({
        error: 'Cannot cancel within 30 minutes of the ride. Contact your driver directly.'
      });
    }

    // Remove user from bookings
    ride.bookings = ride.bookings.filter(b => b.toString() !== userId);
    ride.cancelledBookings.push({ user: userId, reason: reason || '', cancelledAt: new Date() });
    await ride.save();

    // Reverse carbon stats
    const carbonSaved = calculateCarbonSaved(ride.distance, 1, ride.type === 'bikepool' ? 'bike' : 'car');
    await User.findByIdAndUpdate(userId, {
      $inc: { carbonSaved: -carbonSaved, ridesCompleted: -1 }
    });

    // Notify driver
    const io = req.app.get('io');
    io.to(`user_${ride.driver}`).emit('booking-cancelled', {
      message: `A passenger cancelled their seat on your ride (${ride.from} → ${ride.to})`,
      rideId: ride._id
    });
    io.emit('ride-updated', { rideId: ride._id });

    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Server error cancelling booking' });
  }
};

// ─── Cancel entire ride (driver cancels) ─────────────────────────────────────
// DELETE /api/rides/:rideId/cancel-ride
exports.cancelRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const userId = req.userId;
    const { reason } = req.body;

    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    if (ride.driver.toString() !== userId) {
      return res.status(403).json({ error: 'Only the driver can cancel this ride' });
    }
    if (['completed', 'cancelled'].includes(ride.status)) {
      return res.status(400).json({ error: `Ride is already ${ride.status}` });
    }

    // Reverse carbon stats for all booked passengers
    const carbonPerPassenger = calculateCarbonSaved(ride.distance, 1, ride.type === 'bikepool' ? 'bike' : 'car');
    for (const passengerId of ride.bookings) {
      await User.findByIdAndUpdate(passengerId, {
        $inc: { carbonSaved: -carbonPerPassenger, ridesCompleted: -1 }
      });
    }

    ride.status = 'cancelled';
    ride.cancelledAt = new Date();
    ride.cancelReason = reason || '';
    await ride.save();

    const io = req.app.get('io');
    // Notify all booked passengers
    for (const passengerId of ride.bookings) {
      io.to(`user_${passengerId}`).emit('ride-cancelled-by-driver', {
        title: 'Ride Cancelled',
        message: `Your ride from ${ride.from} to ${ride.to} has been cancelled by the driver.`,
        reason: reason || '',
        rideId: ride._id
      });
    }
    io.emit('ride-updated', { rideId: ride._id });

    res.json({ message: 'Ride cancelled successfully' });
  } catch (error) {
    console.error('Cancel ride error:', error);
    res.status(500).json({ error: 'Server error cancelling ride' });
  }
};

// ─── Complete a ride (driver marks as done) ───────────────────────────────────
// PUT /api/rides/:rideId/complete
exports.completeRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const userId = req.userId;

    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    if (ride.driver.toString() !== userId) {
      return res.status(403).json({ error: 'Only the driver can complete this ride' });
    }
    if (ride.status !== 'ongoing' && ride.status !== 'scheduled') {
      return res.status(400).json({ error: `Cannot complete a ${ride.status} ride` });
    }

    ride.status = 'completed';
    await ride.save();

    const io = req.app.get('io');
    io.to(rideId).emit('ride-status-update', {
      status: 'completed',
      message: 'Ride completed! Please rate your experience.',
      timestamp: new Date().toISOString()
    });

    // Notify passengers to leave a review
    for (const passengerId of ride.bookings) {
      io.to(`user_${passengerId}`).emit('review-reminder', {
        message: 'Your ride is complete! Rate your driver.',
        rideId: ride._id,
        driverId: ride.driver
      });
    }

    res.json({ message: 'Ride marked as completed', rideId: ride._id });
  } catch (error) {
    res.status(500).json({ error: 'Server error completing ride' });
  }
};

// ─── Get user's rides ─────────────────────────────────────────────────────────
exports.getMyRides = async (req, res) => {
  try {
    const userId = req.userId;

    const [offeredRides, bookedRides] = await Promise.all([
      Ride.find({ driver: userId })
        .populate('bookings', '-password -idCardPublicId')
        .sort({ date: -1 }),
      Ride.find({ bookings: userId })
        .populate('driver', '-password -idCardPublicId')
        .sort({ date: -1 })
    ]);

    res.json({ offeredRides, bookedRides });
  } catch (error) {
    console.error('Get my rides error:', error);
    res.status(500).json({ error: 'Server error fetching rides' });
  }
};

// ─── Get all rides (public) ───────────────────────────────────────────────────
exports.getRides = async (req, res) => {
  try {
    const rides = await Ride.find({ status: 'scheduled' }).populate('driver', 'name email organization rating');
    res.json({ rides });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching rides' });
  }
};

// ─── Organisation leaderboard ─────────────────────────────────────────────────
// GET /api/rides/leaderboard/:organization
exports.getOrgLeaderboard = async (req, res) => {
  try {
    const { organization } = req.params;

    const users = await User.find({
      organization,
      verificationStatus: 'verified',
      isActive: true
    })
      .select('name rating totalRatings carbonSaved ridesCompleted role')
      .sort({ ridesCompleted: -1, rating: -1, carbonSaved: -1 })
      .limit(20);

    // Aggregate org stats
    const orgStats = await User.aggregate([
      { $match: { organization, verificationStatus: 'verified' } },
      {
        $group: {
          _id: null,
          totalRides: { $sum: '$ridesCompleted' },
          totalCarbon: { $sum: '$carbonSaved' },
          memberCount: { $sum: 1 },
          avgRating: { $avg: '$rating' }
        }
      }
    ]);

    res.json({
      organization,
      leaderboard: users.map((u, i) => ({
        rank: i + 1,
        name: u.name,
        rating: u.rating,
        totalRatings: u.totalRatings,
        carbonSaved: u.carbonSaved,
        ridesCompleted: u.ridesCompleted,
        role: u.role
      })),
      orgStats: orgStats[0] || { totalRides: 0, totalCarbon: 0, memberCount: 0, avgRating: 0 }
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Server error fetching leaderboard' });
  }
};