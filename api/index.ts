export default async (req: any, res: any) => {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] Vercel request: ${req.method} ${req.url}`);
  
  try {
    console.log(`[${requestId}] Importing server...`);
    const { app, serverPromise } = await import("../server");
    
    console.log(`[${requestId}] Awaiting serverPromise...`);
    // Add a timeout to serverPromise to avoid hanging indefinitely
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Server initialization timeout")), 10000)
    );
    
    await Promise.race([serverPromise, timeoutPromise]);
    console.log(`[${requestId}] serverPromise resolved.`);
    
    return app(req, res);
  } catch (error: any) {
    console.error(`[${requestId}] Vercel entry point error:`, error);
    res.status(500).json({ 
      error: "Internal Server Error during initialization", 
      message: error.message,
      requestId,
      stack: error.stack
    });
  }
};
