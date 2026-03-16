import { app, serverPromise } from "../server";

export default async (req: any, res: any) => {
  try {
    await serverPromise;
    return app(req, res);
  } catch (error: any) {
    console.error("Vercel entry point error:", error);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
