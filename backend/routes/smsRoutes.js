import express from 'express';
import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Temporary OTP storage (replace with database in production)
const otpStore = new Map();

router.post('/send-otp', async (req, res) => {
    try {
        const { target, method } = req.body;
        
        // Validate email and method
        if (!target) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email address is required' 
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(target)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid email format' 
            });
        }

        if (method !== 'email') {
            return res.status(400).json({
                success: false,
                message: 'Invalid method specified'
            });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Add debug log for OTP generation
        console.log('Generated OTP:', {
            target,
            otp,
            timestamp: new Date().toISOString()
        });

        const msg = {
            to: target,
            from: process.env.SENDGRID_VERIFIED_SENDER, 
            subject: 'Your Verification Code',
            text: `Your verification code is: ${otp}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Verification Code</h2>
                    <p>Your verification code is:</p>
                    <h1 style="color: #4CAF50; font-size: 32px;">${otp}</h1>
                    <p>This code will expire in 5 minutes.</p>
                </div>
            `
        };

        await sgMail.send(msg);
        
        // Store OTP with 5-minute expiration
        otpStore.set(target, {
            otp,
            expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
        });

        // Debug log for OTP storage
        console.log('Stored OTP data:', {
            target,
            storedData: otpStore.get(target),
            mapSize: otpStore.size
        });

        // Clean up OTP after 5 minutes
        setTimeout(() => {
            otpStore.delete(target);
            console.log('OTP expired and removed for:', target);
        }, 5 * 60 * 1000);
        
        res.json({ 
            success: true, 
            message: 'OTP sent successfully'
        });
    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Failed to send OTP'
        });
    }
});

router.post('/verify-otp', async (req, res) => {
    try {
        const { target, otp, method } = req.body;

        // Add more detailed logging
        console.log('\nVerification Request Details:');
        console.log('1. Received Data:', {
            target,
            otp,
            method,
            timestamp: new Date().toISOString()
        });

        console.log('2. OTP Store Status:', {
            totalStoredOTPs: otpStore.size,
            hasTargetEmail: otpStore.has(target),
            storedData: otpStore.get(target),
            currentTime: Date.now()
        });

        if (!target || !otp || !method) {
            console.log('3. Validation Failed: Missing required fields');
            return res.status(400).json({
                success: false,
                message: 'Email, OTP, and method are required'
            });
        }

        const storedData = otpStore.get(target);

        if (!storedData) {
            console.log('3. Validation Failed: No stored OTP found');
            return res.status(400).json({
                success: false,
                message: 'OTP expired or not found'
            });
        }

        console.log('4. OTP Comparison:', {
            receivedOTP: otp,
            storedOTP: storedData.otp,
            isMatch: storedData.otp === otp,
            expiresAt: new Date(storedData.expiresAt).toISOString(),
            isExpired: Date.now() > storedData.expiresAt
        });

        if (Date.now() > storedData.expiresAt) {
            otpStore.delete(target);
            console.log('5. Validation Failed: OTP expired');
            return res.status(400).json({
                success: false,
                message: 'OTP has expired'
            });
        }

        if (storedData.otp !== otp) {
            console.log('5. Validation Failed: OTP mismatch');
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP'
            });
        }

        // OTP is valid - clean up
        otpStore.delete(target);
        console.log('5. Success: OTP verified and removed');

        res.json({
            success: true,
            message: 'OTP verified successfully'
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to verify OTP'
        });
    }
});

export default router;