import express from "express";
import Appointment from "../models/appointmentModel.js"; 

const router = express.Router();

// Update appointment status (confirm/cancel) and remarks
router.put("/:id", async (req, res) => {
  try {
    const { action, remarks } = req.body; 

    let updateFields = {};
    if (action === "confirm") {
      updateFields = { isCompleted: true, status: 'Confirmed' };
    } else if (action === "cancel") {
      updateFields = { cancelled: true, status: 'Cancelled' };
    }

    if (remarks !== undefined) {
      updateFields.remarks = remarks;
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    );

    res.status(200).json(updatedAppointment);
  } catch (error) {
    res.status(500).json({ message: "Error updating appointment", error });
  }
});

export default router;