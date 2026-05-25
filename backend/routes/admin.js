const router = require('express').Router();
const auth = require('../middleware/auth');
const { requireAdmin, getStats, getUsers, banUser, getReports, resolveReport, getAdminRides } = require('../controllers/adminController');
const { adminVerifyUser, adminViewIdCard, getPendingVerifications } = require('../controllers/authController');

// All admin routes require auth + admin check
router.use(auth, requireAdmin);

router.get('/stats', getStats);
router.get('/users', getUsers);
router.put('/users/:userId/ban', banUser);
router.get('/reports', getReports);
router.put('/reports/:reportId/resolve', resolveReport);
router.get('/rides', getAdminRides);

// Verification (moved from auth routes but still accessible here)
router.get('/verifications/pending', getPendingVerifications);
router.post('/verifications/:userId', adminVerifyUser);
router.get('/verifications/id-card/:userId', adminViewIdCard);

module.exports = router;
