require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Ride = require('../models/Ride');
const Organization = require('../models/Organization');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error.message);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing data
    await User.deleteMany({});
    await Ride.deleteMany({});
    await Organization.deleteMany({});

    console.log('🗑️  Cleared existing data');

    // Create organizations (Updated with Galgotias University)
    const organizations = await Organization.insertMany([
      { name: 'Galgotias University', type: 'college' },
      { name: 'Delhi University', type: 'college' },
      { name: 'IIT Delhi', type: 'college' },
      { name: 'Amity University', type: 'college' },
      { name: 'InfoSys Noida', type: 'company' }
    ]);

    console.log(' Organizations created');

    // Create users - focusing on Galgotias University
    const hashedPassword = await bcrypt.hash('demo123', 10);
    
    const users = await User.insertMany([
      // Galgotias University Students
      {
        name: 'Abhishek Tripathi',
        email: 'abhishek@galgotias.com',
        password: hashedPassword,
        phone: '+91 98765 00001',
        organization: 'Galgotias University',
        role: 'driver',
        rating: 4.9,
        carbonSaved: 156.8,
        ridesCompleted: 32
      },
      {
        name: 'Priya Sharma',
        email: 'priya@galgotias.com',
        password: hashedPassword,
        phone: '+91 98765 00002',
        organization: 'Galgotias University',
        role: 'driver',
        rating: 4.8,
        carbonSaved: 142.3,
        ridesCompleted: 28
      },
      {
        name: 'Rahul Kumar',
        email: 'rahul@galgotias.com',
        password: hashedPassword,
        phone: '+91 98765 00003',
        organization: 'Galgotias University',
        role: 'driver',
        rating: 4.7,
        carbonSaved: 128.5,
        ridesCompleted: 25
      },
      {
        name: 'Ananya Singh',
        email: 'ananya@galgotias.com',
        password: hashedPassword,
        phone: '+91 98765 00004',
        organization: 'Galgotias University',
        role: 'rider',
        rating: 4.9,
        carbonSaved: 95.2,
        ridesCompleted: 18
      },
      {
        name: 'Vikram Patel',
        email: 'vikram@galgotias.com',
        password: hashedPassword,
        phone: '+91 98765 00005',
        organization: 'Galgotias University',
        role: 'driver',
        rating: 4.6,
        carbonSaved: 110.7,
        ridesCompleted: 22
      },
      {
        name: 'Sneha Gupta',
        email: 'sneha@galgotias.com',
        password: hashedPassword,
        phone: '+91 98765 00006',
        organization: 'Galgotias University',
        role: 'driver',
        rating: 4.8,
        carbonSaved: 134.9,
        ridesCompleted: 27
      },
      {
        name: 'Atul Chaudhary',
        email: 'atul@galgotias.com',
        password: hashedPassword,
        phone: '+91 98765 00007',
        organization: 'Galgotias University',
        role: 'driver',
        rating: 4.8,
        carbonSaved: 134.9,
        ridesCompleted: 28
      },
      {
        name: 'Ajay Patel',
        email: 'ajay@galgotias.com',
        password: hashedPassword,
        phone: '+91 98765 00007',
        organization: 'Galgotias University',
        role: 'driver',
        rating: 4.8,
        carbonSaved: 134.9,
        ridesCompleted: 30
      },
      {
        name: 'Harsh Chaudhary',
        email: 'harsh@galgotias.com',
        password: hashedPassword,
        phone: '+91 98765 00008',
        organization: 'Galgotias University',
        role: 'driver',
        rating: 4.8,
        carbonSaved: 134.9,
        ridesCompleted: 25
      },
      {
        name: 'Vipin Peelwan',
        email: 'vipin@galgotias.com',
        password: hashedPassword,
        phone: '+91 98765 00009',
        organization: 'Galgotias University',
        role: 'driver',
        rating: 4.8,
        carbonSaved: 134.9,
        ridesCompleted: 33
      },
      // Other universities (for demo)
      {
        name: 'Amit Kumar',
        email: 'amit@demo.com',
        password: hashedPassword,
        phone: '+91 98765 43212',
        organization: 'Delhi University',
        role: 'driver',
        rating: 4.7,
        carbonSaved: 201.3,
        ridesCompleted: 42
      },
      {
        name: 'Ravi Verma',
        email: 'ravi@demo.com',
        password: hashedPassword,
        phone: '+91 98765 43213',
        organization: 'IIT Delhi',
        role: 'driver',
        rating: 4.9,
        carbonSaved: 167.8,
        ridesCompleted: 35
      },
      {
      name: 'Adarsh Patel',
        email: 'adarsh@demo.com',
        password: hashedPassword,
        phone: '+91 98765 46213',
        organization: 'Amity University',
        role: 'driver',
        rating: 4.9,
        carbonSaved: 167.8,
        ridesCompleted: 32
      },
      {
        name: 'Adarsh Chaubey',
        email: 'chaubey@demo.com',
        password: hashedPassword,
        phone: '+91 97765 43213',
        organization: 'InfoSys Noida',
        role: 'driver',
        rating: 4.9,
        carbonSaved: 167.7,
        ridesCompleted: 36
      }
      
      
    ]);

    console.log('✅ Users created ');

    // Create rides - Multiple rides for popular Galgotias routes
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const today = new Date();
    today.setHours(today.getHours() + 2); // 2 hours from now

    await Ride.insertMany([
      // ========== CARPOOL RIDES - Greater Noida to Galgotias ==========
      {
        driver: users[0]._id, // Abhishek
        type: 'carpool',
        from: 'Greater Noida West',
        to: 'Galgotias University',
        date: tomorrow,
        time: '08:00',
        seats: 3,
        price: 40,
        distance: 8,
        recurring: true,
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        status: 'scheduled',
        bookings: [users[3]._id] // Ananya booked
      },
      {
        driver: users[1]._id, // Priya
        type: 'carpool',
        from: 'Greater Noida West',
        to: 'Galgotias University',
        date: tomorrow,
        time: '08:15',
        seats: 4,
        price: 35,
        distance: 8,
        recurring: true,
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        status: 'scheduled',
        bookings: []
      },
      {
        driver: users[2]._id, // Rahul
        type: 'carpool',
        from: 'Greater Noida West',
        to: 'Galgotias University',
        date: tomorrow,
        time: '08:30',
        seats: 3,
        price: 40,
        distance: 8,
        recurring: true,
        days: ['Mon', 'Wed', 'Fri'],
        status: 'scheduled',
        bookings: []
      },

      // ========== BIKEPOOL RIDES - Greater Noida to Galgotias ==========
      {
        driver: users[4]._id, // Vikram
        type: 'bikepool',
        from: 'Greater Noida West',
        to: 'Galgotias University',
        date: tomorrow,
        time: '08:00',
        seats: 1,
        price: 20,
        distance: 8,
        helmetProvided: true,
        recurring: true,
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        status: 'scheduled',
        bookings: []
      },
      {
        driver: users[5]._id, // Sneha
        type: 'bikepool',
        from: 'Greater Noida West',
        to: 'Galgotias University',
        date: tomorrow,
        time: '08:20',
        seats: 1,
        price: 25,
        distance: 8,
        helmetProvided: true,
        recurring: true,
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        status: 'scheduled',
        bookings: []
      },
      {
        driver: users[8]._id, // Harsh
        type: 'bikepool',
        from: 'Gaur Yamuna City',
        to: 'Galgotias University',
        date: tomorrow,
        time: '07:45',
        seats: 1,
        price: 40,
        distance: 8,
        helmetProvided: true,
        recurring: false,
        status: 'scheduled',
        bookings: []
      },

      // ========== CARPOOL - to Galgotias ==========
      {
        driver: users[6]._id, // Atul
        type: 'carpool',
        from: 'delhi',
        to: 'Galgotias University',
        date: tomorrow,
        time: '08:00',
        seats: 3,
        price: 100,
        distance: 40,
        recurring: true,
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        status: 'scheduled',
        bookings: []
      },
      {
        driver: users[9]._id, // Vipin
        type: 'carpool',
        from: 'Meerut',
        to: 'Galgotias University',
        date: tomorrow,
        time: '08:30',
        seats: 4,
        price: 180,
        distance: 90,
        recurring: true,
        days: ['Mon', 'Wed', 'Fri'],
        status: 'scheduled',
        bookings: []
      },

      // ========== BIKEPOOL - Noida to Galgotias ==========
      {
        driver: users[4]._id, // Vikram
        type: 'bikepool',
        from: 'Noida Sector 62',
        to: 'Galgotias University',
        date: tomorrow,
        time: '08:15',
        seats: 1,
        price: 35,
        distance: 15,
        helmetProvided: true,
        recurring: true,
        days: ['Mon', 'Tue', 'Thu', 'Fri'],
        status: 'scheduled',
        bookings: []
      },

      // ========== CARPOOL - Delhi to Galgotias ==========
      {
        driver: users[3]._id, // Ananya
        type: 'carpool',
        from: 'Anand Vihar',
        to: 'Galgotias University',
        date: tomorrow,
        time: '07:30',
        seats: 3,
        price: 100,
        distance: 25,
        recurring: true,
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        status: 'scheduled',
        bookings: []
      },
      {
        driver: users[7]._id, // Ajay
        type: 'carpool',
        from: 'Shalimar garden',
        to: 'Galgotias University',
        date: tomorrow,
        time: '07:45',
        seats: 4,
        price: 95,
        distance: 25,
        recurring: true,
        days: ['Mon', 'Wed', 'Fri'],
        status: 'scheduled',
        bookings: []
      },

      // ========== Return Journey - Galgotias to Greater Noida ==========
      {
        driver: users[6]._id, // Atul
        type: 'carpool',
        from: 'Galgotias University',
        to: 'Greater Noida West',
        date: tomorrow,
        time: '17:00',
        seats: 3,
        price: 40,
        distance: 8,
        recurring: true,
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        status: 'scheduled',
        bookings: []
      },
      {
        driver: users[7]._id, // Ajay
        type: 'carpool',
        from: 'Galgotias University',
        to: 'Greater Noida West',
        date: tomorrow,
        time: '17:30',
        seats: 4,
        price: 35,
        distance: 8,
        recurring: true,
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        status: 'scheduled',
        bookings: []
      },

      // ========== Other University Rides (for reference) ==========
      {
        driver: users[6]._id, // Amit - Delhi University
        type: 'carpool',
        from: 'Rajouri Garden',
        to: 'Delhi University',
        date: tomorrow,
        time: '08:00',
        seats: 3,
        price: 50,
        distance: 12,
        recurring: true,
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        status: 'scheduled',
        bookings: []
      },
      {
        driver: users[7]._id, // Ravi - IIT Delhi
        type: 'carpool',
        from: 'Hauz Khas',
        to: 'IIT Delhi',
        date: tomorrow,
        time: '08:15',
        seats: 3,
        price: 40,
        distance: 6,
        recurring: true,
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        status: 'scheduled',
        bookings: []
      }
      
    ]);

    console.log('✅ Rides created (Multiple rides for Galgotias routes)');
    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📧 Demo Credentials (Galgotias Students):');
    console.log('   Email: abhishek@galgotias.com');
    console.log('   Password: demo123');
    console.log('\n   Email: priya@galgotias.com');
    console.log('   Password: demo123');
    console.log('\n   Email: rahul@galgotias.com');
    console.log('   Password: demo123\n');
    
    console.log('📍 Popular Routes:');
    console.log('   - Greater Noida West → Galgotias University (3 carpool, 3 bikepool)');
    console.log('   - Noida Sector 62 → Galgotias University (2 carpool, 1 bikepool)');
    console.log('   - Anand Vihar → Galgotias University (2 carpool)');
    console.log('   - Galgotias University → Greater Noida West (2 carpool - return)\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seedData();