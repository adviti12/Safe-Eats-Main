
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
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that cleans and formats text extracted from product labels for ingredient analysis. Remove noise, correct OCR errors, and format the text clearly. Focus on the ingredients section if present. Return only the cleaned text without additional commentary.',
        },
        {
          role: 'user',
          content: `Clean and format this text from a product label: ${rawText}`,
        },
      ],
      model: 'llama3-8b-8192',
    });

    return completion.choices[0]?.message?.content?.trim() || rawText;
  } catch (error) {
    console.error('Error cleaning text with Groq:', error);
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

// Parse ingredients from text with improved accuracy
export const parseIngredients = (text: string): string[] => {
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
  let ingredients: string[] = [];
  
  // First try comma as separator
  if (ingredientsSection.includes(',')) {
    ingredients = splitIngredientsWithParentheses(ingredientsSection);
  } else if (ingredientsSection.includes('.')) {
    // If no commas, try periods
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
  
  // Clean up each ingredient
  return ingredients
    .map(item => item.trim().replace(/^\W+|\W+$/g, '')) // Remove non-word chars from start/end
    .filter(item => item.length > 0);
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
export const processTextForAllergens = (text: string, userAllergies: string[]): { 
  ingredients: string[], 
  warnings: string[] 
} => {
  const ingredients = parseIngredients(text);
  const warnings = checkForAllergens(ingredients, userAllergies);
  
  return { ingredients, warnings };
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
