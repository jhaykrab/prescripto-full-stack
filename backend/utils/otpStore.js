// In-memory store for OTPs
const otpStore = new Map();

export const formatPhoneNumber = (phoneNumber) => {
    let formatted = phoneNumber.replace(/[^\d+]/g, '');
    if (!formatted.startsWith('+')) {
        formatted = '+' + formatted;
    }
    return formatted;
};

export const storeOtp = (phoneNumber, otp, expiresAt) => {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    otpStore.set(formattedPhone, {
        otp,
        expiresAt
    });
};

export const getStoredOtp = (phoneNumber) => {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    return otpStore.get(formattedPhone);
};

export const removeOtp = (phoneNumber) => {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    otpStore.delete(formattedPhone);
};
