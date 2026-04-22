// Vercel Serverless Function
let cachedApp: any = null;

export default async function handler(req: any, res: any) {
  const url = req.url || '';
  console.log(`Vercel Handler v3: Request received for ${url}`);

  // 1. Direct Ping Check (No dependencies)
  if (url.includes('/api/ping-simple')) {
    return res.status(200).json({ 
      status: "alive (direct)", 
      runtime: "vercel-lambda-v3",
      timestamp: new Date().toISOString()
    });
  }

  // 2. Direct Gemini Key Check (No dependencies)
  if (url.includes('/api/diag/gemini')) {
    const key = process.env.GEMINI_API_KEY || "";
    return res.status(200).json({ 
      status: key ? 'success' : 'error', 
      message: key ? 'مفتاح API مكوّن في البيئة.' : 'مفتاح Gemini API غير مكوّن في البيئة.',
      keyPrefix: key ? (key.substring(0, 4) + '...' + key.substring(key.length - 4)) : null,
      env: process.env.NODE_ENV,
      isVercel: true,
      source: 'api/index.ts-direct-v3'
    });
  }

  // 3. Main Server Delegation with dynamic imports
  try {
    if (!cachedApp) {
      console.log("Vercel Handler: Loading server module...");
      // Dynamic import without extension for better compatibility
      const serverModule = await import("../server");
      cachedApp = serverModule.app || serverModule.default;
      console.log("Vercel Handler: Server module loaded successfully.");
    }
    
    return cachedApp(req, res);
  } catch (err: any) {
    console.error("Vercel Function Fatal Error:", err);
    return res.status(500).json({
      error: "FUNCTION_INVOCATION_FAILED_CATCH",
      message: "فشل في تشغيل الخادم بالكامل. قد يكون هناك خطأ في الاعتمادات أو الملفات.",
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}
