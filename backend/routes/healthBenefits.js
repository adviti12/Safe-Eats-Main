import express from 'express';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const router = express.Router();

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
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
