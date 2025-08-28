// backend/routes/allergens.js
import express from "express";
import mongoose from "mongoose";
import auth from "../middleware/auth.js"; // optional, you can make search public

const router = express.Router();

// flexible models for imported CSV collections (no strict schema)
const Table1 = mongoose.model("AllergensTable1", new mongoose.Schema({}, { strict: false }), "allergens_table1");
const Table2 = mongoose.model("AllergensTable2", new mongoose.Schema({}, { strict: false }), "allergens_table2");

/**
 * GET /api/allergens/search?q=term&limit=20
 * Returns combined results from both tables. Each result:
 * { source: 'table1'|'table2', id: <_id>, label: 'Almond', doc: {...} }
 */
router.get("/search", async (req, res) => {
  try {
    const q = (req.query.q || "").toString().trim();
    const limit = Math.min(parseInt(req.query.limit || "20", 10), 200);
    if (!q) return res.json([]);

    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"); // escape q

    const p1 = Table1.find({
      $or: [
        { Food: regex },
        { Allergy: regex },
        { "Main Allergen": regex },
        { Class: regex },
        { Type: regex },
        { Group: regex }
      ]
    }).limit(limit).lean();

    const p2 = Table2.find({
      $or: [
        { Name: regex },
        { "Allergy / Main Allergen": regex }
      ]
    }).limit(limit).lean();

    const [r1, r2] = await Promise.all([p1, p2]);

    const results = [];
    for (const doc of r1) results.push({
      source: "table1",
      id: doc._id,
      label: doc.Food ?? doc.Allergy ?? doc["Main Allergen"] ?? "",
      doc
    });
    for (const doc of r2) results.push({
      source: "table2",
      id: doc._id,
      label: doc.Name ?? doc["Allergy / Main Allergen"] ?? "",
      doc
    });

    // optional: sort by label relevance, for now return first `limit`
    res.json(results.slice(0, limit));
  } catch (err) {
    console.error("GET /api/allergens/search error:", err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/allergens/:source/:id  -> fetch the full row by id
 * source must be 'table1' or 'table2'
 */
router.get("/:source/:id", async (req, res) => {
  try {
    const { source, id } = req.params;
    const Model = source === "table1" ? Table1 : Table2;
    const doc = await Model.findById(id).lean();
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (err) {
    console.error("GET /api/allergens/:source/:id error:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
