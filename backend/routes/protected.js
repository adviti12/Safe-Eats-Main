// routes/protected.js
import express from "express";
import auth from "../middleware/auth.js";
import User from "../models/User.js";

const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    res.json({ message: "You accessed a protected route", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
