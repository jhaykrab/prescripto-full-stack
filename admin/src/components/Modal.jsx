import React from "react";

const Modal = ({ isOpen, actionType, closeModal, handleConfirm }) => {
  if (!isOpen) return null;

  const message =
    actionType === "cancel"
      ? "Are you sure you want to cancel this appointment?"
      : "Are you sure you want to confirm this appointment?";

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96 text-center">
        <p className="text-lg font-semibold">{message}</p>
        
        <div className="mt-4 flex justify-center gap-4">
          <button
            className="px-4 py-2 bg-red-500 text-white rounded"
            onClick={closeModal}
          >
            No
          </button>
          <button
            className="px-4 py-2 bg-green-500 text-white rounded"
            onClick={handleConfirm}
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
