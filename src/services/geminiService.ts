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
    console.log("OCR Service: Sending request to Gemini (1.5 Flash)...");
    
    // Detect mime type from base64
    const mimeMatch = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const base64Data = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
            text: `Extract passport information from this image. 
            You must find:
            1. Passport Number (رقم الجواز)
            2. Expiry Date (تاريخ الانتهاء) in YYYY-MM-DD format
            3. Full Name in Arabic (الاسم الكامل بالعربي). If not written in Arabic, transliterate the English name to Arabic.
            
            Return the data in the specified JSON format.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            passportNumber: { type: Type.STRING },
            expiryDate: { type: Type.STRING },
            fullNameArabic: { type: Type.STRING },
          },
          required: ["passportNumber", "expiryDate", "fullNameArabic"],
        },
        systemInstruction: "You are a specialized passport OCR tool. You prioritize accuracy for Arabic names and passport numbers. You always return valid JSON.",
      },
    });

    console.log("OCR Service: Response received");
    const text = response.text;
    
    if (!text) {
      throw new Error("لم يتم إرجاع أي نص من محرك الذكاء الاصطناعي");
    }
    
    try {
      const data = JSON.parse(text);
      console.log("OCR Service: Parsed data:", data);
      return data;
    } catch (parseError) {
      console.error("OCR Service: JSON Parse Error:", text);
      throw new Error("فشل في تحليل بيانات الاستجابة");
    }
  } catch (e: any) {
    console.error("OCR Service Error:", e);
    throw e;
  }
}
