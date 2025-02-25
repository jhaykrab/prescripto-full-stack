import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AppContext } from '../context/AppContext';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

const Login = () => {
  const { t } = useTranslation();
  const [state, setState] = useState('Sign Up');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const navigate = useNavigate();
  const { backendUrl, token, setToken } = useContext(AppContext);

  const onSubmitHandler = async (event) => {
    event.preventDefault();

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
      if (error.response) {
        toast.error(error.response.data.message || 'An error occurred during registration.');
      } else {
        toast.error('An error occurred during registration.');
      }
    }
  };

  useEffect(() => {
    if (token) {
      navigate('/');
    }
  }, [token, navigate]);

  return (
    <form onSubmit={onSubmitHandler} className='min-h-[80vh] flex items-center'>
      <div className='flex flex-col gap-3 m-auto items-start p-8 min-w-[340px] sm:min-w-96 border rounded-xl text-[#5E5E5E] text-sm shadow-lg'>
        <p className='text-2xl font-semibold'>{state === 'Sign Up' ? t('Create Account') : t('Login')}</p>
        <p>{t('Please')} {state === 'Sign Up' ? t('sign up') : t('log in')} {t('to book appointment')}</p>
        {state === 'Sign Up' && (
          <>
            <div className='w-full'>
              <p>{t('Full Name')}</p>
              <input onChange={(e) => setName(e.target.value)} value={name} className='border border-[#DADADA] rounded w-full p-2 mt-1' type="text" required />
            </div>
            <div className='w-full'>
              <p>{t('Phone Number')}</p>
              <input onChange={(e) => setPhone(e.target.value)} value={phone} className='border border-[#DADADA] rounded w-full p-2 mt-1' type="tel" required />
            </div>
          </>
        )}
        <div className='w-full'>
          <p>{t('Email')}</p>
          <input onChange={(e) => setEmail(e.target.value)} value={email} className='border border-[#DADADA] rounded w-full p-2 mt-1' type="email" required />
        </div>
        <div className='w-full'>
          <p>{t('Password')}</p>
          <input onChange={(e) => setPassword(e.target.value)} value={password} className='border border-[#DADADA] rounded w-full p-2 mt-1' type="password" required />
        </div>
        <button className='bg-primary text-white w-full py-2 my-2 rounded-md text-base'>{state === 'Sign Up' ? t('Create account') : t('Login')}</button>
        {state === 'Sign Up'
          ? <p>{t('Already have an account?')} <span onClick={() => setState('Login')} className='text-primary underline cursor-pointer'>{t('Login here')}</span></p>
          : <p>{t('Create a new account?')} <span onClick={() => setState('Sign Up')} className='text-primary underline cursor-pointer'>{t('Click here')}</span></p>
        }
      </div>
    </form>
  );
};

export default Login;
