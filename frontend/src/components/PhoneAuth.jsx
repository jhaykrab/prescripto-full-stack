import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const PhoneAuth = () => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSendCode = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Format phone number to E.164
            let formattedPhone = phoneNumber;
            if (!formattedPhone.startsWith('+')) {
                formattedPhone = `+${formattedPhone}`;
            }

            const response = await axios.post('/api/user/send-otp', {
                target: formattedPhone,
                method: 'phone'
            });

            if (response.data.success) {
                toast.success('Verification code sent!');
            } else {
                throw new Error(response.data.message);
            }
        } catch (error) {
            console.error('Error sending code:', error);
            toast.error(error.message || 'Failed to send verification code');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await axios.post('/api/user/verify-otp', {
                target: phoneNumber,
                otp: verificationCode,
                method: 'phone'
            });

            if (response.data.success) {
                toast.success('Successfully verified!');
                // Handle successful verification here
            } else {
                throw new Error(response.data.message);
            }
        } catch (error) {
            console.error('Error verifying code:', error);
            toast.error('Invalid verification code');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="phone-auth-container">
            {!confirmationResult ? (
                <form onSubmit={handleSendCode}>
                    <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="Enter phone number (+1234567890)"
                        required
                    />
                    <button type="submit" disabled={loading}>
                        {loading ? 'Sending...' : 'Send Code'}
                    </button>
                </form>
            ) : (
                <form onSubmit={handleVerifyCode}>
                    <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        placeholder="Enter verification code"
                        required
                    />
                    <button type="submit" disabled={loading}>
                        {loading ? 'Verifying...' : 'Verify Code'}
                    </button>
                </form>
            )}
        </div>
    );
};

export default PhoneAuth;
