// backend/routes/auth.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import auth from "../middleware/auth.js";
import { sendWelcomeEmail, sendLoginEmail, sendAllergenUpdateEmail } from "../emailService.js";

const router = express.Router();

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "Missing fields" });
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "User already exists" });
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);
    const newUser = new User({ name, email, password: hashed });
    await newUser.save();

    // Send welcome email with username (don't wait for it to avoid delaying response)
    sendWelcomeEmail(email, name).catch(err => console.error('Email sending failed:', err));

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({
      message: "User registered",
      token,
      user: { id: newUser._id, name: newUser.name, email: newUser.email, allergies: newUser.allergies || [] }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Missing fields" });
    const user = await User.findOne({ email }).select("+password");
    if (!user || !user.password) return res.status(400).json({ message: "Invalid email or password" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

    // Send login notification email (don't wait for it to avoid delaying response)
    sendLoginEmail(user.email, user.name).catch(err => console.error('Email sending failed:', err));

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({
      message: "Login successful",
      token,
      user: { id: user._id, name: user.name, email: user.email, allergies: user.allergies || [] }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET PROFILE (protected)
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE PROFILE (protected) - updates name and allergies
router.put("/profile", auth, async (req, res) => {
  try {
    const updates = {};
    if (typeof req.body.name === "string") updates.name = req.body.name;
    if (Array.isArray(req.body.allergies)) updates.allergies = req.body.allergies;

    // Get the user before update to check if allergies changed
    const userBeforeUpdate = await User.findById(req.userId).select("-password");

    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Send allergen update email if allergies were updated
    if (Array.isArray(req.body.allergies) && userBeforeUpdate) {
      const oldAllergies = userBeforeUpdate.allergies || [];
      const newAllergies = req.body.allergies;

      // Check if allergies actually changed
      const allergiesChanged = JSON.stringify(oldAllergies.sort()) !== JSON.stringify(newAllergies.sort());

      if (allergiesChanged && newAllergies.length > 0) {
        sendAllergenUpdateEmail(user.email, user.name, newAllergies).catch(err =>
          console.error('Allergen update email sending failed:', err)
        );
      }
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/auth/me  -- update name and allergies (protected)
router.patch("/me", auth, async (req, res) => {
  try {
    const { name, allergies } = req.body;

    // Get the user before update to check if allergies changed
    const userBeforeUpdate = await User.findById(req.userId).select("-password");

    // Build update object only with allowed fields
    const updates = {};
    if (typeof name === "string") updates.name = name;
    if (Array.isArray(allergies)) updates.allergies = allergies;

    // Update and return the updated user (without password)
    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Send allergen update email if allergies were updated
    if (Array.isArray(allergies) && userBeforeUpdate) {
      const oldAllergies = userBeforeUpdate.allergies || [];
      const newAllergies = allergies;

      // Check if allergies actually changed
      const allergiesChanged = JSON.stringify(oldAllergies.sort()) !== JSON.stringify(newAllergies.sort());

      if (allergiesChanged && newAllergies.length > 0) {
        sendAllergenUpdateEmail(user.email, user.name, newAllergies).catch(err =>
          console.error('Allergen update email sending failed:', err)
        );
      }
    }

    // Return the updated user object (frontend expects either res.data or res.data.user)
    return res.json(user);
  } catch (err) {
    console.error("PATCH /api/auth/me error:", err);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
