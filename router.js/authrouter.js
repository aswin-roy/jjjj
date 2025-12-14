const express = require('express');
const router = express.Router();
const userController = require('../controllers/authcontrollers');

// Register Route
router.post('/register', userController.userRegister);

// Login Route
router.post('/login', userController.userLogin);

// Forgot Password Route - Send verification code
router.post('/forgot-password', userController.forgotPassword);

// Verify Code Route - Verify code and get reset token
router.post('/verify-code', userController.verifyCode);

// Reset Password Route - Reset password using token
router.post('/reset-password', userController.resetPassword);

module.exports = router;


