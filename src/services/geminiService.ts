/**
 * Translates offer data using Gemini 3.5 Flash on the server-side
 */
export async function translateOffer(offerData: any) {
  try {
    console.log("Client Translation Service: Fetching server-side translation...");
    const response = await fetch("/api/gemini/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ offerData }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ error: "فشل الاتصال بالخادم" }));
      throw new Error(errData.error || "فشل في ترجمة العرض");
    }

    return await response.json();
  } catch (error: any) {
    console.error("Client translation error:", error);
    throw error;
  }
}

/**
 * Extracts passport data from base64 image on the server-side
 */
export async function extractPassportData(base64Image: string) {
  try {
    console.log("Client OCR Service: Fetching server-side passport extraction...");
    const response = await fetch("/api/gemini/scan-passport", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ base64Image }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ error: "فشل الاتصال بالخادم" }));
      const errorMsg = errData.details
        ? `${errData.error} (${errData.details})`
        : (errData.error || "فشل في قراءة بيانات الجواز");
      throw new Error(errorMsg);
    }

    return await response.json();
  } catch (error: any) {
    console.error("Client passport OCR error:", error);
    throw error;
  }
}
