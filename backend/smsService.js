// backend/smsService.js
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Check if Twilio credentials are configured
const isTwilioConfigured = accountSid && authToken && twilioPhoneNumber;

export const sendEmergencySMS = async (to, message) => {
  // Check if Twilio is properly configured
  if (!isTwilioConfigured) {
    console.warn('Twilio credentials not configured. SMS not sent.');
    throw new Error('SMS service not configured. Please set up Twilio credentials.');
  }

  try {
    const client = twilio(accountSid, authToken);

    console.log('Sending SMS via Twilio:', { to, message, from: twilioPhoneNumber });

    const smsResponse = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: to
    });

    console.log('Twilio SMS response:', smsResponse);

    if (smsResponse && smsResponse.sid) {
      console.log('SMS sent successfully via Twilio');
      return smsResponse;
    } else {
      throw new Error('Twilio SMS sending failed');
    }

  } catch (error) {
    console.error('Error sending SMS via Twilio:', error.message);
    throw new Error('Failed to send SMS via Twilio. Please check configuration.');
  }
};
