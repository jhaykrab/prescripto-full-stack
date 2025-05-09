import express from 'express';
import { sendOtp as sendSmsOtp } from '../services/smsService.js';
import { getStoredOtp, removeOtp, formatPhoneNumber } from '../utils/otpStore.js';

const router = express.Router();

export const sendOtpHandler = async (req, res) => {
    try {
        const { target, method } = req.body;

        if (!target || method !== 'phone') {
            return res.status(400).json({
                success: false,
                message: "Invalid request for SMS OTP"
            });
        }

        await sendSmsOtp(target);
        
        return res.json({
            success: true,
            message: 'OTP sent successfully via SMS'
        });
    } catch (error) {
        console.error('Send OTP Error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to send OTP'
        });
    }
};

export const verifyOtp = async (req, res) => {
    try {
        const { target, otp, method } = req.body;

        if (!target || !otp || !method) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const formattedTarget = formatPhoneNumber(target);
        const storedData = getStoredOtp(formattedTarget);

        if (!storedData) {
            return res.status(400).json({
                success: false,
                message: 'Please request a new OTP'
            });
        }

        if (Date.now() > storedData.expiresAt) {
            removeOtp(formattedTarget);
            return res.status(400).json({
                success: false,
                message: 'OTP has expired. Please request a new one.'
            });
        }

        if (storedData.otp !== otp) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP'
            });
        }

        // If we get here, OTP is valid
        removeOtp(formattedTarget);
        
        return res.json({
            success: true,
            message: 'OTP verified successfully'
        });
    } catch (error) {
        console.error('❌ Verify OTP Error:', error);
        return res.status(400).json({
            success: false,
            message: error.message || 'Failed to verify OTP'
        });
    }
};

router.post('/send-otp', sendOtpHandler);
router.post('/verify-otp', verifyOtp);

export default router;
