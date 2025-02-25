import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useContext } from 'react';
import { AdminContext } from '../../context/AdminContext';
import { AppContext } from '../../context/AppContext';
import { useTranslation } from 'react-i18next'; 

const AllAppointments = () => {
  const { aToken, appointments, getAllAppointments } = useContext(AdminContext);
  const { slotDateFormat, calculateAge, currency } = useContext(AppContext);
  const { t } = useTranslation(); 

  const [remarks, setRemarks] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const appointmentsPerPage = 10;
  const [searchQuery, setSearchQuery] = useState('');
  const [sortCriteria, setSortCriteria] = useState('date');

  useEffect(() => {
    if (aToken) {
      getAllAppointments();
    }
  }, [aToken]);

  const handleRemarkChange = (id, value) => {
    setRemarks((prevRemarks) => ({
      ...prevRemarks,
      [id]: value,
    }));
  };

  const handleSendRemark = async (id) => {
    try {
      const response = await axios.put(`/api/appointments/${id}`, {
        remarks: remarks[id],
      }, { headers: { Authorization: `Bearer ${aToken}` } });

      console.log(`Remark for appointment ${id}: ${remarks[id]}`);
      getAllAppointments(); // Refresh the appointments list
    } catch (error) {
      console.error("Error sending remark:", error);
    }
  };

  const handleStatusChange = async (id, action) => {
    try {
      const response = await axios.put(`/api/appointments/${id}`, {
        action,
      }, { headers: { Authorization: `Bearer ${aToken}` } });

      console.log(`Status for appointment ${id} updated to ${action}`);
      getAllAppointments(); // Refresh the appointments list
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSortChange = (e) => {
    setSortCriteria(e.target.value);
  };

  // Filter appointments based on search query
  const filteredAppointments = appointments.filter((appointment) => {
    const patientName = appointment.userData.name.toLowerCase();
    const doctorName = appointment.docData.name.toLowerCase();
    const appointmentDate = slotDateFormat(appointment.slotDate).toLowerCase();
    const appointmentTime = appointment.slotTime.toLowerCase();
    const query = searchQuery.toLowerCase();
    return (
      patientName.includes(query) ||
      doctorName.includes(query) ||
      appointmentDate.includes(query) ||
      appointmentTime.includes(query)
    );
  });

  // Sort appointments based on sort criteria
  const sortedAppointments = filteredAppointments.sort((a, b) => {
    if (sortCriteria === 'date') {
      const dateA = new Date(`${a.slotDate} ${a.slotTime}`);
      const dateB = new Date(`${b.slotDate} ${b.slotTime}`);
      return dateA - dateB;
    } else if (sortCriteria === 'patient') {
      const nameA = a.userData.name.toLowerCase();
      const nameB = b.userData.name.toLowerCase();
      return nameA.localeCompare(nameB);
    } else if (sortCriteria === 'doctor') {
      const nameA = a.docData.name.toLowerCase();
      const nameB = b.docData.name.toLowerCase();
      return nameA.localeCompare(nameB);
    }
    return 0;
  });

  // Calculate the appointments to be displayed on the current page
  const indexOfLastAppointment = currentPage * appointmentsPerPage;
  const indexOfFirstAppointment = indexOfLastAppointment - appointmentsPerPage;
  const currentAppointments = sortedAppointments.slice(indexOfFirstAppointment, indexOfLastAppointment);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className='w-full max-w-full m-5'>
      <p className='mb-3 text-lg font-medium'>{t('Appointments')}</p>
      <input
        type='text'
        placeholder={t('Search by patient, doctor, date, or time')}
        value={searchQuery}
        onChange={handleSearchChange}
        className='mb-4 p-2 border rounded w-full'
      />
      <div className='flex justify-between mb-4'>
        <div>
          <label htmlFor='sortCriteria' className='mr-2'>{t('Sort by')}:</label>
          <select id='sortCriteria' value={sortCriteria} onChange={handleSortChange} className='p-2 border rounded'>
            <option value='date'>{t('Date')}</option>
            <option value='patient'>{t('Patient')}</option>
            <option value='doctor'>{t('Doctor')}</option>
          </select>
        </div>
      </div>
      <div className='bg-white border rounded text-sm max-h-[80vh] overflow-y-scroll'>
        <div className='hidden sm:grid grid-cols-[0.5fr_2fr_1fr_2fr_2fr_1fr_1fr_1fr_2fr] grid-flow-col py-3 px-6 border-b'>
          <p className='text-center'>#</p>
          <p className='text-center'>{t('Patient')}</p>
          <p className='text-center'>{t('Age')}</p>
          <p className='text-center'>{t('Date & Time')}</p>
          <p className='text-center'>{t('Doctor')}</p>
          <p className='text-center'>{t('Fees')}</p>
          <p className='text-center'>{t('Action')}</p>
          <p className='text-center'>{t('Status')}</p>
          <p className='text-center'>{t('Remarks')}</p>
        </div>
        {currentAppointments.map((item, index) => (
          <div className='flex flex-wrap justify-between max-sm:gap-2 sm:grid sm:grid-cols-[0.5fr_2fr_1fr_2fr_2fr_1fr_1fr_1fr_2fr] items-center text-gray-500 py-3 px-6 border-b hover:bg-gray-50' key={index}>
            <p className='max-sm:hidden text-center'>{indexOfFirstAppointment + index + 1}</p>
            <div className='flex items-center gap-2 text-center'>
              <img src={item.userData.image} className='w-8 rounded-full' alt="" /> <p>{item.userData.name}</p>
            </div>
            <p className='max-sm:hidden text-center'>{calculateAge(item.userData.dob)}</p>
            <p className='text-center'>{slotDateFormat(item.slotDate)}, {item.slotTime}</p>
            <div className='flex items-center justify-center gap-2 text-center'>
              <img src={item.docData.image} className='w-8 rounded-full bg-gray-200' alt="" /> <p>{item.docData.name}</p>
            </div>
            <p className='text-center'>{currency}{item.amount}</p>
            <div className='flex flex-col gap-2 text-center'>
              <button onClick={() => handleStatusChange(item._id, 'confirm')} className='text-green-500 border border-green-500 rounded px-2 py-1'>{t('Confirm')}</button>
              <button onClick={() => handleStatusChange(item._id, 'cancel')} className='text-red-500 border border-red-500 rounded px-2 py-1'>{t('Cancel')}</button>
            </div>
            <p className='text-xs font-medium text-center'>
              {item.cancelled ? t('Cancelled') : item.isCompleted ? t('Completed') : t('Pending')}
            </p>
            <div className='flex flex-col items-center gap-2 text-center'>
              <textarea
                value={remarks[item._id] || ''}
                onChange={(e) => handleRemarkChange(item._id, e.target.value)}
                className='border rounded px-2 py-1 w-40 h-16'
              />
              <button onClick={() => handleSendRemark(item._id)} className='text-blue-500 border border-blue-500 rounded px-2 py-1'>{t('Send')}</button>
            </div>
          </div>
        ))}
      </div>
      <div className='flex justify-center mt-4'>
        <nav>
          <ul className='flex list-none'>
            {[...Array(Math.ceil(sortedAppointments.length / appointmentsPerPage)).keys()].map(number => (
              <li key={number + 1} className='mx-1'>
                <button onClick={() => paginate(number + 1)} className={`px-3 py-1 border rounded ${currentPage === number + 1 ? 'bg-blue-500 text-white' : 'bg-white text-blue-500'}`}>
                  {number + 1}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
};

export default AllAppointments;
