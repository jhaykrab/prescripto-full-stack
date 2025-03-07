// utils/utils.js
export const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    
    // Remove all non-numeric characters
    let cleaned = phone.replace(/[^\d]/g, '');
    
    // Handle different formats
    if (cleaned.startsWith('09')) {
        cleaned = '63' + cleaned.substring(1);
    } else if (!cleaned.startsWith('63')) {
        cleaned = '63' + cleaned;
    }
    
    return '+' + cleaned;
};

export const isValidPhilippineNumber = (phone) => {
    if (!phone) return false;
    const phoneRegex = /^\+63[0-9]{10}$/;
    return phoneRegex.test(phone);
};
