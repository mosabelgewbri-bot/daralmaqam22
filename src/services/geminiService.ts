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

    console.log("Translation Service: Translating via Gemini 3 Flash...");
    
    const response = await ai.models.generateContent({
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

    const data = JSON.parse(response.text.trim());
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
 * Extracts passport data from base64 image using Gemini 3 Flash OCR
 */
export async function extractPassportData(base64Image: string) {
  try {
    if (!getApiKey()) {
      throw new Error("GEMINI_API_KEY_MISSING");
    }

    console.log("OCR Service: Extracting data via Gemini 3 Flash...");
    
    // The image data comes as "data:image/jpeg;base64,..."
    // We need to extract the base64 part and the mime type
    const mimeTypeMatch = base64Image.match(/^data:([^;]+);base64,/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
    const dataPart = base64Image.replace(/^data:[^;]+;base64,/, "");

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
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
      ],
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
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ] as any,
      },
    });

    if (!response.text) {
      throw new Error("لم يتمكن النظام من قراءة بيانات الجواز. يرجى التأكد من وضوح الصورة.");
    }

    const data = JSON.parse(response.text.trim());
    console.log("OCR Service: Success", data);
    return data;
  } catch (e: any) {
    console.error("OCR Service Error:", e);
    
    if (e.message === "GEMINI_API_KEY_MISSING") {
      throw new Error("مفتاح برمجة Gemini غير مكوّن. يرجى إضافته في إعدادات النظام.");
    }

    let errorMessage = "فشل في معالجة صورة الجواز. يرجى التأكد من وضوح الصورة والمحاولة مرة أخرى.";
    
    const errText = e.toString();
    if (errText.includes("API key")) {
      errorMessage = "خطأ في مفتاح البرمجة (API Key). يرجى التحقق من إعدادات النظام.";
    } else if (errText.includes("Quota")) {
      errorMessage = "تم تجاوز حد الاستخدام المسموح به. يرجى المحاولة لاحقاً.";
    }
    
    throw new Error(errorMessage);
  }
}
