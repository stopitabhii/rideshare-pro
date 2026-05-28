const Ride = require('../models/Ride');
const User = require('../models/User');
const { calculateCarbonSaved } = require('../utils/carbon');
 
const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
 
async function expireRides(io) {
  try {
    const now = new Date();
 
    // Build a query that finds rides whose date+time has passed
    // date is stored as Date, time as "HH:MM" string
    // We fetch candidates and filter in JS to handle the time component
    const candidates = await Ride.find({
      status: { $in: ['scheduled', 'ongoing'] },
      date:   { $lte: now }, // date is today or earlier
    }).populate('bookings', '_id');
 
    let expired = 0;
    let completed = 0;
 
    for (const ride of candidates) {
      // Parse the exact departure datetime
      const rideDate = new Date(ride.date);
      const [h, m]   = (ride.time || '00:00').split(':').map(Number);
      rideDate.setHours(h, m, 0, 0);
 
      // Only expire if the departure time itself has passed
      if (rideDate >= now) continue;
 
      const hasPassengers = ride.bookings && ride.bookings.length > 0;
 
      if (hasPassengers) {
        // Had passengers → mark completed so reviews can be left
        ride.status = 'completed';
        await ride.save();
        completed++;
 
        // Notify passengers via socket if io is available
        if (io) {
          for (const passenger of ride.bookings) {
            io.to(`user_${passenger._id}`).emit('review-reminder', {
              title:   '⭐ Rate your ride',
              message: 'How was your journey? Leave a review.',
              rideId:  ride._id,
              driverId: ride.driver,
            });
          }
          // Notify driver too
          io.to(`user_${ride.driver}`).emit('review-reminder', {
            title:   '⭐ Rate your passengers',
            message: 'Your ride is complete. Leave feedback!',
            rideId:  ride._id,
          });
        }
      } else {
        // No passengers → cancel silently (no carbon to reverse)
        ride.status      = 'cancelled';
        ride.cancelledAt = now;
        ride.cancelReason = 'Ride expired — no bookings';
        await ride.save();
        expired++;
      }
    }
 
    if (completed + expired > 0) {
      console.log(`[rideExpiry] ✅ ${completed} completed, ${expired} cancelled (${new Date().toISOString()})`);
    }
  } catch (err) {
    console.error('[rideExpiry] Error:', err.message);
  }
}
 
/**
 * Also handles the edge case where a ride becomes "full" —
 * when bookings.length === seats we mark visibility as closed
 * so it stops appearing in search. This runs alongside expiry.
 */
async function closeFullRides() {
  try {
    // Find scheduled rides where bookings fill all seats
    // MongoDB can compare array length to a field using $expr
    const fullRides = await Ride.find({
      status: 'scheduled',
      $expr:  { $gte: [{ $size: '$bookings' }, '$seats'] },
    });
 
    for (const ride of fullRides) {
      // Don't cancel — just mark ongoing so it's hidden from search
      // but passengers can still access it in My Rides
      ride.status = 'ongoing';
      await ride.save();
    }
 
    if (fullRides.length > 0) {
      console.log(`[rideExpiry] 💺 ${fullRides.length} rides marked ongoing (seats full)`);
    }
  } catch (err) {
    console.error('[rideExpiry] closeFullRides error:', err.message);
  }
}
 
function startRideExpiryJob(io) {
  console.log('[rideExpiry] 🕐 Ride expiry job started (every 5 min)');
 
  // Run immediately on startup to catch anything missed during downtime
  expireRides(io);
  closeFullRides();
 
  // Then run on interval
  setInterval(() => {
    expireRides(io);
    closeFullRides();
  }, INTERVAL_MS);
}
 
module.exports = { startRideExpiryJob, expireRides };
 