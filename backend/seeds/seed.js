require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Ride = require('../models/Ride');
const Organization = require('../models/Organization');
const Review = require('../models/Review');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB Connection Failed:', error.message);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    await connectDB();

    await User.deleteMany({});
    await Ride.deleteMany({});
    await Organization.deleteMany({});
    await Review.deleteMany({});

    console.log('Cleared existing data');

    // ── Organisations: major NCR colleges + a few companies ──────────────────
    const organizations = await Organization.insertMany([
      // Greater Noida
      { name: 'Galgotias University', type: 'college' },
      { name: 'Bennett University', type: 'college' },
      { name: 'Sharda University', type: 'college' },
      { name: 'GNIOT Greater Noida', type: 'college' },
      { name: 'Lloyd Law College', type: 'college' },
      // Noida
      { name: 'Amity University Noida', type: 'college' },
      { name: 'IIMT University Noida', type: 'college' },
      // Delhi
      { name: 'Delhi University', type: 'college' },
      { name: 'IIT Delhi', type: 'college' },
      { name: 'NSIT Dwarka', type: 'college' },
      { name: 'DTU Delhi', type: 'college' },
      { name: 'Jamia Millia Islamia', type: 'college' },
      { name: 'JNU Delhi', type: 'college' },
      { name: 'IGDTUW Delhi', type: 'college' },
      { name: 'IP University Delhi', type: 'college' },
      // Gurugram
      { name: 'MDI Gurugram', type: 'college' },
      { name: 'GD Goenka University', type: 'college' },
      // Faridabad / Meerut
      { name: 'Manav Rachna University', type: 'college' },
      { name: 'Subharti University Meerut', type: 'college' },
      // Companies
      { name: 'InfoSys Noida', type: 'company' },
      { name: 'Wipro Noida', type: 'company' },
      { name: 'TCS Noida', type: 'company' }
    ]);

    console.log('Organisations created:', organizations.length);

    const hashedPassword = await bcrypt.hash('demo123', 10);

    // ── Users: Galgotias (primary focus) ─────────────────────────────────────
    const users = await User.insertMany([
      {
        name: 'Abhishek Tripathi',
        email: 'abhishek@galgotias.com',
        password: hashedPassword,
        phone: '+91 98765 00001',
        organization: 'Galgotias University',
        role: 'driver',
        rating: 4.9,
        totalRatings: 28,
        carbonSaved: 156.8,
        ridesCompleted: 32,
        verificationStatus: 'verified',
        verifiedAt: new Date()
      },
      {
        name: 'Priya Sharma',
        email: 'priya@galgotias.com',
        password: hashedPassword,
        phone: '+91 98765 00002',
        organization: 'Galgotias University',
        role: 'driver',
        rating: 4.8,
        totalRatings: 24,
        carbonSaved: 142.3,
        ridesCompleted: 28,
        verificationStatus: 'verified',
        verifiedAt: new Date()
      },
      {
        name: 'Rahul Kumar',
        email: 'rahul@galgotias.com',
        password: hashedPassword,
        phone: '+91 98765 00003',
        organization: 'Galgotias University',
        role: 'driver',
        rating: 4.7,
        totalRatings: 21,
        carbonSaved: 128.5,
        ridesCompleted: 25,
        verificationStatus: 'verified',
        verifiedAt: new Date()
      },
      {
        name: 'Ananya Singh',
        email: 'ananya@galgotias.com',
        password: hashedPassword,
        phone: '+91 98765 00004',
        organization: 'Galgotias University',
        role: 'both',
        rating: 4.9,
        totalRatings: 16,
        carbonSaved: 95.2,
        ridesCompleted: 18,
        verificationStatus: 'verified',
        verifiedAt: new Date()
      },
      {
        name: 'Vikram Patel',
        email: 'vikram@galgotias.com',
        password: hashedPassword,
        phone: '+91 98765 00005',
        organization: 'Galgotias University',
        role: 'driver',
        rating: 4.6,
        totalRatings: 19,
        carbonSaved: 110.7,
        ridesCompleted: 22,
        verificationStatus: 'verified',
        verifiedAt: new Date()
      },
      {
        name: 'Sneha Gupta',
        email: 'sneha@galgotias.com',
        password: hashedPassword,
        phone: '+91 98765 00006',
        organization: 'Galgotias University',
        role: 'driver',
        rating: 4.8,
        totalRatings: 23,
        carbonSaved: 134.9,
        ridesCompleted: 27,
        verificationStatus: 'verified',
        verifiedAt: new Date()
      },
      {
        name: 'Atul Chaudhary',
        email: 'atul@galgotias.com',
        password: hashedPassword,
        phone: '+91 98765 00007',
        organization: 'Galgotias University',
        role: 'driver',
        rating: 4.8,
        totalRatings: 25,
        carbonSaved: 134.9,
        ridesCompleted: 28,
        verificationStatus: 'verified',
        verifiedAt: new Date()
      },
      {
        name: 'Ajay Patel',
        email: 'ajay@galgotias.com',
        password: hashedPassword,
        phone: '+91 98765 00008',
        organization: 'Galgotias University',
        role: 'driver',
        rating: 4.8,
        totalRatings: 27,
        carbonSaved: 134.9,
        ridesCompleted: 30,
        verificationStatus: 'verified',
        verifiedAt: new Date()
      },
      {
        name: 'Harsh Chaudhary',
        email: 'harsh@galgotias.com',
        password: hashedPassword,
        phone: '+91 98765 00009',
        organization: 'Galgotias University',
        role: 'driver',
        rating: 4.8,
        totalRatings: 22,
        carbonSaved: 134.9,
        ridesCompleted: 25,
        verificationStatus: 'verified',
        verifiedAt: new Date()
      },
      {
        name: 'Vipin Peelwan',
        email: 'vipin@galgotias.com',
        password: hashedPassword,
        phone: '+91 98765 00010',
        organization: 'Galgotias University',
        role: 'driver',
        rating: 4.8,
        totalRatings: 30,
        carbonSaved: 134.9,
        ridesCompleted: 33,
        verificationStatus: 'verified',
        verifiedAt: new Date()
      },
      // Demo unverified user (to test verification flow)
      {
        name: 'New Student',
        email: 'newstudent@galgotias.com',
        password: hashedPassword,
        phone: '+91 98765 00099',
        organization: 'Galgotias University',
        role: 'rider',
        verificationStatus: 'pending'
      },
      // Other orgs
      {
        name: 'Amit Kumar',
        email: 'amit@du.com',
        password: hashedPassword,
        phone: '+91 98765 43212',
        organization: 'Delhi University',
        role: 'driver',
        rating: 4.7,
        totalRatings: 38,
        carbonSaved: 201.3,
        ridesCompleted: 42,
        verificationStatus: 'verified',
        verifiedAt: new Date()
      },
      {
        name: 'Ravi Verma',
        email: 'ravi@iitd.com',
        password: hashedPassword,
        phone: '+91 98765 43213',
        organization: 'IIT Delhi',
        role: 'driver',
        rating: 4.9,
        totalRatings: 31,
        carbonSaved: 167.8,
        ridesCompleted: 35,
        verificationStatus: 'verified',
        verifiedAt: new Date()
      },
      {
        name: 'Adarsh Patel',
        email: 'adarsh@amity.com',
        password: hashedPassword,
        phone: '+91 98765 46213',
        organization: 'Amity University Noida',
        role: 'driver',
        rating: 4.9,
        totalRatings: 29,
        carbonSaved: 167.8,
        ridesCompleted: 32,
        verificationStatus: 'verified',
        verifiedAt: new Date()
      }
    ]);

    console.log('Users created:', users.length);

    // ── Rides ─────────────────────────────────────────────────────────────────
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await Ride.insertMany([
      // Galgotias — morning inbound
      {
        driver: users[0]._id,
        type: 'carpool',
        from: 'Greater Noida West',
        to: 'Galgotias University',
        date: tomorrow,
        time: '08:00',
        seats: 3,
        price: 40,
        distance: 8,
        duration: 22,
        recurring: true,
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        status: 'scheduled',
        bookings: [users[3]._id]
      },
      {
        driver: users[1]._id,
        type: 'carpool',
        from: 'Greater Noida West',
        to: 'Galgotias University',
        date: tomorrow,
        time: '08:15',
        seats: 4,
        price: 35,
        distance: 8,
        duration: 22,
        recurring: true,
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        status: 'scheduled',
        bookings: []
      },
      {
        driver: users[2]._id,
        type: 'carpool',
        from: 'Greater Noida West',
        to: 'Galgotias University',
        date: tomorrow,
        time: '08:30',
        seats: 3,
        price: 40,
        distance: 8,
        duration: 22,
        recurring: true,
        days: ['Mon', 'Wed', 'Fri'],
        status: 'scheduled',
        bookings: []
      },
      // Galgotias — bikepools
      {
        driver: users[4]._id,
        type: 'bikepool',
        from: 'Greater Noida West',
        to: 'Galgotias University',
        date: tomorrow,
        time: '08:00',
        seats: 1,
        price: 20,
        distance: 8,
        duration: 18,
        helmetProvided: true,
        recurring: true,
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        status: 'scheduled',
        bookings: []
      },
      {
        driver: users[5]._id,
        type: 'bikepool',
        from: 'Greater Noida West',
        to: 'Galgotias University',
        date: tomorrow,
        time: '08:20',
        seats: 1,
        price: 25,
        distance: 8,
        duration: 18,
        helmetProvided: true,
        recurring: true,
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        status: 'scheduled',
        bookings: []
      },
      // Galgotias — Delhi origin
      {
        driver: users[6]._id,
        type: 'carpool',
        from: 'Delhi',
        to: 'Galgotias University',
        date: tomorrow,
        time: '08:00',
        seats: 3,
        price: 100,
        distance: 40,
        duration: 75,
        recurring: true,
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        status: 'scheduled',
        bookings: []
      },
      {
        driver: users[9]._id,
        type: 'carpool',
        from: 'Meerut',
        to: 'Galgotias University',
        date: tomorrow,
        time: '08:30',
        seats: 4,
        price: 180,
        distance: 90,
        duration: 120,
        recurring: true,
        days: ['Mon', 'Wed', 'Fri'],
        status: 'scheduled',
        bookings: []
      },
      // Galgotias — Noida origin
      {
        driver: users[4]._id,
        type: 'bikepool',
        from: 'Noida Sector 62',
        to: 'Galgotias University',
        date: tomorrow,
        time: '08:15',
        seats: 1,
        price: 35,
        distance: 15,
        duration: 30,
        helmetProvided: true,
        recurring: true,
        days: ['Mon', 'Tue', 'Thu', 'Fri'],
        status: 'scheduled',
        bookings: []
      },
      {
        driver: users[3]._id,
        type: 'carpool',
        from: 'Anand Vihar',
        to: 'Galgotias University',
        date: tomorrow,
        time: '07:30',
        seats: 3,
        price: 100,
        distance: 25,
        duration: 55,
        recurring: true,
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        status: 'scheduled',
        bookings: []
      },
      {
        driver: users[7]._id,
        type: 'carpool',
        from: 'Shalimar Garden',
        to: 'Galgotias University',
        date: tomorrow,
        time: '07:45',
        seats: 4,
        price: 95,
        distance: 25,
        duration: 55,
        recurring: true,
        days: ['Mon', 'Wed', 'Fri'],
        status: 'scheduled',
        bookings: []
      },
      // Return rides
      {
        driver: users[6]._id,
        type: 'carpool',
        from: 'Galgotias University',
        to: 'Greater Noida West',
        date: tomorrow,
        time: '17:00',
        seats: 3,
        price: 40,
        distance: 8,
        duration: 22,
        recurring: true,
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        status: 'scheduled',
        bookings: []
      },
      {
        driver: users[7]._id,
        type: 'carpool',
        from: 'Galgotias University',
        to: 'Greater Noida West',
        date: tomorrow,
        time: '17:30',
        seats: 4,
        price: 35,
        distance: 8,
        duration: 22,
        recurring: true,
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        status: 'scheduled',
        bookings: []
      },
      // Delhi University rides
      {
        driver: users[11]._id,
        type: 'carpool',
        from: 'Rajouri Garden',
        to: 'Delhi University',
        date: tomorrow,
        time: '08:00',
        seats: 3,
        price: 50,
        distance: 12,
        duration: 35,
        recurring: true,
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        status: 'scheduled',
        bookings: []
      },
      // IIT Delhi rides
      {
        driver: users[12]._id,
        type: 'carpool',
        from: 'Hauz Khas',
        to: 'IIT Delhi',
        date: tomorrow,
        time: '08:15',
        seats: 3,
        price: 40,
        distance: 6,
        duration: 20,
        recurring: true,
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        status: 'scheduled',
        bookings: []
      }
    ]);

    console.log('Rides created');

    // ── Sample reviews for demo users ────────────────────────────────────────
    // First create a completed ride to attach reviews to
    const pastRide = await Ride.create({
      driver: users[0]._id,
      type: 'carpool',
      from: 'Greater Noida West',
      to: 'Galgotias University',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      time: '08:00',
      seats: 3,
      price: 40,
      distance: 8,
      duration: 22,
      status: 'completed',
      bookings: [users[3]._id, users[2]._id]
    });

    await Review.insertMany([
      {
        reviewer: users[3]._id,
        reviewee: users[0]._id,
        ride: pastRide._id,
        rating: 5,
        comment: 'Excellent driver! Very punctual and friendly.',
        revieweeRole: 'driver',
        tags: ['punctual', 'friendly', 'safe_driver']
      },
      {
        reviewer: users[2]._id,
        reviewee: users[0]._id,
        ride: pastRide._id,
        rating: 5,
        comment: 'Great ride, smooth drive.',
        revieweeRole: 'driver',
        tags: ['safe_driver', 'on_time']
      },
      {
        reviewer: users[0]._id,
        reviewee: users[3]._id,
        ride: pastRide._id,
        rating: 5,
        comment: 'Great passenger, ready on time!',
        revieweeRole: 'passenger',
        tags: ['punctual', 'respectful']
      }
    ]);

    console.log('Reviews created');

    console.log('\nDatabase seeded successfully!\n');
    console.log('Demo Credentials (all password: demo123):');
    console.log('  Verified driver:   abhishek@galgotias.com');
    console.log('  Verified rider:    ananya@galgotias.com');
    console.log('  Unverified (test): newstudent@galgotias.com\n');
    console.log('Admin Secret (set ADMIN_SECRET env var to use):');
    console.log('  Header: x-admin-secret: <your ADMIN_SECRET>\n');
    console.log('Organisations seeded:', organizations.length);

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();