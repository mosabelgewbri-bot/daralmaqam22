import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const extractPassportData = async (base64Image: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image.split(',')[1],
        },
      },
      {
        text: "Extract passport details: name, passport number, nationality, date of birth, expiry date.",
      },
    ],
  });
  return response.text;
};

export const translateOffer = async (offer: any, targetLanguage: string = 'English') => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Translate the following Umrah offer to ${targetLanguage}: ${JSON.stringify(offer)}. Return a JSON object with the same structure.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          category: { type: Type.STRING },
          rows: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                makkah: { type: Type.STRING },
                madinah: { type: Type.STRING },
                offer: { type: Type.STRING },
                meals: { type: Type.STRING },
                double: { type: Type.STRING },
                triple: { type: Type.STRING },
                quad: { type: Type.STRING },
                quint: { type: Type.STRING },
                currency: { type: Type.STRING },
              },
            },
          },
          fixedText: { type: Type.STRING },
        },
      },
    },
  });
  return JSON.parse(response.text);
};

export const analyzePassport = async (base64Image: string) => {
  return extractPassportData(base64Image);
};
