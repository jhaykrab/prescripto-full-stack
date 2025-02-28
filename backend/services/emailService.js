import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken'; 
import crypto from 'crypto';
dotenv.config();

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const otpStore = new Map();

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const templates = {
  otp: {
    subject: 'Your Verification Code',
    generateText: (data) => 
      `Your verification code is: ${data.otp}\n\n` +
      `This code will expire in 10 minutes.\n\n` +
      `If you didn't request this code, please ignore this email.`,
    generateHtml: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; text-align: center;">Verification Code</h2>
        <div style="background-color: #f8f9fa; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center;">
          <p style="font-size: 16px; color: #666;">Your verification code is:</p>
          <h1 style="font-size: 36px; letter-spacing: 5px; margin: 20px 0; color: #007bff;">${data.otp}</h1>
          <p style="color: #666;">This code will expire in 10 minutes</p>
        </div>
        <p style="color: #999; font-size: 14px; text-align: center;">
          If you didn't request this code, please ignore this email.
        </p>
      </div>
    `
  },
  verify_email: {
    subject: 'Verify Your Email',
    generateText: (data) => 
      `Hello ${data.name},\n\n` +
      `Please verify your email by clicking on the following link:\n` +
      `${data.verificationLink}\n\n` +
      `This link will expire in 24 hours.\n\n` +
      `If you didn't request this verification, please ignore this email.`,
    generateHtml: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; text-align: center;">Email Verification</h2>
        <div style="background-color: #f8f9fa; border-radius: 10px; padding: 20px; margin: 20px 0;">
          <p style="color: #666;">Hello ${data.name},</p>
          <p style="color: #666;">Please verify your email by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.verificationLink}" 
               style="background-color: #007bff; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; font-weight: bold;">
              Verify Email
            </a>
          </div>
          <p style="color: #666;">This link will expire in 24 hours.</p>
          <p style="color: #999; font-size: 14px;">
            If you didn't request this verification, please ignore this email.
          </p>
        </div>
      </div>
    `
  }
};

async function sendEmailNotification(to, subject, text, templateType = 'default') {
  try {
    const emailContent = {
      from: process.env.SENDGRID_VERIFIED_SENDER,
      to,
      subject: templateType === 'default' ? subject : templates[templateType].subject,
      text: templateType === 'default' ? text : templates[templateType].generateText(text),
      html: templateType === 'default' ? text : 
            templates[templateType].generateHtml ? 
            templates[templateType].generateHtml(text) : 
            templates[templateType].generateText(text),
    };
    
    const info = await sgMail.send(emailContent);
    return { success: true, messageId: info[0].messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    if (error.response) {
      console.error(error.response.body);
    }
    return { success: false, error: error.message };
  }
}

// Generate verification token
const generateVerificationToken = (userId, email) => {
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Send Email OTP
const sendEmailOTP = async (email) => {
  const otp = generateOTP();
  
  otpStore.set(email, {
    otp,
    expiry: Date.now() + 10 * 60 * 1000 // 10 minutes
  });

  return sendEmailNotification(
    email,
    templates.otp.subject,
    { otp },
    'otp'
  );
};

// Verify Email OTP
const verifyEmailOTP = (email, userOtp) => {
  const storedData = otpStore.get(email);
  
  if (!storedData) {
    return { success: false, message: 'OTP not found' };
  }

  if (Date.now() > storedData.expiry) {
    otpStore.delete(email);
    return { success: false, message: 'OTP has expired' };
  }

  const isValid = storedData.otp === userOtp;
  
  if (isValid) {
    otpStore.delete(email);
    return { success: true, message: 'OTP verified successfully' };
  }

  return { success: false, message: 'Invalid OTP' };
};

// Verify Email Token
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

// Send Email Verification
const sendEmailVerification = async (userId, email, name) => {
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
};

export { 
  sendEmailNotification, 
  sendEmailVerification, 
  verifyEmailToken,
  sendEmailOTP,
  verifyEmailOTP
};