const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/authController');
const auth    = require('../middleware/auth');
const { uploadIdCard } = require('../config/cloudinary');

// Public
router.post('/signup', ctrl.signup);
router.post('/login',  ctrl.login);

// Protected
router.get('/me',              auth, ctrl.getCurrentUser);
router.post('/verify-id',      auth, uploadIdCard.single('idCard'), ctrl.uploadIdCard);
router.put('/trusted-contacts',auth, ctrl.updateTrustedContacts);

// Admin (x-admin-secret header checked inside controller)
router.get('/admin/pending-verifications', ctrl.getPendingVerifications);
router.post('/admin/verify/:userId',       ctrl.adminVerifyUser);
router.get('/admin/id-card/:userId',       ctrl.adminViewIdCard);

module.exports = router;