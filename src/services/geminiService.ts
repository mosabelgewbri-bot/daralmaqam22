import { GoogleGenAI, Type } from "@google/genai";

export async function extractPassportData(base64Image: string) {
  try {
    console.log("OCR Service: Initializing Gemini on frontend...");
    
    const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === 'undefined') {
      console.error("OCR Service: GEMINI_API_KEY is missing!");
      throw new Error("GEMINI_API_KEY is not configured. Please add it to Vercel environment variables.");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Extract mime type and base64 data
    const mimeMatch = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const base64Data = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;

    console.log("OCR Service: Sending request to Gemini (flash-latest)...");
    
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
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

    const text = response.text;
    console.log("OCR Service: Raw response text:", text);
    
    if (!text) {
      throw new Error("No text returned from Gemini");
    }

    try {
      const data = JSON.parse(text);
      console.log("OCR Service: Success", data);
      return data;
    } catch (parseError) {
      console.error("OCR Service: Failed to parse JSON:", text);
      throw new Error("فشل في تحليل بيانات الجواز المستخرجة. يرجى التأكد من وضوح الصورة.");
    }
  } catch (e: any) {
    console.error("OCR Service Error:", e);
    
    let errorMessage = e.message || "فشل في معالجة صورة الجواز";
    if (e.message && (e.message.includes("API key not valid") || e.message.includes("API_KEY_INVALID"))) {
      errorMessage = "مفتاح API غير صالح. يرجى التأكد من إعداد GEMINI_API_KEY بشكل صحيح.";
    } else if (e.message && e.message.includes("Quota exceeded")) {
      errorMessage = "تم تجاوز حصة الاستخدام لمفتاح API. يرجى المحاولة لاحقاً.";
    }
    
    throw new Error(errorMessage);
  }
}
