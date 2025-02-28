import React, { useCallback,useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AppContext } from '../context/AppContext';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import VerificationModal from '../components/VerificationModal';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../config/firebase';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import '../styles/phoneInput.css';

const Login = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { backendUrl, token, setToken } = useContext(AppContext);

    const [formData, setFormData] = useState({
        state: 'Sign Up',
        name: '',
        phone: '',
        email: '',
        password: '',
        verificationMethod: 'phone'
    });

    const [otpTimeout, setOtpTimeout] = useState(false);

    // Pass setOtpTimeout as a callback to avoid render-phase updates
    const handleOtpTimeout = useCallback((value) => {
        setOtpTimeout(value);
    }, []);

    const [otpState, setOtpState] = useState({
        isModalOpen: false,
        otpSent: false,
        otpVerified: false,
        otpTimeout: false
    });

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const isFormValid = () => {
        const { state, name, password, verificationMethod, phone, email } = formData;
        const { otpVerified } = otpState;

        if (state === 'Sign Up') {
            return name && password &&
                ((verificationMethod === 'phone' && phone) || 
                 (verificationMethod === 'email' && email)) &&
                otpVerified;
        }
        return email && password;
    };

    const handleSendOtp = async () => {
        const { verificationMethod, phone, email } = formData;
        const target = verificationMethod === 'phone' ? phone : email;

        if (!target) {
            toast.error(`Please enter a valid ${verificationMethod}`);
            return;
        }

        try {
            if (verificationMethod === 'phone') {
                if (!window.recaptchaVerifier) {
                    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                        'size': 'invisible',
                        'callback': () => {}
                    });
                }

                const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
                const confirmationResult = await signInWithPhoneNumber(
                    auth, 
                    formattedPhone, 
                    window.recaptchaVerifier
                );
                window.confirmationResult = confirmationResult;
            } else {
                const response = await axios.post(`${backendUrl}/api/sms/send-otp`, {
                    target: email,
                    method: 'email'
                }, {
                    headers: { 'Content-Type': 'application/json' }
                });

                if (!response.data.success) {
                    throw new Error(response.data.message || 'Failed to send OTP');
                }
            }

            setOtpState(prev => ({
                ...prev,
                otpSent: true,
                isModalOpen: true,
                otpTimeout: false
            }));

            setTimeout(() => {
                setOtpState(prev => ({ ...prev, otpTimeout: true }));
            }, 300000);

            toast.success('OTP sent successfully');

        } catch (error) {
            console.error('Verification Error:', error);
            // Log the detailed error response
            if (error.response) {
                console.error('Error Response Data:', error.response.data);
                console.error('Error Response Status:', error.response.status);
            }
            
            toast.error(
                error.response?.data?.message || 
                error.response?.data?.error || 
                error.message || 
                'Failed to send verification'
            );
    
            if (verificationMethod === 'phone' && window.recaptchaVerifier) {
                window.recaptchaVerifier.clear();
                window.recaptchaVerifier = null;
            }
        }
    };

    const handleVerifyOtp = async (otpInput) => {
        const { verificationMethod, email } = formData;

        try {
            if (verificationMethod === 'phone') {
                const result = await window.confirmationResult.confirm(otpInput);
                return !!result.user;
            } else {
                const response = await axios.post(`${backendUrl}/api/sms/verify-otp`, {
                    target: email,
                    otp: otpInput,
                    method: 'email'
                });
                return response.data.success;
            }
        } catch (error) {
            console.error('OTP Verification Error:', error);
            toast.error('Invalid OTP. Please try again.');
            return false;
        }
    };

    const onSubmitHandler = async (event) => {
        event.preventDefault();
        const { state, name, phone, email, password } = formData;

        try {
            const endpoint = state === 'Sign Up' ? `${backendUrl}/api/user/register` : `${backendUrl}/api/user/login`;
            const userData = state === 'Sign Up' ? { name, phone, email, password } : { email, password };

            const { data } = await axios.post(endpoint, userData);

            if (data.success) {
                localStorage.setItem('token', data.token);
                setToken(data.token);
                navigate('/');
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'An error occurred');
        }
    };

    useEffect(() => {
        if (token) navigate('/');
    }, [token, navigate]);

    return (
        <>
        <div id="recaptcha-container"></div> 
        <form onSubmit={onSubmitHandler} className='min-h-[80vh] flex items-center'>
            <div className='flex flex-col gap-3 m-auto items-start p-8 min-w-[340px] sm:min-w-96 border rounded-xl text-[#5E5E5E] text-sm shadow-lg'>
                <p className='text-2xl font-semibold'>
                    {formData.state === 'Sign Up' ? t('Create Account') : t('Login')}
                </p>
                <p>{t('Please')} {formData.state === 'Sign Up' ? t('sign up') : t('log in')} {t('to book appointment')}</p>

                {formData.state === 'Sign Up' && (
                    <>
                        <div className='w-full'>
                            <p>{t('Full Name')}</p>
                            <input 
                                onChange={(e) => handleInputChange('name', e.target.value)} 
                                value={formData.name} 
                                className='border border-[#DADADA] rounded w-full p-2 mt-1' 
                                type="text" 
                                required 
                            />
                        </div>

                        {/* Verification Method Selection */}
                        <div className='w-full mt-2'>
                            <p>{t('Verify using:')}</p>
                            <div className='flex gap-4 mt-1'>
                                <label className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition ${formData.verificationMethod === 'phone' ? 'border-blue-500 bg-blue-100' : 'border-gray-300 text-gray-400'}`}>
                                    <input
                                        type="radio"
                                        value="phone"
                                        checked={formData.verificationMethod === 'phone'}
                                        onChange={(e) => handleInputChange('verificationMethod', e.target.value)}
                                    />
                                    {t('Phone Number')}
                                </label>
                                <label className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition ${formData.verificationMethod === 'email' ? 'border-blue-500 bg-blue-100' : 'border-gray-300 text-gray-400'}`}>
                                    <input
                                        type="radio"
                                        value="email"
                                        checked={formData.verificationMethod === 'email'}
                                        onChange={(e) => handleInputChange('verificationMethod', e.target.value)}
                                    />
                                    {t('Email')}
                                </label>
                            </div>
                        </div>

                        {/* Phone Number */}
                        <div className='w-full'>
                            <p>{t('Phone Number')}</p>
                            <PhoneInput
                                country={'ph'} 
                                value={formData.phone}
                                onChange={(value) => handleInputChange('phone', value)}
                                inputClass={`!w-full ${formData.verificationMethod === 'email' ? '!bg-gray-200 !text-gray-500' : ''}`}
                                containerClass={`!w-full ${formData.verificationMethod === 'email' ? 'opacity-60' : ''}`}
                                disabled={formData.verificationMethod === 'email'}
                                inputProps={{
                                    required: formData.verificationMethod === 'phone',
                                    className: 'custom-phone-input',
                                }}
                                enableSearch={true}
                                searchPlaceholder={t('Search country')}
                                searchNotFound={t('No country found')}
                                preferredCountries={['in', 'us', 'gb', 'ae', 'ph', 'sa', 'eg']} 
                                enableAreaCodes={true}
                                autoFormat={true}
                                placeholder={t('Enter phone number')}
                            />
                        </div>

                        {/* Email */}
                        <div className='w-full'>
                            <p>{t('Email')}</p>
                            <input
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                value={formData.email}
                                className={`border rounded w-full p-2 mt-1 ${formData.verificationMethod === 'phone' ? 'bg-gray-200 text-gray-500' : ''}`}
                                type="email"
                                required={formData.verificationMethod === 'email'}
                                disabled={formData.verificationMethod === 'phone'}
                            />
                        </div>
                    </>
                )}

                <div className='w-full'>
                    <p>{t('Password')}</p>
                    <input 
                        onChange={(e) => handleInputChange('password', e.target.value)} 
                        value={formData.password} 
                        className='border rounded w-full p-2 mt-1' 
                        type="password" 
                        required 
                    />
                </div>

                {/* Send OTP Button */}
                <button 
                    type="button" 
                    onClick={handleSendOtp} 
                    className='bg-primary text-white w-full py-2 my-1 rounded-md text-base'
                >
                    {t('Send OTP')}
                </button>

                {/* Create Account Button */}
                <button
                    type="submit"
                    className={`w-full py-2 rounded-md text-base transition ${
                        isFormValid() ? 'bg-primary text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    disabled={!isFormValid()}
                >
                    {formData.state === 'Sign Up' ? t('Create account') : t('Login')}
                </button>

                {formData.state === 'Sign Up'
                    ? <p>{t('Already have an account?')} <span onClick={() => handleInputChange('state', 'Login')} className='text-primary underline cursor-pointer'>{t('Login here')}</span></p>
                    : <p>{t('Create a new account?')} <span onClick={() => handleInputChange('state', 'Sign Up')} className='text-primary underline cursor-pointer'>{t('Click here')}</span></p>
                }
            </div>

            <VerificationModal
                    isOpen={otpState.isModalOpen}
                    onClose={() => setOtpState(prev => ({ ...prev, isModalOpen: false }))}
                    onVerificationSuccess={() => setOtpState(prev => ({ ...prev, otpVerified: true }))}
                    target={formData.verificationMethod === 'phone' ? formData.phone : formData.email}
                    verificationMethod={formData.verificationMethod}
                    handleSendOtp={handleSendOtp}
                    handleVerifyOtp={handleVerifyOtp}
                    setOtpTimeout={handleOtpTimeout}
                    otpTimeout={otpTimeout}
                />
        </form>
        </>
    );
};

export default Login;