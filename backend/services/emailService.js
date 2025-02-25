import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const templates = {
  welcome: {
    subject: 'Welcome to Prescripto!',
    generateText: (name) => `
Dear ${name},
Welcome to Prescripto! We're excited to have you join our healthcare platform.
Here's what you can do with your account:
- Book appointments with trusted doctors
- Manage your medical appointments
- Access your medical history
- Receive important notifications
If you have any questions, please don't hesitate to contact our support team.
Best regards,
The Prescripto Team
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
The Prescripto Team
    `,
  },
  appointment_cancelled: {
    subject: 'Appointment Cancelled',
    generateText: (details) => `
Dear ${details.patientName},
Your appointment with Dr. ${details.doctorName} on ${details.date} at ${details.time} has been cancelled. Remarks: ${details.remarks}
Best regards,
The Prescripto Team
    `,
  },
};

async function sendEmailNotification(to, subject, text, templateType = 'default') {
  try {
    const emailContent = {
      from: process.env.SMTP_USER,
      to,
      subject: templateType === 'default' ? subject : templates[templateType].subject,
      text: templateType === 'default' ? text : templates[templateType].generateText(text),
      html: templateType === 'default' ? text : templates[templateType].generateText(text),
    };
    const info = await transporter.sendMail(emailContent);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
}

export { sendEmailNotification };