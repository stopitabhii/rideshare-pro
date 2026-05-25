const router = require('express').Router();
const auth = require('../middleware/auth');
const { createReport, getMyReports, blockUser, unblockUser, getBlockedUsers } = require('../controllers/reportController');

router.post('/', auth, createReport);
router.get('/my', auth, getMyReports);
router.post('/block/:userId', auth, blockUser);
router.delete('/block/:userId', auth, unblockUser);
router.get('/blocked', auth, getBlockedUsers);

module.exports = router;
