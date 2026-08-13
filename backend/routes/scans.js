import express from "express";
import Scan from "../models/Scan.js";
import auth from "../middleware/auth.js";
import { uploadImageToS3 } from "../s3Service.js";

const router = express.Router();

// POST /api/scans - Save a new scan
router.post("/", auth, async (req, res) => {
  try {
    const { imageUrl, extractedText, ingredients, warnings } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ message: "Image is required" });
    }

    let publicImageUrl = imageUrl;

    // Check if the imageUrl is a base64 string
    if (imageUrl.startsWith("data:image/")) {
      try {
        console.log("Uploading image to S3...");
        publicImageUrl = await uploadImageToS3(imageUrl);
        console.log("Successfully uploaded to S3:", publicImageUrl);
      } catch (uploadError) {
        console.error("S3 Upload Failed:", uploadError);
        return res.status(500).json({ 
          message: "Failed to upload image to S3", 
          error: uploadError.message 
        });
      }
    }

    const newScan = new Scan({
      userId: req.userId,
      imageUrl: publicImageUrl,
      extractedText: extractedText || "",
      ingredients: ingredients || [],
      warnings: warnings || [],
      timestamp: Date.now()
    });

    await newScan.save();
    res.status(201).json(newScan);
  } catch (err) {
    console.error("Save scan error:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/scans - Get all scans for logged in user
router.get("/", auth, async (req, res) => {
  try {
    const scans = await Scan.find({ userId: req.userId }).sort({ timestamp: -1 });
    res.json(scans);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/scans/:id - Get a specific scan
router.get("/:id", auth, async (req, res) => {
  try {
    const scan = await Scan.findOne({ _id: req.params.id, userId: req.userId });
    if (!scan) return res.status(404).json({ message: "Scan not found" });
    res.json(scan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/scans/:id - Delete a specific scan
router.delete("/:id", auth, async (req, res) => {
  try {
    const scan = await Scan.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!scan) return res.status(404).json({ message: "Scan not found" });
    
    res.json({ message: "Scan deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
