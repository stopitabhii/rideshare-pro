const Ride = require('../models/Ride');
const User = require('../models/User');
const { calculateCarbonSaved } = require('../utils/carbon');

// Create new ride
exports.createRide = async (req, res) => {
  try {
    const rideData = {
      ...req.body,
      driver: req.userId
    };

    const ride = new Ride(rideData);
    await ride.save();

    const populatedRide = await Ride.findById(ride._id).populate('driver', '-password');

    res.status(201).json({
      message: 'Ride created successfully',
      ride: populatedRide
    });
  } catch (error) {
    console.error('Create ride error:', error);
    res.status(500).json({ error: 'Server error creating ride' });
  }
};

// Search rides
exports.searchRides = async (req, res) => {
  try {
    const { type, from, to, organization } = req.query;

    let query = {};

    if (type) query.type = type;
    if (from) query.from = new RegExp(from, 'i');
    if (to) query.to = new RegExp(to, 'i');

    // Fetch rides + populate driver
    let rides = await Ride.find(query)
      .populate('driver');

    // Filter by organization (VERY IMPORTANT)
    if (organization) {
      rides = rides.filter(
        ride => ride.driver?.organization === organization
      );
    }

    res.json({ rides });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch rides' });
  }
};

// Book a ride
exports.bookRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const userId = req.userId;

    const ride = await Ride.findById(rideId);
    
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.driver.toString() === userId) {
      return res.status(400).json({ error: 'Cannot book your own ride' });
    }

    if (ride.bookings.includes(userId)) {
      return res.status(400).json({ error: 'Already booked this ride' });
    }

    if (ride.bookings.length >= ride.seats) {
      return res.status(400).json({ error: 'No seats available' });
    }

    ride.bookings.push(userId);
    await ride.save();

    // Calculate and update carbon saved
    const carbonSaved = calculateCarbonSaved(ride.distance, 1, ride.type === 'bikepool' ? 'bike' : 'car');
    await User.findByIdAndUpdate(userId, {
      $inc: { carbonSaved: carbonSaved, ridesCompleted: 1 }
    });

    const populatedRide = await Ride.findById(rideId)
      .populate('driver', '-password')
      .populate('bookings', '-password');

    res.json({
      message: 'Ride booked successfully',
      ride: populatedRide,
      carbonSaved
    });
  } catch (error) {
    console.error('Book ride error:', error);
    res.status(500).json({ error: 'Server error booking ride' });
  }
};

// Get user's rides (offered and booked)
exports.getMyRides = async (req, res) => {
  try {
    const userId = req.userId;

    const offeredRides = await Ride.find({ driver: userId })
      .populate('bookings', '-password')
      .sort({ date: -1 });

    const bookedRides = await Ride.find({ bookings: userId })
      .populate('driver', '-password')
      .sort({ date: -1 });

    res.json({
      offeredRides,
      bookedRides
    });
  } catch (error) {
    console.error('Get my rides error:', error);
    res.status(500).json({ error: 'Server error fetching rides' });
  }
};

// Get rides
exports.getRides = async (req, res) => {
  try {
    const rides = await Ride.find().populate("driver", "name email");
    res.json({ rides });
  } catch (error) {
    res.status(500).json({ error: "Error fetching rides" });
  }
};