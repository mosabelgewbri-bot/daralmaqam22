export async function extractPassportData(base64Image: string) {
  try {
    console.log("OCR Service: Calling server-side OCR...");
    
    const response = await fetch("/api/ocr/passport", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image: base64Image }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "فشل في معالجة صورة الجواز");
    }

    const data = await response.json();
    console.log("OCR Service: Success", data);
    return data;
  } catch (e: any) {
    console.error("OCR Service Error:", e);
    throw e;
  }
}
