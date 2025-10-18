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

export const sendWelcomeEmail = async (to, username) => {
  try {
    console.log("Attempting to send welcome email to:", to);
    console.log("Email user configured:", process.env.EMAIL_USER);
    console.log("Email pass length:", process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : "MISSING");

    const info = await transporter.sendMail({
      from: `"Adviti" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Welcome to SafeEats!",
      text: `Hello ${username}! Welcome to SafeEats 🚀`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">Welcome to SafeEats!</h2>
          <p>Hello <strong>${username}</strong>!</p>
          <p>Welcome to SafeEats - your trusted companion for safe eating experiences.</p>
          <p>Start scanning the food items and enjoy your meals with confidence!</p>
          <br>
          <p>Best regards,<br>The SafeEats Team</p>
        </div>
      `,
    });

    console.log("Welcome email sent ✅:", info.response);
  } catch (err) {
    console.error("Welcome email sending failed ❌:", err);
  }
};

export const sendLoginEmail = async (to, username) => {
  try {
    console.log("Attempting to send login notification email to:", to);

    const info = await transporter.sendMail({
      from: `"Adviti" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Login Notification - SafeEats",
      text: `${username} has logged in to SafeEats`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2196F3;">Login Notification</h2>
          <p><strong>${username}</strong> has logged in to SafeEats</p>
          <p>If this wasn't you, please contact our support team immediately.</p>
          <br>
          <p>Best regards,<br>The SafeEats Team</p>
        </div>
      `,
    });

    console.log("Login notification email sent ✅:", info.response);
  } catch (err) {
    console.error("Login email sending failed ❌:", err);
  }
};

export const sendAllergenUpdateEmail = async (to, username, allergens) => {
  try {
    console.log("Attempting to send allergen update notification email to:", to);

    // Handle single allergen or multiple allergens
    let allergenText = "";
    let subjectText = "";

    if (Array.isArray(allergens) && allergens.length > 0) {
      if (allergens.length === 1) {
        allergenText = allergens[0];
        subjectText = `${allergens[0]} is now your foe`;
      } else {
        allergenText = allergens.join(", ");
        subjectText = `${allergens.length} allergens updated`;
      }
    } else if (typeof allergens === "string") {
      allergenText = allergens;
      subjectText = `${allergens} is now your foe`;
    } else {
      allergenText = "various allergens";
      subjectText = "Allergens updated";
    }

    const info = await transporter.sendMail({
      from: `"Adviti" <${process.env.EMAIL_USER}>`,
      to,
      subject: `Allergen Profile Updated - ${subjectText}`,
      text: `Hello ${username}, you have updated your allergen profile - ${allergenText} is also our foe now`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #FF6B35;">Allergen Profile Updated</h2>
          <p>Hello <strong>${username}</strong>,</p>
          <p>You have successfully updated your allergen profile.</p>
          <p><strong>${allergenText}</strong> is also our foe now! 🛡️</p>
          <p>We'll help you identify and avoid these allergens in your food choices.</p>
          <br>
          <p>Stay safe and eat well!</p>
          <p>Best regards,<br>The SafeEats Team</p>
        </div>
      `,
    });

    console.log("Allergen update email sent ✅:", info.response);
  } catch (err) {
    console.error("Allergen update email sending failed ❌:", err);
  }
};
