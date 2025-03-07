import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

const VerificationModal = ({ 
    isOpen, 
    onClose, 
    onVerificationSuccess, 
    target, 
    verificationMethod,
    otpTimeout,
    setOtpTimeout,
}) => {
    const { t } = useTranslation();
    const { backendUrl } = useContext(AppContext);
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [timer, setTimer] = useState(300); // 5 minutes
    const [loading, setLoading] = useState(false);

    // Validate target and verificationMethod
    useEffect(() => {
        if (isOpen && (!target || !verificationMethod)) {
            console.error('Missing required props:', { target, verificationMethod });
            onClose();
            toast.error('Verification configuration error');
        }
    }, [isOpen, target, verificationMethod]);

    // Reset states when modal opens
    useEffect(() => {
        if (isOpen) {
            setOtp(['', '', '', '', '', '']);
            setTimer(300);
            setOtpTimeout(false);
        }
    }, [isOpen, setOtpTimeout]);

    // Timer logic
    useEffect(() => {
        let interval;
        if (isOpen && timer > 0 && !otpTimeout) {
            interval = setInterval(() => {
                setTimer((prevTimer) => {
                    const newTimer = prevTimer - 1;
                    if (newTimer <= 0) {
                        setOtpTimeout(true);
                        return 0;
                    }
                    return newTimer;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isOpen, timer, otpTimeout, setOtpTimeout]);

    // Handle Resend OTP
    const handleResendOtp = async () => {
        if (!target || !verificationMethod) {
            toast.error(t('Invalid verification configuration'));
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post(`${backendUrl}/api/user/send-otp`, {
                target: target,
                method: verificationMethod
            });

            if (response.data.success) {
                setTimer(300);
                setOtpTimeout(false);
                toast.success(t('New verification code sent'));
            }
        } catch (error) {
            console.error('Resend OTP error:', error);
            toast.error(error.response?.data?.message || t('Failed to resend code'));
        } finally {
            setLoading(false);
        }
    };

    // Handle OTP input
    const handleOtpInput = (element, index) => {
        if (isNaN(element.value)) return;

        const newOtp = [...otp];
        
        // Handle paste event
        if (element.value.length > 1) {
            const pastedValue = element.value.split('').slice(0, 6);
            pastedValue.forEach((digit, i) => {
                if (i < 6) newOtp[i] = digit;
            });
            setOtp(newOtp);
            if (newOtp.join('').length === 6) {
                handleVerifyOtp(newOtp.join(''));
            }
            return;
        }

        // Handle single digit input
        newOtp[index] = element.value.slice(-1);
        setOtp(newOtp);

        // Auto-focus next input
        if (element.value && index < 5) {
            const nextInput = element.parentElement.nextSibling?.querySelector('input');
            if (nextInput) nextInput.focus();
        }

        // Auto-submit when all digits are entered
        if (newOtp.join('').length === 6) {
            handleVerifyOtp(newOtp.join(''));
        }
    };

    // Handle backspace
    const handleKeyDown = (e, index) => {
        if (e.key === 'Backspace') {
            if (!otp[index] && index > 0) {
                const newOtp = [...otp];
                newOtp[index - 1] = '';
                setOtp(newOtp);
                const prevInput = e.target.parentElement.previousSibling?.querySelector('input');
                if (prevInput) prevInput.focus();
            } else {
                const newOtp = [...otp];
                newOtp[index] = '';
                setOtp(newOtp);
            }
        }
    };

    // Handle OTP verification
    const handleVerifyOtp = async (otpString) => {
        if (!otpString || otpString.length !== 6) {
            toast.error(t('Please enter complete OTP'));
            return;
        }

        if (otpTimeout) {
            toast.error(t('OTP expired. Please request a new one.'));
            return;
        }

        if (!target || !verificationMethod) {
            toast.error(t('Invalid verification configuration'));
            return;
        }

        setLoading(true);

        try {
            const response = await axios.post(`${backendUrl}/api/user/verify-otp`, {
                target: target,
                otp: otpString,
                method: verificationMethod
            });

            if (response.data.success) {
                toast.success(t('Verification successful'));
                onVerificationSuccess();
                onClose();
            } else {
                toast.error(response.data.message || t('Verification failed'));
            }
        } catch (error) {
            console.error('Verification error:', error);
            toast.error(error.response?.data?.message || t('Verification failed'));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-xl p-6 w-[90%] max-w-md">
                <div className="flex flex-col items-center">
                    <h2 className="text-xl font-semibold mb-4">{t('Verify Your Account')}</h2>
                    
                    <div className="bg-gray-50 p-3 rounded-lg w-full mb-6">
                        <p className="text-gray-600 text-center">
                            {t('Verification code sent to')}:
                        </p>
                        <p className="font-medium text-center break-all">
                            {target} {/* Use target directly */}
                        </p>
                    </div>

                    <div className="flex gap-2 mb-6">
                        {otp.map((digit, index) => (
                            <div key={index} className="w-12 h-12">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="\d*"
                                    maxLength={6}
                                    className="w-full h-full text-center text-xl font-semibold border rounded-lg focus:border-primary focus:outline-none disabled:bg-gray-100"
                                    value={digit}
                                    onChange={(e) => handleOtpInput(e.target, index)}
                                    onKeyDown={(e) => handleKeyDown(e, index)}
                                    disabled={loading}
                                    autoComplete="off"
                                />
                            </div>
                        ))}
                    </div>

                    <div className="text-center mb-6">
                        {!otpTimeout ? (
                            <p className="text-gray-600">
                                {t('Resend code in')} {Math.floor(timer / 60)}:
                                {(timer % 60).toString().padStart(2, '0')} {t('minutes')}
                            </p>
                        ) : (
                            <button
                                onClick={handleResendOtp}
                                className="text-primary hover:text-primary-dark disabled:opacity-50"
                                disabled={loading}
                            >
                                {loading ? t('Sending...') : t('Resend Code')}
                            </button>
                        )}
                    </div>

                    <div className="flex gap-4 w-full">
                        <button
                            onClick={onClose}
                            className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                            disabled={loading}
                        >
                            {t('Cancel')}
                        </button>
                        <button
                            onClick={() => handleVerifyOtp(otp.join(''))}
                            className="flex-1 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition disabled:opacity-50"
                            disabled={loading || otp.join('').length !== 6}
                        >
                            {loading ? t('Verifying...') : t('Verify')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerificationModal;
