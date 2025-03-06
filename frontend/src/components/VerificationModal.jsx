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
    const [timer, setTimer] = useState(300); // Changed to 300 seconds (5 minutes)
    const [loading, setLoading] = useState(false);
    const [originalTarget, setOriginalTarget] = useState(null);

    // Reset states when modal opens
    useEffect(() => {
        if (isOpen) {
            setOtp(['', '', '', '', '', '']);
            setTimer(300);
            setOtpTimeout(false);
            setOriginalTarget(target); // Set the original target when modal opens
        }
    }, [isOpen, setOtpTimeout, target]);

    // Timer logic
    useEffect(() => {
        let interval;
        if (isOpen && timer > 0 && !otpTimeout) {
            interval = setInterval(() => {
                setTimer((prev) => {
                    if (prev <= 1) {
                        setOtpTimeout(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isOpen, timer, otpTimeout, setOtpTimeout]);

    const handleResendOtp = async () => {
        setOtp(['', '', '', '', '', '']);
        setTimer(300);
        setOtpTimeout(false);
        setOriginalTarget(target);
        await handleSendOtp();
    };

    const handleOtpInput = (element, index) => {
        if (isNaN(element.value)) return;

        const newOtp = [...otp];
        newOtp[index] = element.value.slice(-1);

        if (element.value.length > 1) {
            const pastedValue = element.value.split('').slice(0, 6);
            pastedValue.forEach((digit, i) => {
                if (i < 6) newOtp[i] = digit;
            });
        } else if (element.value && index < 5) {
            const nextInput = element.parentElement.nextSibling.querySelector('input');
            if (nextInput) nextInput.focus();
        }

        setOtp(newOtp);
    };

    const handleKeyDown = (e, index) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            const prevInput = e.target.parentElement.previousSibling.querySelector('input');
            if (prevInput) prevInput.focus();
            
            const newOtp = [...otp];
            newOtp[index - 1] = '';
            setOtp(newOtp);
        }
    };

    const handleSendOtp = async () => {
        if (!target) {
            toast.error(t('Target is required'));
            return;
        }

        const trimmedTarget = target.trim();
        setLoading(true);
        
        try {
            // Updated API endpoint and payload for TextLink
            const response = await axios.post(`${backendUrl}/api/user/send-otp`, {
                target: trimmedTarget,
                method: verificationMethod,
                // Add any additional TextLink-specific parameters here
                channel: verificationMethod === 'phone' ? 'sms' : 'email'
            });

            if (response.data.success) {
                setOriginalTarget(trimmedTarget);
                resetStates();
                toast.success(t('Verification code sent successfully'));
            } else {
                throw new Error(response.data.message || 'Failed to send OTP');
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || t('Failed to send OTP');
            toast.error(errorMessage);
            setOtpTimeout(true);
            setOriginalTarget(null);
        } finally {
            setLoading(false);
        }
    };

    const verifyOtp = async () => {
        const otpString = otp.join('');
        
        if (!target) {
            toast.error('Please request a new OTP');
            return;
        }

        if (otpString.length !== 6) {
            toast.error('Please enter complete OTP');
            return;
        }

        setLoading(true);

        try {
            const response = await axios.post(`${backendUrl}/api/sms/verify-otp`, {
                target: target,
                method: 'phone',
                otp: otpString
            });

            if (response.data.success) {
                toast.success('OTP verified successfully');
                onVerificationSuccess();
                onClose();
            }
        } catch (error) {
            console.error('Verification Error:', error.response?.data || error);
            toast.error(error.response?.data?.message || 'Verification failed');
            setOtp(['', '', '', '', '', '']);
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
                            {originalTarget || target}
                        </p>
                    </div>

                    <div className="flex gap-2 mb-6">
                        {otp.map((digit, index) => (
                            <div key={index} className="w-12 h-12">
                                <input
                                    type="text"
                                    maxLength="1"
                                    className="otp-input w-full h-full text-center text-xl font-semibold border rounded-lg focus:border-primary focus:outline-none"
                                    value={digit}
                                    onChange={(e) => handleOtpInput(e.target, index)}
                                    onKeyDown={(e) => handleKeyDown(e, index)}
                                    onKeyPress={(e) => e.key === 'Enter' && otp.join('').length === 6 && verifyOtp()}
                                    disabled={loading}
                                    autoComplete="off"
                                />
                            </div>
                        ))}
                    </div>

                    <div className="text-center mb-6">
                        {!otpTimeout ? (
                            <p className="text-gray-600">
                                {t('Resend code in')} {timer} {t('seconds')}
                            </p>
                        ) : (
                            <button
                                onClick={handleSendOtp}
                                className="text-primary hover:text-primary-dark"
                                disabled={loading}
                            >
                                {loading ? t('Sending...') : t('Resend Code')}
                            </button>
                        )}
                    </div>

                    <div className="flex gap-4 w-full">
                        <button
                            onClick={onClose}
                            className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                            disabled={loading}
                        >
                            {t('Cancel')}
                        </button>
                        <button
                            onClick={verifyOtp}
                            className="flex-1 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
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
