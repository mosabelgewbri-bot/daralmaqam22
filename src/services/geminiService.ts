/**
 * Helper to get the Gemini API key from cached settings in localStorage
 */
function getGeminiApiKey(): string {
  try {
    const cached = localStorage.getItem('cached_settings');
    if (cached) {
      const parsed = JSON.parse(cached);
      return parsed.gemini_api_key || "";
    }
  } catch (e) {
    console.warn("Error reading cached settings:", e);
  }
  return "";
}

/**
 * Translates offer data using Gemini 3.5 Flash on the server-side
 */
export async function translateOffer(offerData: any) {
  try {
    console.log("Client Translation Service: Fetching server-side translation...");
    const key = getGeminiApiKey();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (key) {
      headers["X-Gemini-API-Key"] = key;
    }

    const response = await fetch("/api/gemini/translate", {
      method: "POST",
      headers,
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
    const key = getGeminiApiKey();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (key) {
      headers["X-Gemini-API-Key"] = key;
    }

    const response = await fetch("/api/gemini/scan-passport", {
      method: "POST",
      headers,
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
