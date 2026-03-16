import { app, serverPromise } from "../server";

export default async (req: any, res: any) => {
  console.log(`Vercel request received: ${req.method} ${req.url}`);
  try {
    console.log("Awaiting serverPromise...");
    await serverPromise;
    console.log("serverPromise resolved. Handling request...");
    return app(req, res);
  } catch (error: any) {
    console.error("Vercel entry point error:", error);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: error.message,
      details: "حدث خطأ في تهيئة الخادم. يرجى التحقق من السجلات.",
      stack: error.stack,
      env: process.env.NODE_ENV
    });
  }
};
