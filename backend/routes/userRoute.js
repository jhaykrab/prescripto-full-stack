import express from 'express';
import { loginUser, registerUser, getProfile, updateProfile, bookAppointment, listAppointment, cancelAppointment, paymentRazorpay, verifyRazorpay, paymentStripe, verifyStripe } from '../controllers/userController.js';
import { sendEmailOTP } from '../services/emailService.js';
import { sendOtpHandler } from '../routes/smsRoutes.js';
import { verifyOtp } from '../routes/smsRoutes.js';
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

        if (method === 'email') {
            try {
                // Generate a 6-digit OTP
                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                
                // Log the OTP for debugging (remove in production)
                console.log('Generated OTP:', otp);
                
                // Pass both the target email and the OTP
                const result = await sendEmailOTP(target, 'User', otp);
                
                if (!result.success) {
                    throw new Error(result.message || 'Failed to send email OTP');
                }
                
                return res.json({
                    success: true,
                    message: 'OTP sent successfully via email'
                });
            } catch (error) {
                console.error('Email OTP Error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to send email OTP'
                });
            }
        } else if (method === 'phone') {
            return sendOtpHandler(req, res);
        } else {
            return res.status(400).json({
                success: false,
                message: "Invalid verification method"
            });
        }
    } catch (error) {
        console.error('Send OTP Error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to send OTP'
        });
    }
});

userRouter.post("/verify-otp", verifyOtp);
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
