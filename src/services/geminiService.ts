import { GoogleGenAI, Type } from "@google/genai";

export async function extractPassportData(base64Image: string) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("OCR Service: Using API Key (first 5 chars):", apiKey ? apiKey.substring(0, 5) + "..." : "MISSING");
    
    if (!apiKey || apiKey === 'undefined' || apiKey === '') {
      console.error("GEMINI_API_KEY is not defined. Please set it in your environment variables.");
      return null;
    }
    
    const ai = new GoogleGenAI({ apiKey });
    console.log("OCR Service: Sending request to Gemini (Flash)...");
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(",")[1] || base64Image,
            },
          },
          {
            text: `Extract passport information from this image. 
            Return ONLY a JSON object with these exact keys:
            - passportNumber: (the passport number)
            - expiryDate: (the expiry date in YYYY-MM-DD format)
            - fullNameArabic: (the full name in Arabic characters. If not present in Arabic on the passport, transliterate the English name to Arabic accurately).
            
            Do not include any other text or markdown formatting.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are a specialized passport OCR tool. You extract data with 100% accuracy. You prioritize Arabic names and passport numbers. If the Arabic name is missing, you MUST transliterate the English name to Arabic.",
      },
    });

    console.log("OCR Service: Response received from Gemini");
    const text = response.text;
    console.log("OCR Service: Extracted text:", text);
    
    if (!text) {
      console.warn("OCR Service: No text returned from Gemini");
      return null;
    }
    
    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.error("OCR Service: Failed to parse JSON:", parseError);
      return null;
    }
  } catch (e) {
    console.error("OCR Service Error:", e);
    return null;
  }
}
