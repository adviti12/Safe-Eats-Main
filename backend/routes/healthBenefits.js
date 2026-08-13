import express from 'express';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const router = express.Router();

const groq = new Groq({
  apiKey: process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY,
});

// Clean text using Groq API
router.post('/clean-text', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        error: 'Text is required'
      });
    }

    console.log('🚀 Starting text cleaning with raw text:', text);

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an expert at cleaning and formatting ingredient lists from product labels. Your task is to:

1. Extract only the ingredients from the messy OCR text
2. Remove ALL percentage values (like "5%", "10.5%") but KEEP brackets containing synonyms, sources, or multiple items
3. For brackets with multiple items like "acidity regulators(22,33)": TREAT EACH NUMBER AS A SEPARATE INGREDIENT (e.g., "acidity regulator 22", "acidity regulator 33")
4. For source brackets like "(from milk)": KEEP them with the ingredient (e.g., "protein (from milk)")
5. Remove ALL garbage characters, symbols, and non-ingredient text EXCEPT meaningful brackets
6. Use fuzzy logic to correct misspelled ingredient names to their closest valid food ingredient - be flexible with spelling variations and OCR errors
7. Fix compound words: separate run-together words like 'riceflour' to 'rice flour', 'wholewheat' to 'whole wheat'
8. SEPARATE INGREDIENTS BASED ON COMMAS - each comma indicates a new ingredient
9. Format output as ONE INGREDIENT PER LINE WITHOUT COMMA
10. Each ingredient should be properly spaced multi-word names (e.g., "brown sugar", "baking soda")
11. Keep source information together: if an ingredient has (from source) keep them as one line
12. Only include actual food ingredients - remove codes, numbers, symbols, and irrelevant text
13. Normalize capitalization to title case (first letter of each word capitalized)

Return ONLY the cleaned ingredient list with each ingredient on its own line. No explanations, no headers, no extra text.`
        },
        {
          role: 'user',
          content: `Clean this OCR text and extract only valid ingredients. IMPORTANT: Separate ingredients based on commas - each comma indicates a new ingredient.

${text}

Output format: Each ingredient on separate line, properly spaced, title case. Keep brackets for source information and synonyms.`
        },
      ],
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1000,
      temperature: 0.1,
    });

    const cleanedText = completion.choices[0]?.message?.content?.trim() || text;
    console.log('✅ Text cleaning completed. Cleaned:', cleanedText);

    res.json({
      success: true,
      cleanedText: cleanedText
    });

  } catch (error) {
    console.error('❌ Text cleaning error:', error);
    res.status(500).json({
      error: 'Failed to clean text',
      details: error.message
    });
  }
});

// Analyze health benefits of ingredients
router.post('/analyze', async (req, res) => {
  try {
    const { ingredients } = req.body;

    if (!ingredients || !Array.isArray(ingredients)) {
      return res.status(400).json({
        error: 'Ingredients array is required'
      });
    }

    console.log('🔬 Starting health benefits analysis for ingredients:', ingredients);

    const analysis = [];

    // Process each ingredient individually
    for (const ingredient of ingredients) {
      try {
        console.log(`📊 Analyzing ingredient: ${ingredient}`);

        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: `You are a nutrition and health expert. Analyze the health impact of food ingredients considering MODERATION.

IMPORTANT RULES:
1. Salt (sodium chloride) is ALWAYS healthy - it's an essential mineral needed for bodily functions
2. Classify ingredients as either "healthy" or "unhealthy" based on nutritional science
3. Consider ingredients in MODERATION - many nutrients are beneficial in appropriate amounts
4. Provide ONE CONCISE SENTENCE that contains all main health points
5. Be balanced and evidence-based in your assessment

Return ONLY a JSON object with this exact format:
{"isHealthy": boolean, "reason": "one concise sentence with all main health points"}

Examples:
For salt: {"isHealthy": true, "reason": "Essential mineral supporting nerve function, fluid balance, and muscle contraction when consumed in moderation"}
For sugar: {"isHealthy": false, "reason": "Can contribute to obesity, diabetes, and dental issues when consumed excessively, though small amounts are generally acceptable"}
For vitamins/minerals: {"isHealthy": true, "reason": "Essential nutrients that support immune function, energy production, and overall health when consumed in appropriate amounts"}`
            },
            {
              role: 'user',
              content: `Analyze the health impact of this ingredient: "${ingredient}"

Is this ingredient generally considered healthy or unhealthy for human consumption? Provide scientific reasoning.`
            },
          ],
          model: 'llama-3.3-70b-versatile',
          max_tokens: 200,
          temperature: 0.1,
        });

        const response = completion.choices[0]?.message?.content?.trim();
        console.log(`✅ Groq response for ${ingredient}:`, response);

        let healthData;
        try {
          // Try to parse the JSON response
          healthData = JSON.parse(response);
        } catch (parseError) {
          console.error(`❌ Failed to parse JSON for ${ingredient}:`, response);
          // Fallback classification
          const lowerIngredient = ingredient.toLowerCase();
          if (lowerIngredient.includes('salt') || lowerIngredient.includes('sodium')) {
            healthData = {
              isHealthy: true,
              reason: "Essential mineral required for nerve function, fluid balance, and muscle contraction"
            };
          } else {
            healthData = {
              isHealthy: false,
              reason: "Unable to determine health impact - requires further analysis"
            };
          }
        }

        analysis.push({
          ingredient: ingredient,
          isHealthy: healthData.isHealthy,
          reason: healthData.reason
        });

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Error analyzing ingredient ${ingredient}:`, error);
        // Fallback for individual ingredient failure
        analysis.push({
          ingredient: ingredient,
          isHealthy: false,
          reason: "Analysis failed - unable to determine health impact"
        });
      }
    }

    console.log('🎯 Health analysis completed:', analysis);

    res.json({
      success: true,
      analysis: analysis
    });

  } catch (error) {
    console.error('❌ Health benefits analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze health benefits',
      details: error.message
    });
  }
});

export default router;
