// backend/routes/emergency.js
import express from "express";
import auth from "../middleware/auth.js";
import User from "../models/User.js";
import { sendEmergencySMS } from "../smsService.js";

const router = express.Router();

// POST /api/emergency/send - Send emergency SMS to user's emergency contact
router.post("/send", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { message } = req.body;
    if (!message) return res.status(400).json({ message: "Message is required" });

    const emergencyContact = user.emergencyContact;
    if (!emergencyContact) {
      return res.status(400).json({ message: "No emergency contact found" });
    }

    try {
      console.log(`Sending emergency SMS to: ${emergencyContact}`);
      await sendEmergencySMS(emergencyContact, message);
      console.log(`Emergency SMS sent successfully to: ${emergencyContact}`);
      res.json({ message: "Emergency SMS sent successfully", smsSent: true });
    } catch (smsError) {
      console.error('SMS sending failed:', smsError);
      // Return error when SMS fails - don't pretend it was successful
      res.status(500).json({
        message: "Failed to send emergency SMS. Please contact your emergency contact directly.",
        smsSent: false,
        error: smsError.message
      });
    }
  } catch (error) {
    console.error("Emergency SMS error:", error);
    res.status(500).json({ message: "Failed to send emergency SMS" });
  }
});

export default router;
