import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587, // or 587
  secure: false, // true for 465, false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
transporter.verify((err, success) => {
  if (err) {
    console.error("SMTP Connection Failed ❌:", err);
  } else {
    console.log("SMTP Server Ready ✅");
  }
});

export const sendWelcomeEmail = async (to) => {
  try {
    console.log("Attempting to send welcome email to:", to);
    console.log("Email user configured:", process.env.EMAIL_USER);
    console.log("Email pass length:", process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : "MISSING");

    const info = await transporter.sendMail({
      from: `"Adviti" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Welcome!",
      text: "Hello, welcome to our app 🚀",
    });

    console.log("Email sent ✅:", info.response);
  } catch (err) {
    console.error("Email sending failed ❌:", err);
  }
};
