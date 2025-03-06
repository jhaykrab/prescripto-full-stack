import React, { useCallback, useContext, useEffect, useState, useRef } from 'react';
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
import { Eye, EyeOff } from 'lucide-react';


const Login = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { backendUrl, token, setToken } = useContext(AppContext);
    const recaptchaContainerRef = useRef(null);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        state: 'Sign Up',
        name: '',
        phone: '',
        email: '',
        password: '',
        verificationMethod: ''
    });

    const [passwordVisible, setPasswordVisible] = useState(false);
    const togglePasswordVisibility = () => {
        setPasswordVisible(prev => !prev);
    };

    const [otpTimeout, setOtpTimeout] = useState(false);

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
        if (field === 'phone') {
            // Remove any non-digit characters
            const cleanValue = value.replace(/[^\d]/g, '');
            
            // Format the phone number
            let formattedValue = cleanValue;
            
            // If number starts with 09, convert to 63 format
            if (cleanValue.startsWith('09')) {
                formattedValue = '63' + cleanValue.substring(1);
            } else if (cleanValue.startsWith('639')) {
                formattedValue = cleanValue;
            } else if (cleanValue.startsWith('63')) {
                formattedValue = cleanValue;
            }
            
            setFormData(prev => ({
                ...prev,
                [field]: formattedValue
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [field]: value
            }));
        }
    };

    const isFormValid = () => {
        const { state, name, password, verificationMethod, phone, email } = formData;
        const { otpVerified } = otpState;
    
        if (state === 'Sign Up') {
            // Basic validations
            if (!name || !password || !otpVerified) {
                return false;
            }
            if (!otpVerified) {
                return verificationMethod === 'phone' ? !!phone : !!email;
            }
            return !!phone && !!email && isValidPhilippineNumber(phone);
        }
        return email && password;
    };


    useEffect(() => {
        return () => {
            if (window.recaptchaVerifier) {
                window.recaptchaVerifier.clear();
                window.recaptchaVerifier = null;
            }
        };
    }, []);

    const RATE_LIMIT_TIMEOUT = 60000; 
    const MAX_ATTEMPTS = 3; 


    const initializeRecaptcha = async () => {
        try {
            // Clear existing reCAPTCHA if it exists
            if (window.recaptchaVerifier) {
                await window.recaptchaVerifier.clear();
                window.recaptchaVerifier = null;
            }

            const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                size: 'normal', // Changed from 'invisible' to 'normal'
                callback: () => {
                    console.log('reCAPTCHA verified successfully');
                },
                'expired-callback': () => {
                    toast.error('reCAPTCHA expired. Please try again.');
                    if (window.recaptchaVerifier) {
                        window.recaptchaVerifier.clear();
                        window.recaptchaVerifier = null;
                    }
                }
            });

            await verifier.render();
            return verifier;
        } catch (error) {
            console.error('Error initializing reCAPTCHA:', error);
            throw error;
        }
    };

    const validatePhoneNumber = (phone) => {
        // Remove any non-digit characters
        const cleaned = phone.replace(/\D/g, '');
        
        // Check if it's a valid Philippine mobile number
        // Should be 11 digits starting with '09' or 12 digits starting with '639'
        if (cleaned.startsWith('09') && cleaned.length === 11) {
            return true;
        }
        if (cleaned.startsWith('639') && cleaned.length === 12) {
            return true;
        }
        return false;
    };

    const handleSendOtp = async () => {
        setLoading(true);
        const { verificationMethod, phone, email } = formData;

        if (!verificationMethod) {
            toast.error('Please select a verification method');
            setLoading(false);
            return;
        }

        try {
            let target;
            if (verificationMethod === 'phone') {
                if (!phone) {
                    toast.error('Please enter a phone number');
                    setLoading(false);
                    return;
                }
                // Format the phone number
                let formattedPhone = phone.replace(/[^\d+]/g, '');
                if (formattedPhone.startsWith('0')) {
                    formattedPhone = '63' + formattedPhone.substring(1);
                } else if (!formattedPhone.startsWith('63') && !formattedPhone.startsWith('+63')) {
                    formattedPhone = '63' + formattedPhone;
                }
                if (!formattedPhone.startsWith('+')) {
                    formattedPhone = '+' + formattedPhone;
                }
                target = formattedPhone;
            } else {
                if (!email) {
                    toast.error('Please enter an email address');
                    setLoading(false);
                    return;
                }
                target = email.trim();
            }

            const response = await axios.post(`${backendUrl}/api/user/send-otp`, {
                target: target,
                method: verificationMethod
            });

            if (response.data.success) {
                setOtpState(prev => ({
                    ...prev,
                    otpSent: true,
                    isModalOpen: true,
                    otpTimeout: false
                }));
                toast.success(`Verification code sent to your ${verificationMethod}`);
            }
        } catch (error) {
            console.error(`${verificationMethod} verification error:`, error);
            const errorMessage = error.response?.data?.message || 'Failed to send verification code';
            toast.error(errorMessage);
            
            if (error.response?.status === 400 && error.response?.data?.message?.includes('wait')) {
                setOtpState(prev => ({ ...prev, otpTimeout: true }));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (otpInput) => {
        const { verificationMethod, email } = formData;

        try {
            if (verificationMethod === 'email') {
                const response = await axios.post(`${backendUrl}/api/user/verify-otp`, {
                    target: email.trim(),
                    otp: otpInput,
                    method: 'email'
                });

                if (!response.data.success) {
                    throw new Error(response.data.message || 'Verification failed');
                }

                return true;
            }
            return false;
        } catch (error) {
            console.error('OTP Verification Error:', error);
            toast.error(error.response?.data?.message || 'Invalid OTP. Please try again.');
            return false;
        }
    };

    // Update the isValidPhilippineNumber function
    const isValidPhilippineNumber = (phone) => {
        if (!phone) return false;
        
        // Remove any spaces or special characters except plus sign
        const cleanPhone = phone.replace(/[^\d+]/g, '');
        
        // Convert to international format if needed
        let formattedPhone = cleanPhone;
        if (cleanPhone.startsWith('09')) {
            formattedPhone = '+63' + cleanPhone.substring(1);
        } else if (cleanPhone.startsWith('63')) {
            formattedPhone = '+' + cleanPhone;
        }
        
        // Check if the final format matches +63 followed by 10 digits
        const isValid = /^\+63\d{10}$/.test(formattedPhone);
        return isValid;
    };
    

    const onSubmitHandler = async (event) => {
        event.preventDefault();
        const { state, name, phone, email, password, verificationMethod } = formData;
        const { otpVerified } = otpState;

        try {
            if (state === 'Sign Up') {
                // Validate all required fields are present
                if (!name?.trim() || !password?.trim() || !email?.trim() || !verificationMethod) {
                    toast.error('All fields are required');
                    return;
                }

                // Format phone number for validation
                let formattedPhone = phone.trim();
                
                // Remove any non-digit characters except the plus sign
                formattedPhone = formattedPhone.replace(/[^\d+]/g, '');
                
                // Ensure the number starts with +63
                if (formattedPhone.startsWith('63')) {
                    formattedPhone = '+' + formattedPhone;
                } else if (formattedPhone.startsWith('09')) {
                    formattedPhone = '+63' + formattedPhone.substring(1);
                }

                // Validate phone number format
                if (!isValidPhilippineNumber(formattedPhone)) {
                    toast.error('Please enter a valid Philippine phone number');
                    return;
                }

                // Prepare registration data
                const registrationData = {
                    name: name.trim(),
                    email: email.trim(),
                    password: password.trim(),
                    verificationMethod,
                    phone: formattedPhone,
                    isVerified: otpVerified
                };

                console.log('Registration payload:', registrationData);

                try {
                    const { data } = await axios.post(`${backendUrl}/api/user/register`, registrationData);
                    if (data.success) {
                        localStorage.setItem('token', data.token);
                        setToken(data.token);
                        navigate('/');
                        toast.success(data.message || 'Registration successful!');
                    } else {
                        throw new Error(data.message || 'Registration failed');
                    }
                } catch (error) {
                    if (error.response) {
                        const errorMessage = error.response.data.message;
                        if (error.response.status === 400) {
                            // Handle validation errors
                            toast.error(errorMessage || 'Invalid registration data');
                        } else if (error.response.status === 500) {
                            // Handle server errors
                            toast.error('Server error. Please try again later.');
                            console.error('Server error details:', error.response.data);
                        } else {
                            toast.error(errorMessage || 'Registration failed');
                        }
                    } else if (error.request) {
                        // Network error
                        toast.error('Network error. Please check your connection.');
                    } else {
                        toast.error(error.message || 'An unexpected error occurred');
                    }
                    console.error('Registration error:', error.response?.data || error);
                }
            } else {
                // Login logic remains unchanged
                if (!email?.trim() || !password?.trim()) {
                    toast.error('Email and password are required');
                    return;
                }

                const { data } = await axios.post(`${backendUrl}/api/user/login`, {
                    email: email.trim(),
                    password: password.trim()
                });

                if (data.success) {
                    localStorage.setItem('token', data.token);
                    setToken(data.token);
                    navigate('/');
                    toast.success('Login successful!');
                } else {
                    toast.error(data.message || 'Login failed');
                }
            }
        } catch (error) {
            console.error('Submission error:', error);
            toast.error('An unexpected error occurred');
        }
    };

    useEffect(() => {
        if (token) navigate('/');
    }, [token, navigate]);

    const handleVerificationError = (error) => {
        let errorMessage = 'Failed to send verification code';
        
        if (error.code) {
            switch (error.code) {
                case 'auth/invalid-phone-number':
                    errorMessage = 'Invalid phone number format';
                    break;
                case 'auth/quota-exceeded':
                    errorMessage = 'Too many attempts. Please try again later';
                    break;
                case 'auth/captcha-check-failed':
                    errorMessage = 'Security check failed. Please try again';
                    break;
                case 'auth/invalid-app-credential':
                    errorMessage = 'Please refresh the page and try again';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'Network error. Please check your connection';
                    break;
                default:
                    errorMessage = error.message || 'Failed to send verification code';
            }
        }
        
        toast.error(errorMessage);
    };
   
    return (
        <div className="relative min-h-screen">
            <div 
                ref={recaptchaContainerRef} 
                className="recaptcha-container fixed bottom-0 right-0 invisible"
            ></div>
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

                            <div className='w-full mt-2'>
                                <p>{t('Verify using:')}</p>
                                <div className='flex gap-4 mt-1'>
                                    <label className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition ${formData.verificationMethod === 'phone' ? 'border-blue-500 bg-blue-100' : 'border-gray-300 text-gray-400'}`}>
                                        <input
                                            type="radio"
                                            value="phone"
                                            checked={formData.verificationMethod === 'phone'}
                                            onChange={(e) => handleInputChange('verificationMethod', e.target.value)}
                                            disabled={otpState.otpVerified}
                                        />
                                        {t('Phone Number')}
                                    </label>
                                    <label className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition ${formData.verificationMethod === 'email' ? 'border-blue-500 bg-blue-100' : 'border-gray-300 text-gray-400'}`}>
                                        <input
                                            type="radio"
                                            value="email"
                                            checked={formData.verificationMethod === 'email'}
                                            onChange={(e) => handleInputChange('verificationMethod', e.target.value)}
                                            disabled={otpState.otpVerified}
                                        />
                                        {t('Email')}
                                    </label>
                                </div>
                            </div>

                            <div className='w-full'>
                                <p>{t('Phone Number')}</p>
                                <PhoneInput
                                    country={'ph'} 
                                    value={formData.phone}
                                    onChange={(value) => handleInputChange('phone', value)}
                                    inputClass='!w-full'
                                    containerClass='!w-full'
                                    disabled={formData.verificationMethod === 'email' && !otpState.otpVerified}
                                    inputProps={{
                                        required: true,
                                        className: 'custom-phone-input',
                                    }}
                                    enableSearch={true}
                                    searchPlaceholder={t('Search country')}
                                    searchNotFound={t('No country found')}
                                    preferredCountries={['ph', 'in', 'us', 'gb', 'ae', 'sa', 'eg']} 
                                    enableAreaCodes={true}
                                    autoFormat={true}
                                    placeholder={t('Enter phone number')}
                                    isValid={(value) => {
                                        if (!value) return true;
                                        return isValidPhilippineNumber(value);
                                    }}
                                />
                            </div>

                            <div className='w-full'>
                                <p>{t('Email')}</p>
                                <input
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    value={formData.email}
                                    className='border rounded w-full p-2 mt-1'
                                    type="email"
                                    required={true}
                                    disabled={formData.verificationMethod === 'phone' && !otpState.otpVerified}
                                />
                            </div>
                        </>
                    )}                         
                 
                    <div className='w-full'>
                        <p>{t('Password')}</p>
                        <div className='relative w-full'>
                            <input 
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                                value={formData.password} 
                                className='border rounded w-full p-2 pr-10 mt-1' 
                                type={passwordVisible ? 'text' : 'password'} 
                                required 
                                placeholder={t('Enter password')}
                            />
                            <button
                                type='button'
                                onClick={togglePasswordVisibility}
                                className='absolute inset-y-0 right-3 flex items-center'
                            >
                                {passwordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <button 
                        type="button" 
                        onClick={handleSendOtp} 
                        className={`w-full py-2 my-1 rounded-md text-base ${
                            otpState.otpVerified 
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                            : 'bg-primary text-white'
                        }`}
                        disabled={otpState.otpVerified}
                    >
                        {otpState.otpVerified ? t('OTP Verified') : t('Send OTP')}
                    </button>

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
                    onVerificationSuccess={() => {
                        setOtpState(prev => ({ 
                            ...prev, 
                            otpVerified: true,
                            isModalOpen: false 
                        }));
                    }}
                    target={formData.email}
                    verificationMethod="email"
                    handleSendOtp={handleSendOtp}
                    handleVerifyOtp={handleVerifyOtp}
                    otpTimeout={otpTimeout}
                    setOtpTimeout={handleOtpTimeout}
                />
            </form>
        </div>
    );
};

export default Login;
