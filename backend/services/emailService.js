import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken'; 
import { storeOtp } from '../utils/otpStore.js';
dotenv.config();

// Initialize SendGrid with API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);


export const sendEmailOTP = async (email, name, otp) => {
  try {
    // Validate inputs
    if (!email || !otp) {
      throw new Error('Email and OTP are required');
    }

    // Validate SendGrid configuration
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SendGrid API key is missing');
    }

    if (!process.env.SENDGRID_VERIFIED_SENDER) {
      throw new Error('SendGrid verified sender email is missing');
    }

    // Log configuration (remove in production)
    console.log('SendGrid Configuration:', {
      apiKeyPresent: !!process.env.SENDGRID_API_KEY,
      sender: process.env.SENDGRID_VERIFIED_SENDER,
      recipient: email
    });

    const msg = {
      to: email,
      from: process.env.SENDGRID_VERIFIED_SENDER,
      subject: 'Your Verification Code - Montervirgen',
      text: `Your verification code is: ${otp}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Your Verification Code</h2>
          <p>Hello ${name || 'User'},</p>
          <p>Your verification code is: <strong>${otp}</strong></p>
          <p>This code will expire in 5 minutes.</p>
        </div>
      `
    };

    const response = await sgMail.send(msg);
    
    if (response[0].statusCode === 202) {
      return {
        success: true,
        message: 'Email sent successfully'
      };
    } else {
      throw new Error(`Failed to send email. Status: ${response[0].statusCode}`);
    }
  } catch (error) {
    // More detailed error logging
    console.error('Send Email OTP Error Details:', {
      message: error.message,
      code: error.code,
      response: error.response?.body
    });
    
    if (error.code === 401) {
      throw new Error('Invalid SendGrid API key. Please check your configuration.');
    }
    
    throw new Error(error.message || 'Email service configuration error');
  }
};

// Define templates first before using them
const templates = {
  welcome: {
    subject: 'Welcome to Montervirgen!',
    generateText: (name) => `
Dear ${name},
Welcome to Montervirgen! We're excited to have you join our healthcare platform.
Here's what you can do with your account:
- Book appointments with trusted doctors
- Manage your medical appointments
- Access your medical history
- Receive important notifications
If you have any questions, please don't hesitate to contact our support team.
Best regards,
The Montervirgen Team
    `,
  },
  verify_email: {
    subject: 'Verify Your Email - Montervirgen',
    generateText: (data) => `
Dear ${data.name},

Thank you for creating an account with Montervirgen. To complete your registration, please verify your email address by clicking the link below:

${data.verificationLink}

This link will expire in 24 hours.

If you didn't create an account with Montervirgen, please ignore this email.

Best regards,
The Montervirgen Team
    `,
    generateHtml: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Montervirgen!</h2>
        <p>Dear ${data.name},</p>
        <p>Thank you for creating an account with Montervirgen. To complete your registration, please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.verificationLink}" style="background-color: #4CAF50; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px;">Verify Email Address</a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #0066cc;">${data.verificationLink}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account with Montervirgen, please ignore this email.</p>
        <p>Best regards,<br>The Montervirgen Team</p>
      </div>
    `,
  },
  appointment_confirmed: {
    subject: 'Appointment Confirmation',
    generateText: (details) => `
Dear ${details.patientName},
Your appointment has been confirmed by the admin. Here are your appointment details:
Doctor: Dr. ${details.doctorName}
Date: ${details.date}
Time: ${details.time}
Location: ${details.location}
Please arrive 10 minutes before your scheduled time.
If you need to cancel or reschedule, please do so at least 24 hours in advance.
Best regards,
The Montervirgen Team
    `,
  },
  appointment_cancelled: {
    subject: 'Appointment Cancelled',
    generateText: (details) => `
Dear ${details.patientName},
Your appointment with Dr. ${details.doctorName} on ${details.date} at ${details.time} has been cancelled. Remarks: ${details.remarks}
Best regards,
The Montervirgen Team
    `,
  },
  otp: {
    subject: 'Your Verification Code - Montervirgen',
    generateText: (data) => `
Dear ${data.name},

Your verification code is: ${data.otp}

This code will expire in 5 minutes.

If you didn't request this code, please ignore this email.

Best regards,
The Montervirgen Team
    `,
    generateHtml: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your Verification Code</h2>
        <p>Dear ${data.name},</p>
        <p>Your verification code is:</p>
        <div style="text-align: center; margin: 30px 0;">
          <h1 style="font-size: 36px; letter-spacing: 5px; color: #4CAF50;">${data.otp}</h1>
        </div>
        <p>This code will expire in 5 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
        <p>Best regards,<br>The Montervirgen Team</p>
      </div>
    `
  },
appointment_reminder: {
    subject: 'Appointment Reminder',
    generateText: (details) => `
Dear ${details.patientName},
This is a reminder that you have an appointment with Dr. ${details.doctorName} on ${details.date} at ${details.time}. Please arrive 10 minutes before your scheduled time.
Best regards,
The Montervirgen Team
    `,
  },
  appointment_rescheduled: {
    subject: 'Appointment Rescheduled',
    generateText: (details) => `
Dear ${details.patientName},
Your appointment with Dr. ${details.doctorName} on ${details.date} at ${details.time} has been rescheduled to ${details.newDate} at ${details.newTime}.
Best regards,
The Montervirgen Team
    `,
  },
  appointment_completed: {
    subject: 'Appointment Completed',
    generateText: (details) => `
Dear ${details.patientName},
Your appointment with Dr. ${details.doctorName} on ${details.date} at ${details.time} has been completed.
Best regards,
The Montervirgen Team
    `,
  },

};

// Generate verification token
const generateVerificationToken = (userId, email) => {
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

async function verifyEmailOTP(otp, storedOTP) {
  try {
    return {
      success: otp === storedOTP,
      message: otp === storedOTP ? 'OTP verified successfully' : 'Invalid OTP'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function sendEmailNotification(to, subject, text, templateType = 'default') {
  try {
    const msg = {
      to,
      from: process.env.SENDGRID_VERIFIED_SENDER,
      subject: templateType === 'default' ? subject : templates[templateType].subject,
      text: templateType === 'default' ? text : templates[templateType].generateText(text),
      html: templateType === 'default' ? text : 
            templates[templateType].generateHtml ? 
            templates[templateType].generateHtml(text) : 
            templates[templateType].generateText(text),
    };

    const response = await sgMail.send(msg);
    console.log('Email sent:', response[0].headers['x-message-id']);
    // Log the email content for debugging (remove in production)
    console.log('Email content:', msg);
    return { success: true, messageId: response[0].headers['x-message-id'] };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
}

const verifyEmailToken = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return {
      success: true,
      userId: decoded.userId,
      email: decoded.email
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

async function sendEmailVerification(userId, email, name) {
  const verificationToken = generateVerificationToken(userId, email);
  const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
  
  const emailData = {
    name,
    verificationLink
  };

  return sendEmailNotification(
    email,
    templates.verify_email.subject,
    emailData,
    'verify_email'
  );
}



export {
  sendEmailVerification,
  sendEmailNotification,
  verifyEmailToken,
  verifyEmailOTP
};

