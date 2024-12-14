const express = require('express');
const { signUp, verifyEmail } = require('../controllers/authController');
const router = express.Router();

// Signup and email verification routes
router.post('/signup', signUp);
router.post('/verify', verifyEmail);

module.exports = router;
