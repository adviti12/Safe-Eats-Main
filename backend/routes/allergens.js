import express from "express";
import mongoose from "mongoose";
import auth from "../middleware/auth.js"; // optional, you can make search public

const router = express.Router();

// flexible model for imported CSV collection (no strict schema)
const Table1 = mongoose.model("AllergensTable1", new mongoose.Schema({}, { strict: false }), "allergens_table1");

/**
 * GET /api/allergens/search?q=term&limit=20
 * Returns results from the allergens table. Each result:
 * { source: 'table1', id: <_id>, label: 'Almond', doc: {...} }
 */
router.get("/search", async (req, res) => {
  try {
    const q = (req.query.q || "").toString().trim();
    const limit = Math.min(parseInt(req.query.limit || "20", 10), 200);
    if (!q) return res.json([]);

    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"); // escape q

    // Detect if this is an allergy-specific search
    const isAllergySearch = /allergy/i.test(q);

    // For allergy searches, extract the allergen term and search for it specifically
    let searchTerm = q;
    if (isAllergySearch) {
      searchTerm = q.replace(/allergy/gi, '').trim();
    }

    const allergenRegex = new RegExp(`\\b${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");

    // Search for specific foods
    let foodSearch1 = [];

    if (!isAllergySearch) {
      // Only include food searches for non-allergy searches
      foodSearch1 = await Table1.find({ Food: regex }).sort({ Food: 1 }).limit(limit).lean();
    }

    // Search for allergy types (Class, Type, Group, Allergy)
    let allergySearch1 = [];
    if (isAllergySearch) {
      // For allergy searches: ONLY search in Allergy field for exact matches
      allergySearch1 = await Table1.find({ Allergy: allergenRegex }).sort({ Food: 1 }).limit(limit).lean();
    } else {
      // For regular searches: search in multiple fields
      allergySearch1 = await Table1.find({
        $or: [
          { Allergy: allergenRegex },
          { Type: regex },
          { Class: regex },
          { Group: regex }
        ]
      }).sort({ Food: 1 }).limit(limit).lean();
    }

    const results = [];

    // Add specific food results
    for (const doc of foodSearch1) {
      results.push({
        source: "table1",
        id: doc._id,
        label: doc.Food,
        doc,
        searchType: "specific_food",
        priority: isAllergySearch ? 3 : 1
      });
    }

    // Add allergy-related food results
    for (const doc of allergySearch1) {
      results.push({
        source: "table1",
        id: doc._id,
        label: doc.Food || doc.Allergy,
        doc,
        searchType: "allergy_type",
        priority: isAllergySearch ? 1 : 2
      });
    }

    // Remove duplicates based on ID
    const uniqueResults = results.filter((result, index, self) =>
      index === self.findIndex(r => r.id === result.id)
    );

    // Sort by priority (allergy matches first for allergy searches, food matches first otherwise) then by label
    uniqueResults.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return (a.label || "").localeCompare(b.label || "");
    });

    res.json(uniqueResults.slice(0, limit));
  } catch (err) {
    console.error("GET /api/allergens/search error:", err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/allergens/search/:q  -> old compatibility route
 */
router.get("/search/:q", async (req, res) => {
  try {
    const q = (req.params.q || "").toString().trim();
    if (!q) return res.json([]);
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const docs = await Table1.find({ Food: regex }).sort({ Food: 1 }).limit(20).lean();
    res.json(docs);
  } catch (err) {
    console.error("GET /api/allergens/search/:q error:", err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/allergens/:id  -> fetch the full row by id
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Table1.findById(id).lean();
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (err) {
    console.error("GET /api/allergens/:id error:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
