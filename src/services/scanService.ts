
// Mock database for scan history
import { createWorker } from 'tesseract.js';
import Groq from 'groq-sdk';

const SCAN_HISTORY_KEY = "allergen-detector-scan-history";

// Initialize Groq client
const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

// Clean text using Groq API
export const cleanTextWithGroq = async (rawText: string): Promise<string> => {
  console.log('🚀 Starting Groq text cleaning with raw text:', rawText);

  try {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    console.log('🔑 Groq API Key exists:', !!apiKey);

    if (!apiKey) {
      console.error('❌ Groq API key not found in environment variables');
      return rawText; // Fallback to original text
    }

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an expert at cleaning and formatting ingredient lists from product labels. Your task is to:

1. Extract only the ingredients section from the text
2. Remove ALL percentage values (like "5%", "10.5%")
3. Remove ALL garbage characters, symbols, and non-ingredient text
4. Clean up OCR errors and correct misspelled ingredient names
5. Correct compound words like 'riceflour' to 'rice flour' with proper spacing
6. Format each ingredient on a separate line
7. Remove extra spaces and normalize spacing within each ingredient name
8. Only keep valid ingredient names - remove any non-food items, codes, or irrelevant text

Return ONLY the cleaned ingredient list with each ingredient on its own line. Do not include any explanations, headers, or additional text.`,
        },
        {
          role: 'user',
          content: `Clean this product label text and extract only the valid ingredients (one per line, no percentages, no garbage): ${rawText}`,
        },
      ],
      model: 'gemma2-9b-it',
      max_tokens: 1000,
      temperature: 0.1,
    });

    const cleanedText = completion.choices[0]?.message?.content?.trim() || rawText;
    console.log('✅ Groq cleaning completed. Original:', rawText);
    console.log('✅ Groq cleaning completed. Cleaned:', cleanedText);

    return cleanedText;
  } catch (error) {
    console.error('❌ Error cleaning text with Groq:', error);
    console.error('❌ Error details:', error.message);
    return rawText; // Fallback to original text
  }
};

export interface ScanResult {
  id: string;
  userId: string;
  timestamp: number;
  imageUrl: string;
  extractedText: string;
  ingredients: string[];
  warnings: string[];
}

// Get scan history from localStorage
const getScanHistory = (): ScanResult[] => {
  const history = localStorage.getItem(SCAN_HISTORY_KEY);
  return history ? JSON.parse(history) : [];
};

// Save scan history to localStorage
const saveScanHistory = (history: ScanResult[]): void => {
  localStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(history));
};

// Extract text from an image using Tesseract.js
export const extractTextFromImage = async (imageUrl: string): Promise<string> => {
  try {
    // Create a new worker
    const worker = await createWorker();
    
    // Load language data
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    
    // Configure worker to improve OCR for product labels
    await worker.setParameters({
      tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789,.():;%-_\'"/&',
      preserve_interword_spaces: '1',
    });
    
    // Recognize text in image
    const result = await worker.recognize(imageUrl);
    
    // Terminate the worker
    await worker.terminate();
    
    return result.data.text || "";
  } catch (error) {
    console.error("OCR Error:", error);
    return "";
  }
};

// Advanced ingredient cleaning function
const cleanIngredientText = (text: string): string => {
  return text
    // Remove percentage values (e.g., "5%", "10.5%")
    .replace(/\d+(?:\.\d+)?%/g, '')
    // Remove common garbage patterns but preserve spaces
    .replace(/[^\w\s\-\(\)\.,]/g, '') // Keep only letters, numbers, spaces, hyphens, parentheses, dots, commas
    // Fix spacing issues - ensure single spaces between words
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    // Remove leading/trailing whitespace and punctuation
    .trim()
    .replace(/^[\W\s]+|[\W\s]+$/g, '') // Remove leading/trailing non-word chars and spaces
    // Fix any remaining spacing issues
    .replace(/\s*([\-])\s*/g, '$1') // Remove spaces around hyphens
    .replace(/\s*([\(])\s*/g, '$1') // Remove spaces before opening parentheses
    .replace(/\s*([\,])\s*/g, '$1 ') // Ensure space after commas
    .trim();
};

// Check if text looks like a valid ingredient
const isValidIngredient = (text: string): boolean => {
  // Remove whitespace for checking
  const cleanText = text.replace(/\s/g, '');

  // Must have at least some letters
  if (!/[a-zA-Z]/.test(cleanText)) return false;

  // Must be between 2-50 characters
  if (cleanText.length < 2 || cleanText.length > 50) return false;

  // Should not be just numbers or symbols
  if (/^[^a-zA-Z]*$/.test(cleanText)) return false;

  // Filter out common non-ingredient terms
  const nonIngredients = [
    'ingredients', 'contains', 'maycontain', 'allergens', 'nutrition',
    'serving', 'size', 'calories', 'fat', 'carbs', 'protein', 'sodium',
    'total', 'per', 'amount', 'daily', 'value', 'percent', 'product',
    'net', 'weight', 'manufactured', 'distributed', 'keep', 'refrigerated'
  ];

  const lowerText = cleanText.toLowerCase();
  if (nonIngredients.some(term => lowerText.includes(term))) return false;

  return true;
};

// Parse ingredients from text with improved accuracy
export const parseIngredients = (text: string): string[] => {
  console.log('🔍 Starting ingredient parsing with text:', text);

  // First, try to split by newlines (from Groq's formatted output)
  let ingredients: string[] = [];

  if (text.includes('\n')) {
    ingredients = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    console.log('📝 Split by newlines:', ingredients);
  } else {
    // Fallback to original parsing logic
    // Identify ingredients section with various formats
    let ingredientsSection = text;

    // Look for common ingredient section headers
    const ingredientsHeaderPatterns = [
      /ingredients\s*:(.+?)(?:allergen|contain|may contain|nutrition|storage|allergy advice)/is,
      /ingredients\s*:(.+)/is,
      /^(.+?)(?:allergen|contain|may contain|nutrition|storage|allergy advice)/is
    ];

    // Try to find the ingredients section
    for (const pattern of ingredientsHeaderPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        ingredientsSection = match[1].trim();
        break;
      }
    }

    // Split ingredients by common delimiters
    if (ingredientsSection.includes(',')) {
      ingredients = splitIngredientsWithParentheses(ingredientsSection);
    } else if (ingredientsSection.includes('.')) {
      ingredients = ingredientsSection.split('.')
        .map(item => item.trim())
        .filter(item => item.length > 0);
    } else {
      // If no obvious separators, try to split by capital letters preceded by space
      const matches = ingredientsSection.match(/([A-Z][a-z]+(?:\s+[a-z]+)*)/g);
      if (matches && matches.length > 1) {
        ingredients = matches.map(item => item.trim());
      } else {
        // Last resort: just use the whole text
        ingredients = [ingredientsSection];
      }
    }
  }

  // Clean up each ingredient and filter out invalid ones
  const cleanedIngredients = ingredients
    .map(item => cleanIngredientText(item))
    .filter(item => item.length > 0);

  console.log('🧹 After cleaning:', cleanedIngredients);

  const validIngredients = cleanedIngredients.filter(item => isValidIngredient(item));
  console.log('✅ Valid ingredients after filtering:', validIngredients);

  const finalIngredients = validIngredients.map(item => {
    // Final cleanup: normalize spacing and capitalization
    return item
      .replace(/\s+/g, ' ') // Single spaces
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase()); // Title case
  });

  console.log('🎯 Final ingredients:', finalIngredients);

  return finalIngredients;
};

// Helper function to handle commas within parentheses
function splitIngredientsWithParentheses(text: string): string[] {
  const ingredients: string[] = [];
  let currentIngredient = '';
  let inParentheses = 0;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    if (char === '(') {
      inParentheses++;
      currentIngredient += char;
    } else if (char === ')') {
      inParentheses--;
      currentIngredient += char;
    } else if (char === ',' && inParentheses === 0) {
      if (currentIngredient.trim()) {
        ingredients.push(currentIngredient.trim());
      }
      currentIngredient = '';
    } else {
      currentIngredient += char;
    }
  }
  
  // Add the last ingredient if any
  if (currentIngredient.trim()) {
    ingredients.push(currentIngredient.trim());
  }
  
  return ingredients;
}

// Check for allergens in ingredients with better detection
export const checkForAllergens = (ingredients: string[], userAllergies: string[]): string[] => {
  const warnings: string[] = [];
  
  // Enhanced allergen mapping for better detection
  const allergenMap: Record<string, string[]> = {
    "wheat": ["wheat", "flour", "gluten", "enriched flour", "wheat flour"],
    "milk": ["milk", "dairy", "cream", "lactose", "butter", "butterfat", "skimmed milk powder", "whey"],
    "eggs": ["eggs", "egg", "albumin", "lecithin", "lysozyme", "ovalbumin"],
    "soy": ["soy", "soya", "lecithin", "emulsifier", "tofu", "edamame"],
    "nuts": ["nuts", "peanuts", "tree nuts", "hazelnut", "almond", "walnut", "pecan", "cashew", "pistachio", "macadamia"],
    "fish": ["fish", "seafood", "salmon", "tuna", "cod", "anchovy", "sardine"],
    "shellfish": ["shellfish", "crab", "lobster", "shrimp", "prawn", "crayfish", "mussel", "oyster", "scallop"],
    "sesame": ["sesame", "tahini", "sesame oil", "sesame seed"],
    "gluten": ["gluten", "wheat", "barley", "rye", "oats", "malt", "spelt", "kamut"],
    "sulfites": ["sulfites", "sulfur dioxide", "metabisulfite", "e220", "e228"],
  };

  userAllergies.forEach(allergy => {
    const allergenTerms = allergenMap[allergy.toLowerCase()] || [allergy.toLowerCase()];
    
    const found = ingredients.some(ingredient =>
      allergenTerms.some(term => ingredient.toLowerCase().includes(term))
    );
    
    if (found) {
      warnings.push(`Contains ${allergy}`);
    }
  });
  
  return warnings;
};

// Process text for real-time allergen detection
export const processTextForAllergens = async (text: string, userAllergies: string[]): Promise<{
  ingredients: string[],
  warnings: string[]
}> => {
  console.log('🔬 Starting processTextForAllergens with:', { text, userAllergies });

  // First clean the text with Groq for better results
  const cleanedText = await cleanTextWithGroq(text);
  console.log('🧽 Text after Groq cleaning:', cleanedText);

  // Parse ingredients from cleaned text
  const ingredients = parseIngredients(cleanedText);
  console.log('📋 Parsed ingredients:', ingredients);

  // Check for allergens
  const warnings = checkForAllergens(ingredients, userAllergies);
  console.log('⚠️ Allergen warnings:', warnings);

  const result = { ingredients, warnings };
  console.log('📤 Final result:', result);

  return result;
};

// Save a new scan
export const saveScan = async (
  userId: string,
  imageUrl: string,
  userAllergies: string[]
): Promise<ScanResult> => {
  // Extract text from image using real OCR
  const rawText = await extractTextFromImage(imageUrl);

  // Clean the extracted text using Groq
  const cleanedText = await cleanTextWithGroq(rawText);

  // Parse ingredients from cleaned text
  const ingredients = parseIngredients(cleanedText);

  // Check for allergens
  const warnings = checkForAllergens(ingredients, userAllergies);

  // Create the scan result
  const scanResult: ScanResult = {
    id: Date.now().toString(),
    userId,
    timestamp: Date.now(),
    imageUrl,
    extractedText: cleanedText, // Use cleaned text
    ingredients,
    warnings,
  };

  // Add to history
  const history = getScanHistory();
  history.push(scanResult);
  saveScanHistory(history);

  return scanResult;
};

// Get scan history for a user
export const getUserScans = (userId: string): ScanResult[] => {
  const history = getScanHistory();
  return history.filter(scan => scan.userId === userId).sort((a, b) => b.timestamp - a.timestamp);
};

// Get a specific scan
export const getScan = (scanId: string): ScanResult | null => {
  const history = getScanHistory();
  return history.find(scan => scan.id === scanId) || null;
};

// Delete a scan by ID
export const deleteScan = (scanId: string): void => {
  const history = getScanHistory();
  const updatedHistory = history.filter(scan => scan.id !== scanId);
  saveScanHistory(updatedHistory);
};
