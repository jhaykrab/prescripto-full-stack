import axios from 'axios';
import dotenv from 'dotenv';
import { formatPhoneNumber } from '../utils/utils.js';
import { storeOtp, getStoredOtp, removeOtp } from '../utils/otpStore.js';

dotenv.config();

const TEXTLINK_API_KEY = process.env.TEXTLINK_API_KEY;
const TEXTLINK_BASE_URL = process.env.TEXTLINK_BASE_URL;
const SERVICE_NAME = process.env.APP_NAME;

/**
 * Sends an OTP to the specified phone number.
 */
export const sendOtp = async (phoneNumber) => {
    try {
        if (!TEXTLINK_API_KEY) {
            throw new Error('TextLink API key is missing');
        }

        const formattedPhone = formatPhoneNumber(phoneNumber);
        
        // Check if there's an existing non-expired OTP
        const existingOtp = getStoredOtp(formattedPhone);
        if (existingOtp) {
            throw new Error('Please wait before requesting a new OTP');
        }

        // Send the OTP request to SMS API first
        const response = await axios.post(`${TEXTLINK_BASE_URL}/send-code`, {
            phone_number: formattedPhone,
            service_name: SERVICE_NAME
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TEXTLINK_API_KEY}`
            }
        });

        console.log('TextLink API Response:', JSON.stringify(response.data, null, 2));

        if (!response?.data?.ok) {
            throw new Error(response.data.message || 'Failed to send verification code');
        }

        // Get the OTP from the API response
        const otp = response.data.code; // Adjust this based on your API response structure
        if (!otp) {
            throw new Error('No OTP received from SMS service');
        }

        // Store the OTP received from the API
        const expirationTime = Date.now() + (5 * 60 * 1000); // 5 minutes
        storeOtp(formattedPhone, otp, expirationTime);

        return {
            success: true,
            phoneNumber: formattedPhone
        };
    } catch (error) {
        console.error('Send OTP Error:', error);
        throw error;
    }
};

/**
 * Verifies an OTP for the specified phone number.
 */
export const verifyOtp = async (phoneNumber, code) => {
    try {
        const formattedPhone = formatPhoneNumber(phoneNumber);
        const storedData = getStoredOtp(formattedPhone);
        
        if (!storedData) {
            throw new Error('Please request a new OTP');
        }

        if (Date.now() > storedData.expiresAt) {
            removeOtp(formattedPhone);
            throw new Error('OTP has expired. Please request a new one.');
        }

        const isValid = storedData.otp === code;
        
        // Always remove the OTP after verification attempt
        removeOtp(formattedPhone);
        
        if (!isValid) {
            throw new Error('Invalid OTP');
        }

        return true;
    } catch (error) {
        console.error('Verify OTP Error:', error);
        throw error;
    }
};


