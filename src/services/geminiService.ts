import { GoogleGenAI, Type } from "@google/genai";

export async function extractPassportData(base64Image: string) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'undefined' || apiKey === '') {
      console.error("GEMINI_API_KEY is not defined. Please set it in your environment variables.");
      return null;
    }
    
    const ai = new GoogleGenAI({ apiKey });
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
            text: `You are an expert passport OCR system. 
            Extract the following information from the passport image:
            1. Passport Number: Look for the 'Passport No' or 'رقم الجواز' field, or the number in the top right corner, or the first 9 characters of the second line of the MRZ (Machine Readable Zone).
            2. Expiry Date: Look for 'Date of Expiry' or 'تاريخ الانتهاء'. Format as YYYY-MM-DD.
            3. Full Name in Arabic: Look for the Arabic name field (usually 'الاسم الكامل' or similar). If the Arabic name is not explicitly written in the visual zone, look for it elsewhere on the page. If it's absolutely not there, transliterate the English name (from the visual zone or MRZ) into Arabic accurately.
            
            Return the data in a strict JSON format.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            passportNumber: { type: Type.STRING, description: "The passport number" },
            expiryDate: { type: Type.STRING, description: "The expiry date in YYYY-MM-DD format" },
            fullNameArabic: { type: Type.STRING, description: "The full name in Arabic" },
          },
          required: ["passportNumber", "expiryDate", "fullNameArabic"],
        },
        systemInstruction: "You are a specialized OCR tool for passports. You prioritize accuracy, especially for Arabic names and passport numbers. You understand both the visual zone and the Machine Readable Zone (MRZ) of a passport.",
      },
    });

    const text = response.text;
    if (!text) return null;
    
    return JSON.parse(text);
  } catch (e) {
    console.error("OCR Service Error:", e);
    return null;
  }
}
