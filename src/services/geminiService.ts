import { GoogleGenAI, Type } from "@google/genai";

// Initialize the Gemini API client
// Note: process.env.GEMINI_API_KEY is usually provided by the platform
const getApiKey = () => {
  return process.env.GEMINI_API_KEY || "";
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

/**
 * Translates offer data using Gemini 3 Flash
 */
export async function translateOffer(offerData: any) {
  try {
    const key = getApiKey();
    if (!key) {
      throw new Error("GEMINI_API_KEY_MISSING");
    }

    console.log("Translation Service: Translating via Gemini 3 Flash...");
    
    // Create a new instance with the key to ensure it's picked up
    const genAI = new GoogleGenAI({ apiKey: key });
    
    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Translate the following Umrah offer details to Arabic. Ensure the terminology is accurate for the Saudi Umrah industry (e.g., use 'رباعي', 'ثلاثي', 'ثنائي', 'كبير', 'صغير').
      Return ONLY a JSON object with the translated fields.
      
      Offer Data: ${JSON.stringify(offerData)}`,
      config: {
        responseMimeType: "application/json",
      },
    });

    if (!response.text) {
      throw new Error("No response from translation model");
    }

    const textResponse = response.text.trim();
    // Strip markdown formatting if present
    const jsonString = textResponse.startsWith('```') 
      ? textResponse.replace(/^```json\n?/, '').replace(/\n?```$/, '')
      : textResponse;
      
    const data = JSON.parse(jsonString);
    console.log("Translation Service: Success", data);
    return data;
  } catch (error: any) {
    console.error("Translation Error:", error);
    if (error.message === "GEMINI_API_KEY_MISSING") {
      throw new Error("مفتاح برمجة Gemini غير مكوّن. يرجى إضافته في إعدادات النظام.");
    }
    throw new Error(error.message || "فشل في ترجمة العرض");
  }
}

/**
 * Extracts passport data from base64 image
 * Runs entirely on the client side to avoid Vercel serverless payload/timeout limits.
 */
export async function extractPassportData(base64Image: string) {
  try {
    const key = getApiKey();
    if (!key) {
      throw new Error("مفتاح Gemini API غير مكوّن في المتصفح. يرجى التأكد من إضافته في إعدادات البيئة (Vercel).");
    }

    console.log("OCR Service: Attempting client-side extraction using Gemini 3 Flash...");
    
    // 1. Prepare image for Gemini
    const mimeTypeMatch = base64Image.match(/^data:([^;]+);base64,/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
    const dataPart = base64Image.replace(/^data:[^;]+;base64,/, "");

    const genAI = new GoogleGenAI({ apiKey: key });
    
    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: dataPart,
            },
          },
          {
            text: `Extract passport information from this image. 
            - Identify the passport number.
            - Identify the expiry date (convert to YYYY-MM-DD format).
            - Identify the full name in Arabic. If only English is present, transliterate the name accurately to Arabic.
            - Identify the full name in English.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            passportNumber: { type: Type.STRING, description: "The alphanumeric passport number" },
            expiryDate: { type: Type.STRING, description: "Expiry date in YYYY-MM-DD format" },
            fullNameArabic: { type: Type.STRING, description: "Full name in Arabic" },
            fullNameEnglish: { type: Type.STRING, description: "Full name in English" },
          },
          required: ["passportNumber", "expiryDate", "fullNameArabic", "fullNameEnglish"],
        },
      },
    });

    if (!response.text) {
      throw new Error("لم يتمكن النظام من قراءة بيانات الجواز. يرجى التأكد من وضوح الصورة.");
    }

    const data = JSON.parse(response.text);
    console.log("OCR Service: Success", data);
    return data;
  } catch (error: any) {
    console.error("OCR Error:", error);
    
    // Better error message for developers/users
    let userMessage = error.message || "فشل في قراءة بيانات الجواز";
    if (error.message?.includes("API key not valid") || error.message?.includes("INVALID_ARGUMENT")) {
      userMessage = "مفتاح API غير صالح. يرجى التأكد من صحة المفتاح في إعدادات Vercel.";
    }
    
    throw new Error(userMessage);
  }
}
