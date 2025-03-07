import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import validator from "validator";
import { formatPhoneNumber } from "../utils/utils.js";
import userModel from "../models/userModel.js";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import { v2 as cloudinary } from 'cloudinary';
import stripe from "stripe";
import razorpay from 'razorpay';

// Import the email notification service
import { 
    sendEmailVerification, 
    verifyEmailToken, 
    sendEmailOTP,
    verifyEmailOTP 
} from '../services/emailService.js';

// Import the SMS notification service
import { sendOtp, verifyOtp as verifySmsOtp } from '../services/smsService.js';

// Gateway Initialize
const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
const razorpayInstance = new razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// In-memory OTP store (consider using Redis or similar in production)
const otpStore = new Map();

// API to send OTP
const sendOtpHandler = async (req, res) => {
    try {
        console.log("📩 Incoming OTP Send Request:", req.body);

        const { target, method } = req.body;

        if (!target || !method) {
            return res.status(400).json({ 
                success: false, 
                message: "Target and method are required" 
            });
        }

        let formattedTarget = formatPhoneNumber(target);
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Generate OTP

        if (method === 'phone') {
            await sendOtp(formattedTarget);  // Send OTP via SMS

            // 🔥 Store OTP in memory with expiration (5 minutes)
            otpStore.set(formattedTarget, { 
                otp, 
                expiresAt: Date.now() + 5 * 60 * 1000 
            });

            console.log(`✅ OTP Stored: ${otp} for ${formattedTarget}`);
        } else if (method === 'email') {
            await sendEmailOTP(target, undefined, otp);  // Send OTP via Email

            otpStore.set(target, { 
                otp, 
                expiresAt: Date.now() + 5 * 60 * 1000 
            });

            console.log(`✅ OTP Stored: ${otp} for email ${target}`);
        } else {
            return res.status(400).json({
                success: false,
                message: "Invalid verification method"
            });
        }

        res.json({ 
            success: true, 
            message: `OTP sent successfully to ${target}` 
        });
    } catch (error) {
        console.error('❌ Send OTP Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send OTP' 
        });
    }
};


const verifyOtpHandler = async (req, res) => {
    try {
        console.log("🔍 Incoming OTP Verification Request:", req.body);

        const { target, otp, method } = req.body;

        if (!target || !otp || !method) {
            console.error("❌ Missing required fields in OTP verification");
            return res.status(400).json({
                success: false,
                message: "Target, OTP, and method are required"
            });
        }

        let formattedTarget = formatPhoneNumber(target);
        console.log("📞 Formatted Target for Verification:", formattedTarget);

        let isValid = false;

        if (method === 'phone') {
            // 🔥 Retrieve stored OTP from memory
            const storedOtp = otpStore.get(formattedTarget);

            if (!storedOtp) {
                console.error("❌ No OTP found for this number");
                return res.status(400).json({
                    success: false,
                    message: "Please request a new OTP"
                });
            }

            // 🔥 Check if OTP is expired
            if (Date.now() > storedOtp.expiresAt) {
                otpStore.delete(formattedTarget); // Remove expired OTP
                console.error("❌ OTP Expired");
                return res.status(400).json({
                    success: false,
                    message: "OTP expired. Please request a new one."
                });
            }

            // 🔥 Compare stored OTP with entered OTP
            if (storedOtp.otp !== otp) {
                console.error("❌ Incorrect OTP entered");
                return res.status(400).json({
                    success: false,
                    message: "Invalid OTP"
                });
            }

            // ✅ If OTP is correct, delete it to prevent reuse
            otpStore.delete(formattedTarget);
            console.log("✅ OTP Verified Successfully!");

            isValid = true;

        } else if (method === 'email') {
            const result = await verifyEmailOTP(otp, target);
            isValid = result.success;
        } else {
            console.error("❌ Invalid verification method");
            return res.status(400).json({
                success: false,
                message: "Invalid verification method"
            });
        }

        if (isValid) {
            return res.json({
                success: true,
                message: "OTP verified successfully"
            });
        }

        console.error("❌ OTP verification failed.");
        return res.status(400).json({
            success: false,
            message: "Invalid OTP"
        });

    } catch (error) {
        console.error("❌ OTP Verification Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to verify OTP"
        });
    }
};


// API to register user
const registerUser = async (req, res) => {
    try {
        const userData = req.body;
        const { email, phone } = userData;

        // Check if user already exists
        const existingUser = await userModel.findOne({ 
            $or: [
                { email: email },
                { phone: phone }
            ]
        });

        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: existingUser.email === email 
                    ? "Email already registered" 
                    : "Phone number already registered" 
            });
        }

        // Create new user
        const newUser = new userModel(userData);
        await newUser.save();

        // Generate JWT token
        const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET);

        try {
            // Send email verification
            await sendEmailVerification(email);
        } catch (emailError) {
            console.error('Email verification failed:', emailError);
        }

        try {
            // Send SMS verification
            const internationalPhoneNumber = phone.startsWith('+') ? phone.slice(1) : phone;
            await sendOtp(internationalPhoneNumber);
        } catch (smsError) {
            console.error('SMS verification failed:', smsError);
        }

        res.status(201).json({ 
            success: true, 
            token,
            message: "Registration successful"
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || "Server error",
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}

// API to login user
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: "User does not exist" });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
            res.json({ success: true, token });
        } else {
            res.status(401).json({ success: false, message: "Invalid credentials" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}

// API to get user profile data
const getProfile = async (req, res) => {
    try {
        const { userId } = req.body;
        const userData = await userModel.findById(userId).select('-password');

        if (!userData) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({ success: true, userData });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}

// API to update user profile
const updateProfile = async (req, res) => {
    try {
        const { userId, name, phone, address, dob, gender } = req.body;
        const imageFile = req.file;

        if (!name || !phone || !dob || !gender) {
            return res.status(400).json({ success: false, message: "Required fields missing" });
        }

        const updateData = { 
            name, 
            phone, 
            address: JSON.parse(address), 
            dob, 
            gender 
        };

        if (imageFile) {
            const imageUpload = await cloudinary.uploader.upload(imageFile.path, { 
                resource_type: "image" 
            });
            updateData.image = imageUpload.secure_url;
        }

        await userModel.findByIdAndUpdate(userId, updateData);

        res.json({ success: true, message: 'Profile Updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}

// Improved bookAppointment with better validation and error handling
const bookAppointment = async (req, res) => {
    try {
        const { userId, docId, slotDate, slotTime, concern } = req.body;

        // Validate required fields
        if (!userId || !docId || !slotDate || !slotTime || !concern) {
            return res.status(400).json({ 
                success: false, 
                message: "Missing required fields" 
            });
        }

        // Get doctor data with error handling
        const docData = await doctorModel.findById(docId).select("-password");
        if (!docData) {
            return res.status(404).json({
                success: false,
                message: "Doctor not found"
            });
        }

        // Check doctor availability
        if (!docData.available) {
            return res.status(400).json({
                success: false,
                message: "Doctor not available"
            });
        }

        // Check slot availability
        const slots_booked = docData.slots_booked || {};
        if (slots_booked[slotDate]?.includes(slotTime)) {
            return res.status(400).json({
                success: false,
                message: "Slot not available"
            });
        }

        // Update slots
        if (!slots_booked[slotDate]) {
            slots_booked[slotDate] = [];
        }
        slots_booked[slotDate].push(slotTime);

        // Get user data
        const userData = await userModel.findById(userId).select("-password");
        if (!userData) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Create appointment
        const appointmentData = {
            userId,
            docId,
            userData,
            docData: {
                ...docData.toObject(),
                slots_booked: undefined
            },
            amount: docData.fees,
            slotTime,
            slotDate,
            concern,
            date: Date.now()
        };

        // Save appointment and update doctor slots atomically
        const session = await appointmentModel.startSession();
        await session.withTransaction(async () => {
            const newAppointment = new appointmentModel(appointmentData);
            await newAppointment.save({ session });
            await doctorModel.findByIdAndUpdate(docId, { slots_booked }, { session });
        });
        await session.endSession();

        return res.json({
            success: true,
            message: "Appointment booked successfully"
        });

    } catch (error) {
        console.error('Book appointment error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to book appointment"
        });
    }
}

// API to cancel appointment
const cancelAppointment = async (req, res) => {
    try {
        const { userId, appointmentId } = req.body;
        const appointmentData = await appointmentModel.findById(appointmentId);

        if (!appointmentData) {
            return res.status(404).json({ 
                success: false, 
                message: "Appointment not found" 
            });
        }

        if (appointmentData.userId !== userId) {
            return res.status(403).json({ 
                success: false, 
                message: "Unauthorized action" 
            });
        }

        await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true });

        // Release doctor's slot
        const { docId, slotDate, slotTime } = appointmentData;
        const doctorData = await doctorModel.findById(docId);
        
        if (doctorData) {
            let slots_booked = doctorData.slots_booked;
            if (slots_booked[slotDate]) {
                slots_booked[slotDate] = slots_booked[slotDate].filter(t => t !== slotTime);
                await doctorModel.findByIdAndUpdate(docId, { slots_booked });
            }
        }

        res.json({ success: true, message: "Appointment cancelled" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
}

// API to list user appointments
const listAppointment = async (req, res) => {
    try {
        const { userId } = req.body;
        const appointments = await appointmentModel.find({ userId });

        res.json({ success: true, appointments });
    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
}

// API for Razorpay payment
const paymentRazorpay = async (req, res) => {
    try {
        const { appointmentId } = req.body;
        const appointmentData = await appointmentModel.findById(appointmentId);

        if (!appointmentData || appointmentData.cancelled) {
            return res.status(400).json({ 
                success: false, 
                message: "Appointment cancelled or not found" 
            });
        }

        const options = {
            amount: appointmentData.amount * 100,
            currency: process.env.CURRENCY,
            receipt: appointmentId,
        };

        const order = await razorpayInstance.orders.create(options);
        res.json({ success: true, order });

    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
}

// API to verify Razorpay payment
const verifyRazorpay = async (req, res) => {
    try {
        const { razorpay_order_id } = req.body;
        const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id);

        if (orderInfo.status === 'paid') {
            await appointmentModel.findByIdAndUpdate(orderInfo.receipt, { 
                payment: true 
            });
            res.json({ success: true, message: "Payment successful" });
        } else {
            res.status(400).json({ success: false, message: "Payment failed" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
}

// API for Stripe payment
const paymentStripe = async (req, res) => {
    try {
        const { appointmentId } = req.body;
        const { origin } = req.headers;

        const appointmentData = await appointmentModel.findById(appointmentId);

        if (!appointmentData || appointmentData.cancelled) {
            return res.status(400).json({ 
                success: false, 
                message: "Appointment cancelled or not found" 
            });
        }

        const session = await stripeInstance.checkout.sessions.create({
            success_url: `${origin}/verify?success=true&appointmentId=${appointmentData._id}`,
            cancel_url: `${origin}/verify?success=false&appointmentId=${appointmentData._id}`,
            line_items: [{
                price_data: {
                    currency: process.env.CURRENCY.toLowerCase(),
                    product_data: {
                        name: "Appointment Fees"
                    },
                    unit_amount: appointmentData.amount * 100
                },
                quantity: 1
            }],
            mode: 'payment',
        });

        res.json({ success: true, session_url: session.url });

    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
}

// Add proper error handling for payment verification
const verifyStripe = async (req, res) => {
    try {
        const { appointmentId, success } = req.body;

        if (!appointmentId) {
            return res.status(400).json({
                success: false,
                message: "Appointment ID is required"
            });
        }

        const appointment = await appointmentModel.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: "Appointment not found"
            });
        }

        if (success === "true") {
            await appointmentModel.findByIdAndUpdate(appointmentId, { 
                payment: true,
                paymentDate: Date.now()
            });
            return res.json({
                success: true,
                message: "Payment successful"
            });
        }

        return res.json({
            success: false,
            message: "Payment failed"
        });

    } catch (error) {
        console.error('Stripe verification error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || "Payment verification failed"
        });
    }
};

// API for email verification
const handleEmailVerification = async (req, res) => {
    try {
        const { token } = req.body;
        const result = await verifyEmailToken(token);
        
        if (result.success) {
            await userModel.findOneAndUpdate(
                { email: result.email },
                { emailVerified: true }
            );
            res.json({ 
                success: true, 
                message: "Email verified successfully" 
            });
        } else {
            res.status(400).json({ 
                success: false, 
                message: "Invalid verification token" 
            });
        }
    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to verify email" 
        });
    }
};

export {
    loginUser,
    registerUser,
    getProfile,
    updateProfile,
    bookAppointment,
    listAppointment,
    cancelAppointment,
    paymentRazorpay,
    verifyRazorpay,
    paymentStripe,
    verifyStripe,
    sendOtpHandler as sendOtp,     
    verifyOtpHandler as verifyOtp,  
    handleEmailVerification
};
