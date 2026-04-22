const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/rideController');
const auth    = require('../middleware/auth');

// ── Core ──────────────────────────────────────────────────────────────────────
router.post('/create',            auth, ctrl.createRide);
router.get('/search',             auth, ctrl.searchRides);
router.get('/my-rides',           auth, ctrl.getMyRides);
router.get('/distance',           auth, ctrl.getDistanceEstimate);
router.get('/',                        ctrl.getRides);

// ── Booking ───────────────────────────────────────────────────────────────────
router.post('/book/:rideId',          auth, ctrl.bookRide);          // public → instant
router.post('/request/:rideId',       auth, ctrl.requestBooking);    // private → request
router.put('/approve/:rideId/:userId',auth, ctrl.approveBooking);    // driver approves
router.put('/decline/:rideId/:userId',auth, ctrl.declineBooking);    // driver declines

// ── Lifecycle ─────────────────────────────────────────────────────────────────
router.put('/complete/:rideId',            auth, ctrl.completeRide);
router.delete('/cancel-booking/:rideId',   auth, ctrl.cancelBooking);
router.delete('/cancel-ride/:rideId',      auth, ctrl.cancelRide);

// ── Leaderboard ───────────────────────────────────────────────────────────────
router.get('/leaderboard/:organization', auth, ctrl.getOrgLeaderboard);

module.exports = router;