import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types'; // Import PropTypes for type checking

const ConcernModal = ({ isOpen, onClose, setConcern }) => {
    const { t } = useTranslation();
    const [localConcern, setLocalConcern] = useState("");

    const handleSubmit = () => {
        if (localConcern.trim() === "") {
            // Optionally show an error message if the concern is empty
            // Replace this with a more user-friendly notification if available
            alert(t("Please enter a concern before submitting."));
            return;
        }
        setConcern(localConcern);
        setLocalConcern(""); // Clear the input after submission
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-96">
                <h2 className="text-lg font-medium text-gray-700 mb-4">{t("Patient's Concern")}</h2>
                <textarea
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                    rows="4"
                    placeholder={t("Please describe your concern...")}
                    value={localConcern}
                    onChange={(e) => setLocalConcern(e.target.value)}
                />
                <div className="flex justify-end gap-2 mt-4">
                    <button className="border border-gray-400 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200" onClick={onClose}>
                        {t('Cancel')}
                    </button>
                    <button className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark" onClick={handleSubmit}>
                        {t('Submit')}
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
    setConcern: PropTypes.func.isRequired,
};

export default ConcernModal;
