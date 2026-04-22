const axios = require('axios');
const Ride   = require('../models/Ride');
const User   = require('../models/User');
const Review = require('../models/Review');
const { calculateCarbonSaved } = require('../utils/carbon');

async function getDistanceFromMaps(from, to) {
  try {
    // Geocode both addresses first
    const geocode = async (address) => {
      const { data } = await axios.get(
        `https://api.openrouteservice.org/geocode/search`,
        { params: { api_key: process.env.ORS_API_KEY, text: address, size: 1 } }
      );
      const coords = data?.features?.[0]?.geometry?.coordinates;
      return coords ? [coords[0], coords[1]] : null;
    };

    const [fromCoords, toCoords] = await Promise.all([geocode(from), geocode(to)]);
    if (!fromCoords || !toCoords) throw new Error('Geocoding failed');

    const { data } = await axios.post(
      'https://api.openrouteservice.org/v2/directions/driving-car',
      { coordinates: [fromCoords, toCoords] },
      { headers: { Authorization: process.env.ORS_API_KEY } }
    );

    const summary = data?.routes?.[0]?.summary;
    if (!summary) throw new Error('No route found');

    return {
      distance: parseFloat((summary.distance / 1000).toFixed(1)),
      duration: Math.ceil(summary.duration / 60),
      fromFormatted: from,
      toFormatted: to,
    };
  } catch (err) {
    console.warn('ORS distance fallback:', err.message);
    return null;
  }
}

// ─── Create ride ──────────────────────────────────────────────────────────────
exports.createRide = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.verificationStatus !== 'verified') {
      return res.status(403).json({
        error: 'Account not verified. Please upload your organisation ID card first.',
        verificationStatus: user.verificationStatus
      });
    }

    const rideData = { ...req.body, driver: req.userId };

    const mapsResult = await getDistanceFromMaps(rideData.from, rideData.to);
    if (mapsResult) {
      rideData.distance = mapsResult.distance;
      rideData.duration = mapsResult.duration;
    }
    if (!rideData.distance) {
      return res.status(400).json({ error: 'Could not calculate distance. Please enter it manually.' });
    }

    const [fromCoords, toCoords] = await Promise.all([
      geocodeAddress(rideData.from),
      geocodeAddress(rideData.to),
    ]);
    if (fromCoords) rideData.fromCoords = fromCoords;
    if (toCoords)   rideData.toCoords   = toCoords;

    const ride = new Ride(rideData);
    await ride.save();

    const populated = await Ride.findById(ride._id).populate('driver', '-password -idCardPublicId');
    res.status(201).json({ message: 'Ride created successfully', ride: populated });
  } catch (err) {
    console.error('Create ride error:', err);
    res.status(500).json({ error: 'Server error creating ride' });
  }
};

// ─── Distance estimate ────────────────────────────────────────────────────────
exports.getDistanceEstimate = async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'from and to are required' });
    const result = await getDistanceFromMaps(from, to);
    if (!result) return res.status(422).json({ error: 'Could not calculate distance for these locations' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate distance' });
  }
};

// ─── Search rides ─────────────────────────────────────────────────────────────
exports.searchRides = async (req, res) => {
  try {
    const { type, from, to, organization, date } = req.query;
    const query = { status: 'scheduled' };
    if (type) query.type = type;
    if (from) query.from = new RegExp(from, 'i');
    if (to)   query.to   = new RegExp(to,   'i');
    if (date) {
      const d = new Date(date), next = new Date(d);
      next.setDate(d.getDate() + 1);
      query.date = { $gte: d, $lt: next };
    }

    let rides = await Ride.find(query).populate('driver', '-password -idCardPublicId');

    if (organization) {
      rides = rides.filter(r => r.driver?.organization === organization);
    }

    const enriched = rides
      .map(ride => ({ ...ride.toObject(), availableSeats: ride.seats - ride.bookings.length }))
      .filter(r => r.availableSeats > 0);

    res.json({ rides: enriched });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rides' });
  }
};

// ─── Book ride (public — instant) ────────────────────────────────────────────
exports.bookRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const userId = req.userId;

    const user = await User.findById(userId);
    if (user.verificationStatus !== 'verified') {
      return res.status(403).json({
        error: 'Account not verified.',
        verificationStatus: user.verificationStatus
      });
    }

    const ride = await Ride.findById(rideId).populate('driver', 'name organization verificationStatus');
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    if (ride.status !== 'scheduled') return res.status(400).json({ error: 'Ride no longer available' });
    if (ride.driver._id.toString() === userId) return res.status(400).json({ error: 'Cannot book your own ride' });
    if (ride.bookings.map(b => b.toString()).includes(userId)) return res.status(400).json({ error: 'Already booked' });
    if (ride.bookings.length >= ride.seats) return res.status(400).json({ error: 'No seats available' });
    if (ride.driver.organization !== user.organization) return res.status(403).json({ error: 'Only org members can book this ride' });
    if (ride.visibility === 'private') return res.status(400).json({ error: 'This is a private ride. Use the request endpoint.' });

    ride.bookings.push(userId);
    await ride.save();

    const io = req.app.get('io');
    io.emit('ride-updated', { rideId: ride._id });

    const carbonSaved = calculateCarbonSaved(ride.distance, 1, ride.type === 'bikepool' ? 'bike' : 'car');
    await User.findByIdAndUpdate(userId, { $inc: { carbonSaved, ridesCompleted: 1 } });

    io.to(`user_${ride.driver._id}`).emit('booking-notification', {
      title: 'New Booking!',
      message: `${user.name} booked your ride`,
      rideDetails: { from: ride.from, to: ride.to, date: ride.date }
    });

    const populated = await Ride.findById(rideId)
      .populate('driver', '-password -idCardPublicId')
      .populate('bookings', '-password -idCardPublicId');

    res.json({ message: 'Ride booked successfully', ride: populated, carbonSaved });
  } catch (err) {
    console.error('Book ride error:', err);
    res.status(500).json({ error: 'Server error booking ride' });
  }
};

// ─── Request booking (private ride) ──────────────────────────────────────────
exports.requestBooking = async (req, res) => {
  try {
    const { rideId } = req.params;
    const userId = req.userId;
    const { message } = req.body;

    const user = await User.findById(userId);
    if (user.verificationStatus !== 'verified') {
      return res.status(403).json({ error: 'Account not verified.' });
    }

    const ride = await Ride.findById(rideId).populate('driver', 'name organization');
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    if (ride.status !== 'scheduled') return res.status(400).json({ error: 'Ride no longer available' });
    if (ride.driver._id.toString() === userId) return res.status(400).json({ error: 'Cannot request your own ride' });
    if (ride.bookings.map(b => b.toString()).includes(userId)) return res.status(400).json({ error: 'Already booked' });
    if (ride.pendingBookings.some(p => p.user.toString() === userId)) return res.status(400).json({ error: 'Request already sent' });
    if (ride.driver.organization !== user.organization) return res.status(403).json({ error: 'Only org members can request this ride' });

    ride.pendingBookings.push({ user: userId, message: message || '' });
    await ride.save();

    const io = req.app.get('io');
    io.to(`user_${ride.driver._id}`).emit('booking-request', {
      title: 'Ride Request',
      message: `${user.name} wants to join your ride`,
      rideId: ride._id,
      userId,
      userName: user.name,
    });

    res.json({ message: 'Booking request sent. Waiting for driver approval.' });
  } catch (err) {
    console.error('Request booking error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── Approve booking request (driver) ────────────────────────────────────────
exports.approveBooking = async (req, res) => {
  try {
    const { rideId, userId } = req.params;

    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    if (ride.driver.toString() !== req.userId) return res.status(403).json({ error: 'Only the driver can approve' });

    const pendingIdx = ride.pendingBookings.findIndex(p => p.user.toString() === userId);
    if (pendingIdx === -1) return res.status(404).json({ error: 'No pending request from this user' });
    if (ride.bookings.length >= ride.seats) return res.status(400).json({ error: 'No seats left' });

    ride.pendingBookings.splice(pendingIdx, 1);
    ride.bookings.push(userId);
    await ride.save();

    const [rider, driver] = await Promise.all([
      User.findById(userId),
      User.findById(req.userId),
    ]);

    const carbonSaved = calculateCarbonSaved(ride.distance, 1, ride.type === 'bikepool' ? 'bike' : 'car');
    await User.findByIdAndUpdate(userId, { $inc: { carbonSaved, ridesCompleted: 1 } });

    const io = req.app.get('io');
    io.to(`user_${userId}`).emit('booking-approved', {
      title: 'Booking Approved! 🎉',
      message: `${driver.name} approved your ride request`,
      rideId: ride._id,
    });
    io.emit('ride-updated', { rideId: ride._id });

    res.json({ message: 'Booking approved', carbonSaved });
  } catch (err) {
    console.error('Approve booking error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── Decline booking request (driver) ────────────────────────────────────────
exports.declineBooking = async (req, res) => {
  try {
    const { rideId, userId } = req.params;

    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    if (ride.driver.toString() !== req.userId) return res.status(403).json({ error: 'Only the driver can decline' });

    ride.pendingBookings = ride.pendingBookings.filter(p => p.user.toString() !== userId);
    await ride.save();

    const driver = await User.findById(req.userId);
    const io = req.app.get('io');
    io.to(`user_${userId}`).emit('booking-declined', {
      title: 'Request Declined',
      message: `${driver.name} declined your ride request`,
      rideId: ride._id,
    });

    res.json({ message: 'Request declined' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── Cancel booking (passenger) ──────────────────────────────────────────────
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

    const rideDateTime = new Date(ride.date);
    const [h, m] = ride.time.split(':').map(Number);
    rideDateTime.setHours(h, m, 0, 0);
    if ((rideDateTime - new Date()) / 60000 < 30 && ride.status === 'scheduled') {
      return res.status(400).json({ error: 'Cannot cancel within 30 minutes of the ride.' });
    }

    ride.bookings = ride.bookings.filter(b => b.toString() !== userId);
    ride.cancelledBookings.push({ user: userId, reason: reason || '', cancelledAt: new Date() });
    await ride.save();

    const carbonSaved = calculateCarbonSaved(ride.distance, 1, ride.type === 'bikepool' ? 'bike' : 'car');
    await User.findByIdAndUpdate(userId, { $inc: { carbonSaved: -carbonSaved, ridesCompleted: -1 } });

    const io = req.app.get('io');
    io.to(`user_${ride.driver}`).emit('booking-cancelled', {
      message: `A passenger cancelled their seat (${ride.from} → ${ride.to})`,
      rideId: ride._id,
    });
    io.emit('ride-updated', { rideId: ride._id });

    res.json({ message: 'Booking cancelled successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error cancelling booking' });
  }
};

// ─── Cancel ride (driver) ─────────────────────────────────────────────────────
exports.cancelRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { reason } = req.body;

    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    if (ride.driver.toString() !== req.userId) return res.status(403).json({ error: 'Only the driver can cancel this ride' });
    if (['completed','cancelled'].includes(ride.status)) return res.status(400).json({ error: `Ride is already ${ride.status}` });

    const carbonPerPassenger = calculateCarbonSaved(ride.distance, 1, ride.type === 'bikepool' ? 'bike' : 'car');
    for (const passengerId of ride.bookings) {
      await User.findByIdAndUpdate(passengerId, { $inc: { carbonSaved: -carbonPerPassenger, ridesCompleted: -1 } });
    }

    ride.status = 'cancelled';
    ride.cancelledAt = new Date();
    ride.cancelReason = reason || '';
    await ride.save();

    const io = req.app.get('io');
    for (const passengerId of ride.bookings) {
      io.to(`user_${passengerId}`).emit('ride-cancelled-by-driver', {
        title: 'Ride Cancelled',
        message: `Your ride from ${ride.from} to ${ride.to} was cancelled by the driver.`,
        reason: reason || '',
        rideId: ride._id,
      });
    }
    io.emit('ride-updated', { rideId: ride._id });

    res.json({ message: 'Ride cancelled successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error cancelling ride' });
  }
};

// ─── Complete ride (driver) ───────────────────────────────────────────────────
exports.completeRide = async (req, res) => {
  try {
    const { rideId } = req.params;

    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    if (ride.driver.toString() !== req.userId) return res.status(403).json({ error: 'Only the driver can complete this ride' });
    if (!['ongoing','scheduled'].includes(ride.status)) return res.status(400).json({ error: `Cannot complete a ${ride.status} ride` });

    ride.status = 'completed';
    await ride.save();

    const io = req.app.get('io');
    io.to(rideId).emit('ride-status-update', {
      status: 'completed',
      message: 'Ride completed! Please rate your experience.',
      timestamp: new Date().toISOString(),
    });
    for (const passengerId of ride.bookings) {
      io.to(`user_${passengerId}`).emit('review-reminder', {
        message: 'Your ride is complete! Rate your driver.',
        rideId: ride._id,
        driverId: ride.driver,
      });
    }

    res.json({ message: 'Ride marked as completed', rideId: ride._id });
  } catch (err) {
    res.status(500).json({ error: 'Server error completing ride' });
  }
};

// ─── Get my rides ─────────────────────────────────────────────────────────────
exports.getMyRides = async (req, res) => {
  try {
    const userId = req.userId;
    const [offeredRides, bookedRides] = await Promise.all([
      Ride.find({ driver: userId })
        .populate('bookings', '-password -idCardPublicId')
        .populate('pendingBookings.user', 'name organization rating')
        .sort({ date: -1 }),
      Ride.find({ bookings: userId })
        .populate('driver', '-password -idCardPublicId')
        .sort({ date: -1 }),
    ]);
    res.json({ offeredRides, bookedRides });
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching rides' });
  }
};

// ─── Get all rides (public) ───────────────────────────────────────────────────
exports.getRides = async (req, res) => {
  try {
    const rides = await Ride.find({ status: 'scheduled' }).populate('driver', 'name email organization rating');
    res.json({ rides });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching rides' });
  }
};

// ─── Org leaderboard ──────────────────────────────────────────────────────────
exports.getOrgLeaderboard = async (req, res) => {
  try {
    const { organization } = req.params;

    const users = await User.find({ organization, verificationStatus: 'verified', isActive: true })
      .select('name rating totalRatings carbonSaved ridesCompleted role')
      .sort({ ridesCompleted: -1, rating: -1 })
      .limit(20);

    const orgStats = await User.aggregate([
      { $match: { organization, verificationStatus: 'verified' } },
      { $group: { _id: null, totalRides: { $sum: '$ridesCompleted' }, totalCarbon: { $sum: '$carbonSaved' }, memberCount: { $sum: 1 }, avgRating: { $avg: '$rating' } } }
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
        role: u.role,
      })),
      orgStats: orgStats[0] || { totalRides: 0, totalCarbon: 0, memberCount: 0, avgRating: 0 },
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching leaderboard' });
  }
};