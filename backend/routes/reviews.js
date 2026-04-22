const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/reviewController');
const auth    = require('../middleware/auth');

// IMPORTANT: static paths BEFORE /:rideId wildcard (Express 5 requirement)
router.get('/pending',       auth, ctrl.getPendingReviews);
router.get('/user/:userId',       ctrl.getUserReviews);
router.post('/:rideId',      auth, ctrl.submitReview);

module.exports = router;