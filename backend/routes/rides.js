const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/rideController');
const auth    = require('../middleware/auth');

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/',  ctrl.getRides);

// ── Autocomplete proxy (no auth — needed during form fill before login check) ─
// Proxies ORS Pelias so the API key stays on the server
router.get('/autocomplete', ctrl.autocomplete);

// ── Protected ─────────────────────────────────────────────────────────────────
router.get('/search',             auth, ctrl.searchRides);
router.get('/my-rides',           auth, ctrl.getMyRides);
router.get('/distance',           auth, ctrl.getDistanceEstimate);

// Leaderboard — static path BEFORE any wildcard
router.get('/leaderboard/:organization', auth, ctrl.getOrgLeaderboard);

// ── Ride creation ─────────────────────────────────────────────────────────────
router.post('/create', auth, ctrl.createRide);

// ── Booking ───────────────────────────────────────────────────────────────────
router.post('/book/:rideId',           auth, ctrl.bookRide);
router.post('/request/:rideId',        auth, ctrl.requestBooking);
router.put('/approve/:rideId/:userId', auth, ctrl.approveBooking);
router.put('/decline/:rideId/:userId', auth, ctrl.declineBooking);

// ── Lifecycle (specific paths before generic :rideId) ─────────────────────────
router.put('/complete/:rideId',          auth, ctrl.completeRide);
router.delete('/cancel-booking/:rideId', auth, ctrl.cancelBooking);
router.delete('/cancel-ride/:rideId',    auth, ctrl.cancelRide);

module.exports = router;