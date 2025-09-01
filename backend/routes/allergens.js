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

    // Detect if this is an allergy-specific search
    const isAllergySearch = /allergy/i.test(q);

    // For allergy searches, extract the allergen term and search for it specifically
    let searchTerm = q;
    if (isAllergySearch) {
      searchTerm = q.replace(/allergy/gi, '').trim();
    }

    const allergenRegex = new RegExp(`\\b${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");

    // Search for both specific foods AND allergy types simultaneously
    let foodSearch1 = [], foodSearch2 = [];

    if (!isAllergySearch) {
      // Only include food searches for non-allergy searches
      [foodSearch1, foodSearch2] = await Promise.all([
        Table1.find({ Food: regex }).sort({ Food: 1 }).limit(limit).lean(),
        Table2.find({ Name: regex }).sort({ Name: 1 }).limit(limit).lean()
      ]);
    }

    // All foods containing this allergen
    const [allergySearch1, allergySearch2] = await Promise.all([
      isAllergySearch ?
        // For allergy searches: ONLY search in Allergy field for exact matches
        Table1.find({ Allergy: allergenRegex }).sort({ Food: 1 }).limit(limit).lean()
        :
        // For regular searches: search in multiple fields
        Table1.find({
          $or: [
            { Allergy: allergenRegex },
            { "Main Allergen": allergenRegex },
            { Type: regex }
          ]
        }).sort({ Food: 1 }).limit(limit).lean(),

      isAllergySearch ?
        // For allergy searches: ONLY search in Allergy / Main Allergen field
        Table2.find({ "Allergy / Main Allergen": allergenRegex }).sort({ Name: 1 }).limit(limit).lean()
        :
        // For regular searches: use the current logic
        Table2.find({ "Allergy / Main Allergen": allergenRegex }).sort({ Name: 1 }).limit(limit).lean()
    ]);

    const results = [];

    // Add specific food results
    for (const doc of foodSearch1) results.push({
      source: "table1",
      id: doc._id,
      label: doc.Food,
      doc,
      searchType: "specific_food",
      priority: isAllergySearch ? 3 : 1 // Lower priority for food matches in allergy search
    });
    for (const doc of foodSearch2) results.push({
      source: "table2",
      id: doc._id,
      label: doc.Name,
      doc,
      searchType: "specific_food",
      priority: isAllergySearch ? 3 : 1
    });

    // Add allergy-related food results
    for (const doc of allergySearch1) results.push({
      source: "table1",
      id: doc._id,
      label: doc.Food || doc.Allergy || doc["Main Allergen"],
      doc,
      searchType: "allergy_type",
      priority: isAllergySearch ? 1 : 2 // Highest priority for allergy matches when searching for allergies
    });
    for (const doc of allergySearch2) results.push({
      source: "table2",
      id: doc._id,
      label: doc.Name || doc["Allergy / Main Allergen"],
      doc,
      searchType: "allergy_type",
      priority: isAllergySearch ? 1 : 2
    });

    // Remove duplicates based on ID and source
    const uniqueResults = results.filter((result, index, self) =>
      index === self.findIndex(r => r.id === result.id && r.source === result.source)
    );

    // Sort by priority (allergy matches first for allergy searches, food matches first otherwise) then by label
    uniqueResults.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.label.localeCompare(b.label);
    });

    res.json(uniqueResults.slice(0, limit));
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
