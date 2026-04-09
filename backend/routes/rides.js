const express = require('express');
const router = express.Router();
const rideController = require('../controllers/rideController');
const auth = require('../middleware/auth');

router.post('/create', auth, rideController.createRide);
router.get('/search', auth, rideController.searchRides);
router.post('/book/:rideId', auth, rideController.bookRide);
router.get('/my-rides', auth, rideController.getMyRides);

module.exports = router;