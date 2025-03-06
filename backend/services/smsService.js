import axios from 'axios';
import dotenv from 'dotenv';
import { storeOtp, formatPhoneNumber } from '../utils/otpStore.js';

dotenv.config();

const TEXTLINK_API_KEY = process.env.TEXTLINK_API_KEY;
const TEXTLINK_BASE_URL = 'https://textlinksms.com/api';
const SERVICE_NAME = process.env.APP_NAME || 'Prescripto';

export const sendOtp = async (phoneNumber) => {
    try {
        if (!TEXTLINK_API_KEY) {
            throw new Error('TextLink API key is missing');
        }

        // Format phone number to ensure it starts with '+'
        let formattedPhone = phoneNumber.replace(/[^\d+]/g, '');
        if (!formattedPhone.startsWith('+')) {
            formattedPhone = '+' + formattedPhone;
        }

        console.log('Sending OTP request to TextLink API:', {
            phoneNumber: formattedPhone,
            serviceName: SERVICE_NAME
        });

        const response = await axios({
            method: 'post',
            url: `${TEXTLINK_BASE_URL}/send-code`,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TEXTLINK_API_KEY}`
            },
            data: {
                phone_number: formattedPhone,
                service_name: SERVICE_NAME,
                expiration_time: 5 * 60 * 1000 // 5 minutes
            }
        });

        if (!response.data.ok) {
            console.error('TextLink API Error:', response.data);
            throw new Error(response.data.message || 'Failed to send verification code');
        }

        // Store the OTP code
        const { code } = response.data;
        storeOtp(formattedPhone, code, Date.now() + (5 * 60 * 1000)); // Store for 5 minutes

        return {
            success: true,
            phoneNumber: formattedPhone
        };

    } catch (error) {
        console.error('Send OTP Error:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            phoneNumber: phoneNumber
        });
        
        if (error.response?.data?.message) {
            throw new Error(error.response.data.message);
        } else if (error.response?.status === 401) {
            throw new Error('Invalid API key or authentication failed');
        } else if (error.response?.status === 429) {
            throw new Error('Too many requests. Please try again later');
        } else {
            throw new Error('Failed to send verification code. Please try again');
        }
    }
};

export const verifyOtp = async (phoneNumber, code) => {
    try {
        if (!TEXTLINK_API_KEY) {
            throw new Error('TextLink API key is missing');
        }

        const formattedPhone = formatPhoneNumber(phoneNumber);

        console.log('Verifying OTP:', {
            phoneNumber: formattedPhone,
            codeLength: code.length
        });

        const response = await axios({
            method: 'post',
            url: `${TEXTLINK_BASE_URL}/verify-code`,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TEXTLINK_API_KEY}`
            },
            data: {
                phone_number: formattedPhone,
                code: code
            }
        });

        // Log the complete verification response
        console.log('TextLink Verification Response:', {
            status: response.status,
            data: response.data,
            phoneNumber: formattedPhone
        });

        return response.data.ok;

    } catch (error) {
        console.error('Verify OTP Error:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            phoneNumber: phoneNumber
        });

        if (error.response?.data?.message) {
            throw new Error(error.response.data.message);
        } else if (error.response?.status === 401) {
            throw new Error('Invalid API key or authentication failed');
        } else {
            throw new Error('Failed to verify code. Please try again');
        }
    }
};
