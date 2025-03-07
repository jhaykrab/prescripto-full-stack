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
    
    // Clear any existing OTP
    otpStore.delete(formattedPhone);
    
    // Store new OTP
    const otpData = { otp, expiresAt };
    otpStore.set(formattedPhone, otpData);
    
    console.log('Stored new OTP:', {
        phone: formattedPhone,
        otp,
        expiresAt: new Date(expiresAt).toISOString()
    });
    
    return otpData;
};

export const getStoredOtp = (phoneNumber) => {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    const storedData = otpStore.get(formattedPhone);
    
    console.log('Retrieving OTP:', {
        phone: formattedPhone,
        found: !!storedData,
        expired: storedData ? Date.now() > storedData.expiresAt : false
    });
    
    if (!storedData) {
        return null;
    }
    
    // Check expiration
    if (Date.now() > storedData.expiresAt) {
        otpStore.delete(formattedPhone);
        return null;
    }
    
    return storedData;
};

export const removeOtp = (phoneNumber) => {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    const deleted = otpStore.delete(formattedPhone);
    console.log('Removed OTP:', {
        phone: formattedPhone,
        wasDeleted: deleted
    });
};
