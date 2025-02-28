import { auth } from '../config/firebase.js';

// Renamed from sendSmsOtp to sendOtp to match the import
export const sendOtp = async (phoneNumber) => {
    try {
        const verificationId = await auth.signInWithPhoneNumber(phoneNumber);
        return {
            success: true,
            verificationId
        };
    } catch (error) {
        console.error('Error sending SMS verification code:', error);
        throw error;
    }
};

// Renamed from verifySmsOtp to verifyOtp to match the import
export const verifyOtp = async (verificationId, otpCode) => {
    try {
        const credential = auth.PhoneAuthProvider.credential(verificationId, otpCode);
        const result = await auth.signInWithCredential(credential);
        return {
            success: true,
            user: result.user
        };
    } catch (error) {
        console.error('Error verifying SMS code:', error);
        throw error;
    }
};