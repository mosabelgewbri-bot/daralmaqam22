// Gemini Service - Handles OCR and Translation via server-side API

export async function translateOffer(offerData: any) {
  try {
    console.log("Translation Service: Calling server-side translation...");
    
    const response = await fetch("/api/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ offerData }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Translation Service: Success", data);
    return data;
  } catch (error) {
    console.error("Translation Error:", error);
    throw error;
  }
}

export async function extractPassportData(base64Image: string) {
  try {
    console.log("OCR Service: Calling server-side OCR...");
    
    const response = await fetch("/api/ocr", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ base64Image }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const data = await response.json();
    console.log("OCR Service: Success", data);
    return data;
  } catch (e: any) {
    console.error("OCR Service Error:", e);
    
    let errorMessage = e.message || "فشل في معالجة صورة الجواز";
    if (e.message && (e.message.includes("API key not valid") || e.message.includes("API_KEY_INVALID"))) {
      errorMessage = "مفتاح API غير صالح على الخادم. يرجى التأكد من إعداد GEMINI_API_KEY بشكل صحيح في إعدادات Vercel.";
    } else if (e.message && e.message.includes("Quota exceeded")) {
      errorMessage = "تم تجاوز حصة الاستخدام لمفتاح API. يرجى المحاولة لاحقاً.";
    }
    
    throw new Error(errorMessage);
  }
}
