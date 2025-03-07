// In-memory store for OTPs
const otpStore = new Map();

export const formatPhoneNumber = (phoneNumber) => {
    // Only format if it's a phone number
    if (phoneNumber.match(/^\+?\d+$/)) {
        let formatted = phoneNumber.replace(/[^\d+]/g, '');
        if (!formatted.startsWith('+')) {
            formatted = '+' + formatted;
        }
        return formatted;
    }
    // Return as-is if it's not a phone number (e.g., email)
    return phoneNumber;
};

export const storeOtp = (target, otp, expiresAt) => {
    // Store new OTP
    const otpData = { otp, expiresAt };
    otpStore.set(target, otpData);
    
    console.log('Stored new OTP:', {
        target,
        otp,
        expiresAt: new Date(expiresAt).toISOString()
    });
    
    return otpData;
};

export const getStoredOtp = (target) => {
    return otpStore.get(target);
};

export const removeOtp = (target) => {
    return otpStore.delete(target);
};

export default {
    storeOtp,
    getStoredOtp,
    removeOtp,
    formatPhoneNumber
};
