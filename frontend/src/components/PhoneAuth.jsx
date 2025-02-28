import { useState, useEffect } from 'react';
import { auth } from '../config/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

const PhoneAuth = () => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [verificationId, setVerificationId] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState('PHONE'); // PHONE or OTP

    useEffect(() => {
        // Initialize reCAPTCHA when component mounts
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'normal',
                'callback': (response) => {
                    // reCAPTCHA solved, allow signInWithPhoneNumber.
                    console.log('reCAPTCHA solved');
                },
                'expired-callback': () => {
                    // Response expired. Ask user to solve reCAPTCHA again.
                    console.log('reCAPTCHA expired');
                }
            });
        }
    }, []);

    const handleSendOTP = async (e) => {
        e.preventDefault();
        try {
            const formattedPhone = phoneNumber; // Ensure phone number is in E.164 format
            const appVerifier = window.recaptchaVerifier;
            
            const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
            setVerificationId(confirmationResult.verificationId);
            setStep('OTP');
            
        } catch (error) {
            console.error('Error sending OTP:', error);
            // Reset reCAPTCHA
            window.recaptchaVerifier.render().then(widgetId => {
                window.recaptchaVerifier.reset(widgetId);
            });
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/verify-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    verificationId,
                    otp
                }),
            });
            
            if (response.ok) {
                console.log('Phone number verified successfully');
                // Handle successful verification (e.g., redirect or update UI)
            }
        } catch (error) {
            console.error('Error verifying OTP:', error);
        }
    };

    return (
        <div>
            {step === 'PHONE' ? (
                <form onSubmit={handleSendOTP}>
                    <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="Enter phone number"
                    />
                    {/* reCAPTCHA will be rendered here */}
                    <div id="recaptcha-container"></div>
                    <button type="submit">Send OTP</button>
                </form>
            ) : (
                <form onSubmit={handleVerifyOTP}>
                    <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="Enter OTP"
                    />
                    <button type="submit">Verify OTP</button>
                </form>
            )}
        </div>
    );
};

export default PhoneAuth;