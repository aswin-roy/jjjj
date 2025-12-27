/*const userModels = require('../models.js/userModels');
const validator = require('validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const userController = {};

// Register new user
userController.userRegister = async (req, res) => {
    const { fullname, email, password, confirmpassword, confirmPassword } = req.body;
    // Accept both confirmpassword and confirmPassword
    const confirmPass = confirmPassword || confirmpassword;

    try {
        // Validate required fields
        if (!fullname || !email || !password || !confirmPass) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Validate email format
        if (!validator.isEmail(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        // Check if email already exists
        const existMail = await userModels.findOne({ email });
        if (existMail) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        // Password validation
        if (!password || password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long' });
        }

        if (password !== confirmPass) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = new userModels({
            fullname,
            email,
            password: hashedPassword
        });

        await user.save();

        return res.status(201).json({ message: 'User registered successfully' });

    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Login user - returns JWT token
userController.userLogin = async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

        const user = await userModels.findOne({ email });
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ message: 'Invalid credentials' });

        const jwtSecret = process.env.JWT_SECRET || 'change_this_secret';
        const token = jwt.sign({ id: user._id, email: user.email }, jwtSecret, { expiresIn: '7d' });

        return res.json({ message: 'Login successful', token });
    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Forgot Password - Send verification code to email
userController.forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        // Find user
        const user = await userModels.findOne({ email: email.toLowerCase() });
        if (!user) {
            // Don't reveal if user exists for security
            return res.json({ 
                message: 'If the email exists, a verification code has been sent to your email' 
            });
        }

        // Generate 6-digit verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Save verification code and expiry (10 minutes)
        user.verificationCode = verificationCode;
        user.verificationCodeExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
        await user.save();

        // Send email if configured
        if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
            try {
                const transporter = nodemailer.createTransport({
                    service: process.env.EMAIL_SERVICE || 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASSWORD
                    }
                });

                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: user.email,
                    subject: 'Password Reset Verification Code',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #333;">Password Reset Request</h2>
                            <p>Hello <strong>${user.fullname}</strong>,</p>
                            <p>You requested to reset your password. Please use the verification code below to confirm it's you:</p>
                            <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
                                <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${verificationCode}</h1>
                            </div>
                            <p>This code will expire in <strong>10 minutes</strong>.</p>
                            <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
                            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                            <p style="color: #666; font-size: 12px;">Best regards,<br>Lady Bird Team</p>
                        </div>
                    `
                });

                // Always return code in response for testing
                console.log(`Verification code for ${user.email}: ${verificationCode}`);
                return res.json({ 
                    message: 'If the email exists, a verification code has been sent to your email',
                    verificationCode: verificationCode, // Always returned for testing
                    email: user.email,
                    note: 'Check your email inbox. If email not received, use the verificationCode above to test.'
                });
            } catch (emailError) {
                console.error('Email sending error:', emailError);
                // If email fails, return code in response for testing
                return res.json({
                    message: 'Verification code generated (email sending failed)',
                    verificationCode: verificationCode,
                    email: user.email,
                    error: emailError.message,
                    errorDetails: emailError.response ? emailError.response : 'Check server console for details',
                    note: 'Email failed to send. Use the verification code above to test. Check EMAIL_USER and EMAIL_PASSWORD in .env file. For Gmail, use App Password (not regular password).'
                });
            }
        } else {
            // Email not configured, return code in response for testing
            return res.json({
                message: 'Verification code generated (email not configured)',
                verificationCode: verificationCode,
                email: user.email,
                note: 'Set EMAIL_USER and EMAIL_PASSWORD in .env to enable email sending. Use the code above to test.'
            });
        }

    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Verify Code - Verify the code and generate reset token
userController.verifyCode = async (req, res) => {
    const { email, code } = req.body;

    try {
        if (!email || !code) {
            return res.status(400).json({ message: 'Email and verification code are required' });
        }

        // Find user
        const user = await userModels.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if code matches and is not expired
        if (!user.verificationCode || user.verificationCode !== code) {
            return res.status(400).json({ message: 'Invalid verification code' });
        }

        if (!user.verificationCodeExpires || user.verificationCodeExpires < Date.now()) {
            return res.status(400).json({ message: 'Verification code has expired' });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        // Save reset token and expiry (15 minutes), clear verification code
        user.resetPasswordToken = resetTokenHash;
        user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
        user.verificationCode = null;
        user.verificationCodeExpires = null;
        await user.save();

        return res.json({
            message: 'Verification successful. You can now reset your password.',
            resetToken: resetToken
        });

    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Reset Password - Reset password using token
userController.resetPassword = async (req, res) => {
    const { token, password, confirmPassword, confirmpassword } = req.body;
    const confirmPass = confirmPassword || confirmpassword;

    try {
        if (!token || !password || !confirmPass) {
            return res.status(400).json({ 
                message: 'Token, password, and confirm password are required' 
            });
        }

        if (password !== confirmPass) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        if (password.length < 8) {
            return res.status(400).json({ 
                message: 'Password must be at least 8 characters long' 
            });
        }

        // Hash the token to compare
        const resetTokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        // Find user with valid token
        const user = await userModels.findOne({
            resetPasswordToken: resetTokenHash,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ 
                message: 'Invalid or expired reset token' 
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update password and clear reset token
        user.password = hashedPassword;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        return res.json({ message: 'Password reset successfully' });

    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

module.exports = userController;
/*/



const userModels = require('../models.js/userModels');
const validator = require('validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const userController = {};

// Register new user
userController.userRegister = async (req, res) => {
    const { fullname, name, email, password, confirmpassword, confirmPassword } = req.body;
    // Accept both fullname and name
    const userFullname = fullname || name;
    // Accept both confirmpassword and confirmPassword
    const confirmPass = confirmPassword || confirmpassword;

    try {
        // Validate required fields
        if (!userFullname || !email || !password || !confirmPass) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Validate email format
        if (!validator.isEmail(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        // Check if email already exists
        const existMail = await userModels.findOne({ email });
        if (existMail) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        // Password validation
        if (!password || password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long' });
        }

        if (password !== confirmPass) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = new userModels({
            fullname: userFullname,
            email,
            password: hashedPassword
        });

        await user.save();

        return res.status(201).json({ message: 'User registered successfully' });

    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Login user - returns JWT token
userController.userLogin = async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

        const user = await userModels.findOne({ email });
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ message: 'Invalid credentials' });

        const jwtSecret = process.env.JWT_SECRET || 'change_this_secret';
        const token = jwt.sign({ id: user._id, email: user.email }, jwtSecret, { expiresIn: '7d' });

        return res.json({ message: 'Login successful', token });
    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Forgot Password - Send verification code to email
userController.forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        // Find user
        const user = await userModels.findOne({ email: email.toLowerCase() });
        if (!user) {
            // Don't reveal if user exists for security
            return res.json({
                message: 'If the email exists, a verification code has been sent to your email'
            });
        }

        // Generate 6-digit verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Save verification code and expiry (10 minutes)
        user.verificationCode = verificationCode;
        user.verificationCodeExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
        await user.save();

        // Send email if configured
        if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
            try {
                const transporter = nodemailer.createTransport({
                    service: process.env.EMAIL_SERVICE || 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASSWORD
                    }
                });

                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: user.email,
                    subject: 'Password Reset Verification Code',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #333;">Password Reset Request</h2>
                            <p>Hello <strong>${user.fullname}</strong>,</p>
                            <p>You requested to reset your password. Please use the verification code below to confirm it's you:</p>
                            <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
                                <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${verificationCode}</h1>
                            </div>
                            <p>This code will expire in <strong>10 minutes</strong>.</p>
                            <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
                            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                            <p style="color: #666; font-size: 12px;">Best regards,<br>Lady Bird Team</p>
                        </div>
                    `
                });

                // Always return code in response for testing
                console.log(`Verification code for ${user.email}: ${verificationCode}`);
                return res.json({
                    message: 'If the email exists, a verification code has been sent to your email',
                    verificationCode: verificationCode, // Always returned for testing
                    email: user.email,
                    note: 'Check your email inbox. If email not received, use the verificationCode above to test.'
                });
            } catch (emailError) {
                console.error('Email sending error:', emailError);
                // If email fails, return code in response for testing
                return res.json({
                    message: 'Verification code generated (email sending failed)',
                    verificationCode: verificationCode,
                    email: user.email,
                    error: emailError.message,
                    errorDetails: emailError.response ? emailError.response : 'Check server console for details',
                    note: 'Email failed to send. Use the verification code above to test. Check EMAIL_USER and EMAIL_PASSWORD in .env file. For Gmail, use App Password (not regular password).'
                });
            }
        } else {
            // Email not configured, return code in response for testing
            return res.json({
                message: 'Verification code generated (email not configured)',
                verificationCode: verificationCode,
                email: user.email,
                note: 'Set EMAIL_USER and EMAIL_PASSWORD in .env to enable email sending. Use the code above to test.'
            });
        }

    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Verify Code - Verify the code and generate reset token
userController.verifyCode = async (req, res) => {
    const { email, code } = req.body;

    try {
        if (!email || !code) {
            return res.status(400).json({ message: 'Email and verification code are required' });
        }

        // Find user
        const user = await userModels.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if code matches and is not expired
        if (!user.verificationCode || user.verificationCode !== code) {
            return res.status(400).json({ message: 'Invalid verification code' });
        }

        if (!user.verificationCodeExpires || user.verificationCodeExpires < Date.now()) {
            return res.status(400).json({ message: 'Verification code has expired' });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        // Save reset token and expiry (15 minutes), clear verification code
        user.resetPasswordToken = resetTokenHash;
        user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
        user.verificationCode = null;
        user.verificationCodeExpires = null;
        await user.save();

        return res.json({
            message: 'Verification successful. You can now reset your password.',
            resetToken: resetToken
        });

    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Reset Password - Reset password using token
userController.resetPassword = async (req, res) => {
    const { token, password, confirmPassword, confirmpassword } = req.body;
    const confirmPass = confirmPassword || confirmpassword;

    try {
        if (!token || !password || !confirmPass) {
            return res.status(400).json({
                message: 'Token, password, and confirm password are required'
            });
        }

        if (password !== confirmPass) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: 'Password must be at least 8 characters long'
            });
        }

        // Hash the token to compare
        const resetTokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        // Find user with valid token
        const user = await userModels.findOne({
            resetPasswordToken: resetTokenHash,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                message: 'Invalid or expired reset token'
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update password and clear reset token
        user.password = hashedPassword;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        return res.json({ message: 'Password reset successfully' });

    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

module.exports = userController;

