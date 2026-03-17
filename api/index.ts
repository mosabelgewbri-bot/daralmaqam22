import path from "path";
import fs from "fs";

export default async (req: any, res: any) => {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] Vercel request: ${req.method} ${req.url}`);
  
  try {
    console.log(`[${requestId}] Importing server...`);
    const serverPath = path.resolve(process.cwd(), "server.js");
    const serverTsPath = path.resolve(process.cwd(), "server.ts");
    console.log(`[${requestId}] Checking paths: JS=${fs.existsSync(serverPath)}, TS=${fs.existsSync(serverTsPath)}`);
    
    let server;
    try {
      server = await import("../server.js");
    } catch (e) {
      console.log(`[${requestId}] Failed to import ../server.js, trying ../server.ts...`);
      server = await import("../server.ts");
    }
    
    const { app, serverPromise } = server;
    
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
