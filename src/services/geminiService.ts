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
    if (!getApiKey()) {
      throw new Error("GEMINI_API_KEY_MISSING");
    }

    console.log("Translation Service: Translating via Gemini 1.5 Flash...");
    
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
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
 * Prefer server-side OCR if available, otherwise falls back to client-side (if key is present)
 */
export async function extractPassportData(base64Image: string) {
  try {
    console.log("OCR Service: Attempting server-side extraction...");
    
    // 1. Prepare form data for server-side upload
    const blob = await (await fetch(base64Image)).blob();
    const formData = new FormData();
    formData.append("image", blob, "passport.jpg");

    // 2. Call server-side OCR
    const serverResponse = await fetch("/api/gemini/ocr", {
      method: "POST",
      body: formData,
    });

    if (serverResponse.ok) {
      const data = await serverResponse.json();
      console.log("OCR Service: Server side success", data);
      return data;
    }

    // 3. Fallback to client-side if server-side is not available or fails
    console.warn("OCR Service: Server-side failed or not found, trying client-side fallback...");
    if (!getApiKey()) {
      const serverErr = await serverResponse.json().catch(() => ({}));
      throw new Error(serverErr.error || "مفتاح Gemini API غير مكوّن في المتصفح. يرجى إضافته في إعدادات البيئة (Vercel).");
    }

    // Client-side implementation (existing logic)
    const mimeTypeMatch = base64Image.match(/^data:([^;]+);base64,/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
    const dataPart = base64Image.replace(/^data:[^;]+;base64,/, "");

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
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

    return JSON.parse(response.text);
  } catch (error: any) {
    console.error("OCR Error:", error);
    throw new Error(error.message || "فشل في قراءة بيانات الجواز");
  }
}
