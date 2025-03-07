import express from 'express';
import { loginUser, registerUser, getProfile, updateProfile, bookAppointment, listAppointment, cancelAppointment, paymentRazorpay, verifyRazorpay, paymentStripe, verifyStripe } from '../controllers/userController.js';
import { sendEmailOTP } from '../services/emailService.js';
import { sendOtpHandler } from '../routes/smsRoutes.js';
import { verifyOtp } from '../routes/smsRoutes.js';
import { storeOtp, getStoredOtp, removeOtp } from '../utils/otpStore.js';
import upload from '../middleware/multer.js';
import authUser from '../middleware/authUser.js';
const userRouter = express.Router();

userRouter.post("/send-otp", async (req, res) => {
    try {
        const { target, method } = req.body;
        
        if (!target || !method) {
            return res.status(400).json({ 
                success: false, 
                message: "Target and method are required" 
            });
        }

        if (method === 'phone') {
            return sendOtpHandler(req, res);
        } else if (method === 'email') {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            
            try {
                // Store OTP first
                const expirationTime = Date.now() + (5 * 60 * 1000); // 5 minutes
                
                // Store email OTP using the storeOtp utility function
                storeOtp(target, otp, expirationTime);
                
                // Send the email
                await sendEmailOTP(target, undefined, otp);
                
                return res.json({
                    success: true,
                    message: 'OTP sent successfully via email'
                });
            } catch (emailError) {
                // Clean up stored OTP if email fails
                removeOtp(target);
                console.error('Email OTP Error:', emailError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to send email OTP'
                });
            }
        }

        return res.status(400).json({
            success: false,
            message: "Invalid verification method"
        });
    } catch (error) {
        console.error('Send OTP Error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to send OTP'
        });
    }
});

// Add verification endpoint for email OTP
userRouter.post("/verify-otp", async (req, res) => {
    try {
        const { target, otp, method } = req.body;

        if (!target || !otp || !method) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        if (method === 'email') {
            const storedData = getStoredOtp(target);
            
            if (!storedData) {
                return res.status(400).json({
                    success: false,
                    message: 'Please request a new OTP'
                });
            }

            if (Date.now() > storedData.expiresAt) {
                removeOtp(target);
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

            // Remove OTP after successful verification
            removeOtp(target);
            
            return res.json({
                success: true,
                message: 'OTP verified successfully'
            });
        } else {
            // Forward to SMS verification handler
            return verifyOtp(req, res);
        }
    } catch (error) {
        console.error('Verify OTP Error:', error);
        return res.status(400).json({
            success: false,
            message: error.message || 'Failed to verify OTP'
        });
    }
});

userRouter.post("/register", registerUser);
userRouter.post("/login", loginUser);
userRouter.get("/get-profile", authUser, getProfile);
userRouter.post("/update-profile", upload.single('image'), authUser, updateProfile);
userRouter.post("/book-appointment", authUser, bookAppointment);
userRouter.get("/appointments", authUser, listAppointment);
userRouter.post("/cancel-appointment", authUser, cancelAppointment);
userRouter.post("/payment-razorpay", authUser, paymentRazorpay);
userRouter.post("/verifyRazorpay", authUser, verifyRazorpay);
userRouter.post("/payment-stripe", authUser, paymentStripe);
userRouter.post("/verifyStripe", authUser, verifyStripe);

export default userRouter;
