import jwt from "jsonwebtoken";
import appointmentModel from '../models/appointmentModel.js';
import doctorModel from "../models/doctorModel.js";
import bcrypt from "bcrypt";
import validator from "validator";
import { v2 as cloudinary } from "cloudinary";
import userModel from "../models/userModel.js";
import { sendEmailNotification } from "../services/emailService.js";

// API for admin login
const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            const token = jwt.sign(email + password, process.env.JWT_SECRET);
            res.json({ success: true, token });
        } else {
            res.json({ success: false, message: "Invalid credentials" });
        }
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API to get all appointments list
const appointmentsAdmin = async (req, res) => {
  try {
    const appointments = await appointmentModel.find();
    res.json({ success: true, appointments });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: 'Failed to fetch appointments' });
  }
};

// API for appointment cancellation
const appointmentCancel = async (req, res) => {
    try {
      const { appointmentId, remarks } = req.body;
  
      // Validate input to prevent SQL injection
      if (!appointmentId || typeof appointmentId !== 'string') {
        return res.status(400).json({ success: false, message: 'Invalid appointment ID' });
      }
  
      const appointment = await appointmentModel.findById(appointmentId);
      if (!appointment) {
        return res.status(404).json({ success: false, message: 'Appointment not found' });
      }
  
      await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true });
  
      // Get user data for email notification
      const userData = await userModel.findById(appointment.userId);
      const doctorData = await doctorModel.findById(appointment.docId);
  
      // Send email notification
      await sendEmailNotification(
        userData.email,
        'Appointment Cancelled',
        {
          patientName: userData.name,
          doctorName: doctorData.name,
          date: appointment.slotDate,
          time: appointment.slotTime,
          remarks,
        },
        'appointment_cancelled'
      );
  
      res.json({ success: true, message: 'Appointment Cancelled' });
    } catch (error) {
      console.log(error);
      res.json({ success: false, message: error.message });
    }
  };

  // API for deleting an appointment
  const deleteAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const appointment = await appointmentModel.findById(id);
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }
        await appointmentModel.findByIdAndDelete(id); // Delete the appointment
        res.json({ success: true, message: 'Appointment deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};



  
  // API for appointment confirmation
  const appointmentConfirm = async (req, res) => {
    try {
      const { appointmentId } = req.body;
  
      // Validate input to prevent SQL injection
      if (!appointmentId || typeof appointmentId !== 'string') {
        return res.status(400).json({ success: false, message: 'Invalid appointment ID' });
      }
  
      const appointment = await appointmentModel.findById(appointmentId);
      if (!appointment) {
        return res.status(404).json({ success: false, message: 'Appointment not found' });
      }
  
      await appointmentModel.findByIdAndUpdate(appointmentId, { isCompleted: true });
  
      // Get user data for email notification
      const userData = await userModel.findById(appointment.userId);
      const doctorData = await doctorModel.findById(appointment.docId);
  
      // Send email notification
      await sendEmailNotification(
        userData.email,
        'Appointment Confirmed',
        {
          patientName: userData.name,
          doctorName: doctorData.name,
          date: appointment.slotDate,
          time: appointment.slotTime,
          location: doctorData.address.line1,
        },
        'appointment_confirmed'
      );
  
      res.json({ success: true, message: 'Appointment Confirmed' });
    } catch (error) {
      console.log(error);
      res.json({ success: false, message: error.message });
    }
  };

// API for adding Doctor
const addDoctor = async (req, res) => {
    try {
        const { name, email, password, speciality, degree, experience, about, fees, address } = req.body;
        const imageFile = req.file;

        // checking for all data to add doctor
        if (!name || !email || !password || !speciality || !degree || !experience || !about || !fees || !address) {
            return res.json({ success: false, message: "Missing Details" });
        }

        // validating email format
        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Please enter a valid email" });
        }

        // validating strong password
        if (password.length < 8) {
            return res.json({ success: false, message: "Please enter a strong password" });
        }

        // hashing user password
        const salt = await bcrypt.genSalt(10); // the more no. rounds, the more time it will take
        const hashedPassword = await bcrypt.hash(password, salt);

        // upload image to cloudinary
        const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: "image" });
        const imageUrl = imageUpload.secure_url;

        const doctorData = {
            name,
            email,
            image: imageUrl,
            password: hashedPassword,
            speciality,
            degree,
            experience,
            about,
            fees,
            address: JSON.parse(address),
            date: Date.now(),
        };

        const newDoctor = new doctorModel(doctorData);
        await newDoctor.save();
        res.json({ success: true, message: "Doctor Added" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API to get all doctors list for admin panel
const allDoctors = async (req, res) => {
    try {
        const doctors = await doctorModel.find({}).select("-password");
        res.json({ success: true, doctors });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API for admin dashboard data
const adminDashboard = async (req, res) => {
    try {
        const doctors = await doctorModel.find({});
        const users = await userModel.find({});
        const appointments = await appointmentModel.find({});

        const dashData = {
            doctors: doctors.length,
            appointments: appointments.length,
            patients: users.length,
            latestAppointments: appointments.reverse(),
        };

        res.json({ success: true, dashData });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Export functions
export {
    loginAdmin,
    appointmentsAdmin,
    appointmentCancel,
    appointmentConfirm,
    addDoctor,
    allDoctors,
    adminDashboard,
    deleteAppointment,
};

