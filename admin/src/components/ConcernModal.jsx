import React from 'react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';

const ConcernModal = ({ isOpen, onClose, concern, patientName }) => {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-96">
                <h2 className="text-lg font-medium mb-4">
                    <span className="text-blue-500">{t(patientName)}</span>
                    <span className="text-black">{`'s Concern`}</span>
                </h2>
                <div className="border p-4 rounded-md bg-gray-100">
                    <p className="text-black">{concern || "No concern provided."}</p>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                    <button className="border border-gray-400 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200" onClick={onClose}>
                        {t('Close')}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Prop Types for validation
ConcernModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    concern: PropTypes.string,
    patientName: PropTypes.string.isRequired, // Ensure patientName is required
};

export default ConcernModal;
