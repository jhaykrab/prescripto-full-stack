import React, { useContext, useEffect, useState } from 'react';
import { DoctorContext } from '../../context/DoctorContext';
import { AppContext } from '../../context/AppContext';
import { assets } from '../../assets/assets';
import ConfirmationModal from '../../components/ConfirmationModal';
import ConcernModal from "../../components/ConcernModal";

const DoctorAppointments = () => {
    const { dToken, appointments, getAppointments, cancelAppointment, completeAppointment, confirmAppointment, deleteAppointment } = useContext(DoctorContext);
    const { slotDateFormat, calculateAge, currency } = useContext(AppContext);

    const [searchQuery, setSearchQuery] = useState('');
    const [sortCriteria, setSortCriteria] = useState('date');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [appointmentToDelete, setAppointmentToDelete] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedConcern, setSelectedConcern] = useState(null);
    const [selectedPatientName, setSelectedPatientName] = useState(''); // State to hold the selected patient's name
    const itemsPerPage = 5;

    useEffect(() => {
        if (dToken) {
            getAppointments();
        }
    }, [dToken]);

    const filteredAppointments = appointments.filter((item) =>
        item.userData.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const sortedAppointments = filteredAppointments.sort((a, b) => {
        if (sortCriteria === 'date') {
            return new Date(`${a.slotDate} ${a.slotTime}`) - new Date(`${b.slotDate} ${b.slotTime}`);
        } else if (sortCriteria === 'patient') {
            return a.userData.name.localeCompare(b.userData.name);
        }
        return 0;
    });

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = sortedAppointments.slice(indexOfFirstItem, indexOfLastItem);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);
    const totalPages = Math.ceil(sortedAppointments.length / itemsPerPage);

    const handleDelete = (id) => {
        setAppointmentToDelete(id);
        setIsModalOpen(true);
    };

    const confirmDelete = () => {
        if (appointmentToDelete) {
            deleteAppointment(appointmentToDelete);
            setIsModalOpen(false);
            setAppointmentToDelete(null);
        }
    };

    const handleViewConcern = (concern, patientName) => {
        setSelectedConcern(concern);
        setSelectedPatientName(patientName); // Store the patient's name
        setIsConcernModalOpen(true);
    };

    const handleConfirmAppointment = (id) => {
        confirmAppointment(id);
        // Update the appointment status to "Confirmed"
        const updatedAppointments = appointments.map(appointment => 
            appointment._id === id ? { ...appointment, status: 'Confirmed' } : appointment
        );
        // Update the state with the new appointments list
        setAppointments(updatedAppointments);
    };

    const handleCancelAppointment = (id) => {
        cancelAppointment(id);
        // Update the appointment status to "Cancelled"
        const updatedAppointments = appointments.map(appointment => 
            appointment._id === id ? { ...appointment, status: 'Cancelled' } : appointment
        );
        // Update the state with the new appointments list
        setAppointments(updatedAppointments);
    };

    return (
        <div className='w-full max-w-full m-5'>
            <p className='mb-3 text-lg font-medium'>All Appointments</p>

            <input
                type='text'
                placeholder='Search by patient name'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='mb-4 p-2 border rounded w-full'
            />

            <div className='bg-white border rounded text-sm max-h-[80vh] overflow-y-scroll w-full'>
                <div className='grid grid-cols-[0.8fr_1.5fr_0.9fr_0.9fr_0.9fr_0.9fr_0.9fr_0.9fr_0.9fr_0.9fr] gap-2 py-3 px-6 border-b font-medium bg-gray-100 text-center'>
                    <p>#</p>
                    <p>Patient</p>
                    <p>Payment</p>
                    <p>Age</p>
                    <p>Date & Time</p>
                    <p>Fees</p>
                    <p>Concern</p>
                    <p>Action</p>
                    <p>Status</p>
                </div>
                {currentItems.map((item, index) => (
                    <div className='grid grid-cols-[0.8fr_1.5fr_0.9fr_0.9fr_0.9fr_0.9fr_0.9fr_0.9fr_0.9fr_0.9fr] gap-2 items-center text-gray-600 py-3 px-6 border-b hover:bg-gray-50 text-center' key={item._id}>
                        <p>{indexOfFirstItem + index + 1}</p>
                        <div className='flex items-center gap-2 justify-left'>
                            <img src={item.userData.image} className='w-8 h-8 rounded-full' alt='Patient' />
                            <p className="text-purple-500">{item.userData.name}</p>
                        </div>
                        <p className='text-xs border border-primary px-2 rounded-full'>
                            {item.payment ? 'Online' : 'CASH'}
                        </p>
                        <p>{calculateAge(item.userData.dob)}</p>
                        <p>{slotDateFormat(item.slotDate)}, {item.slotTime}</p>
                        <p>{currency}{item.amount}</p>
                        {item.concern ? (
                            <button
                                className='bg-blue-500 text-white px-1 py-1 rounded hover:bg-blue-600'
                                onClick={() => handleViewConcern(item.concern, item.userData.name)}
                            >
                                View
                            </button>
                        ) : (
                            <p className='text-gray-500'>No saved concern</p>
                        )}
                        <div className='flex flex-col gap-2 justify-center'>
                            {item.status === 'Pending' ? (
                                <>
                                    <button className='border border-green-500 text-green-500 px-3 py-1 rounded hover:bg-green-500 hover:text-white' onClick={() => handleConfirmAppointment(item._id)}>Confirm</button>
                                    <button className='border border-gray-500 text-gray-500 px-3 py-1 rounded hover:bg-gray-500 hover:text-white' onClick={() => handleCancelAppointment(item._id)}>Cancel</button>
                                </>
                            ) : (
                                <span className={`text-xs ${item.status === 'Confirmed' ? 'text-green-700' : 'text-red-700'}`}>
                                    {item.status}
                                </span>
                            )}
                        </div>
                        <div className='text-center font-medium'>
                            {item.isCompleted ? <span className='text-xs text-green-700'>Completed</span> :
                                item.cancelled ? <span className='text-xs text-red-700'>Cancelled</span> :
                                <span className='text-yellow-500 flex items-center justify-center gap-2'>
                                    <img src={assets.tick_icon} alt='Complete' className='w-12 h-12 cursor-pointer' onClick={() => completeAppointment(item._id)} />
                                    <img src={assets.cancel_icon} alt='Cancel' className='w-12 h-12 cursor-pointer' onClick={() => cancelAppointment(item._id)} />
                                </span>}
                        </div>
                        <button className='bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600' onClick={() => handleDelete(item._id)}>Delete</button>
                    </div>
                ))}
            </div>

            <div className='flex justify-center mt-4'>
                {[...Array(totalPages)].map((_, index) => (
                    <button key={index} onClick={() => paginate(index + 1)} className={`mx-1 px-3 py-1 border rounded ${currentPage === index + 1 ? 'bg-blue-500 text-white' : 'text-gray-700'}`}>
                        {index + 1}
                    </button>
                ))}
            </div>

            <ConfirmationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={confirmDelete}
            />

            <ConcernModal
                isOpen={!!selectedConcern}
                onClose={() => setSelectedConcern(null)}
                concern={selectedConcern}
                patientName={selectedPatientName}
            />
        </div>
    );
};

export default DoctorAppointments;
