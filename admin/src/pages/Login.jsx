import axios from 'axios';
import React, { useContext, useState } from 'react';
import { DoctorContext } from '../context/DoctorContext';
import { AdminContext } from '../context/AdminContext';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import MiniLanguageSwitcher from '../components/MiniLanguageSwitcher'; 
import { useNavigate } from 'react-router-dom'; 

const Login = () => {
    const { t } = useTranslation();
    const [state, setState] = useState('Admin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const { setDToken } = useContext(DoctorContext);
    const { setAToken } = useContext(AdminContext);
    const navigate = useNavigate(); 

    const onSubmitHandler = async (event) => {
        event.preventDefault();

        if (state === 'Admin') {
            const { data } = await axios.post(backendUrl + '/api/admin/login', { email, password });
            if (data.success) {
                setAToken(data.token);
                localStorage.setItem('aToken', data.token);
                window.location.href = '/admin-dashboard'; 
            } else {
                toast.error(data.message);
            }
        } else {
            const { data } = await axios.post(backendUrl + '/api/doctor/login', { email, password });
            if (data.success) {
                setDToken(data.token);
                localStorage.setItem('dToken', data.token);
                window.location.href = '/doctor-dashboard'; 
            } else {
                toast.error(data.message);
            }
        }
    };

    return (
        <div className='relative'>           
            <form onSubmit={onSubmitHandler} className='min-h-[80vh] flex items-center'>
                <div className='flex flex-col gap-3 m-auto items-start p-8 min-w-[340px] sm:min-w-96 border rounded-xl text-[#5E5E5E] text-sm shadow-lg'>
                    <MiniLanguageSwitcher />
                    <p className='text-2xl font-semibold m-auto'><span className='text-primary'>{state}</span> {t('Login')}</p>
                    <div className='w-full'>
                        <p>{t('Email')}</p>
                        <input onChange={(e) => setEmail(e.target.value)} value={email} className='border border-[#DADADA] rounded w-full p-2 mt-1' type="email" required />
                    </div>
                    <div className='w-full'>
                        <p>{t('Password')}</p>
                        <input onChange={(e) => setPassword(e.target.value)} value={password} className='border border-[#DADADA] rounded w-full p-2 mt-1' type="password" required />
                    </div>
                    <button className='bg-primary text-white w-full py-2 rounded-md text-base'>{t('Login')}</button>
                    {
                        state === 'Admin'
                            ? <p>{t('Doctor Login?')} <span onClick={() => setState('Doctor')} className='text-primary underline cursor-pointer'>{t('Click here')}</span></p>
                            : <p>{t('Admin Login?')} <span onClick={() => setState('Admin')} className='text-primary underline cursor-pointer'>{t('Click here')}</span></p>
                    }
                </div>
            </form>
        </div>
    );
};

export default Login;
