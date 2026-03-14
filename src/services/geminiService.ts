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
    console.log("OCR Service: Sending request to Gemini (Pro)...");
    
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(",")[1] || base64Image,
            },
          },
          {
            text: `You are a highly accurate passport OCR expert. 
            Analyze the provided passport image and extract the following details:
            
            1. Passport Number: 
               - Look for 'Passport No.', 'رقم الجواز', or the number in the top-right corner.
               - Also check the second line of the MRZ (Machine Readable Zone) at the bottom; the first 9 characters are usually the passport number.
            
            2. Expiry Date: 
               - Look for 'Date of Expiry' or 'تاريخ الانتهاء'. 
               - Format the output strictly as YYYY-MM-DD.
            
            3. Full Name in Arabic: 
               - Look for the Arabic name field (الاسم الكامل). 
               - If not found, look for individual name fields in Arabic (اللقب, الاسم).
               - If NO Arabic text is found for the name, you MUST transliterate the English name from the passport into Arabic characters accurately.
            
            Return the result as a JSON object.`,
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
        systemInstruction: "You are a specialized OCR tool for passports. You prioritize accuracy for Arabic names and passport numbers. You are capable of reading both the visual zone and the Machine Readable Zone (MRZ). If Arabic name is missing, you transliterate from English.",
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
