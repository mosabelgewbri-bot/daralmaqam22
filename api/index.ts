import { app, serverPromise } from "../server.ts";

export default async (req: any, res: any) => {
  // Wait for the server to initialize (database, etc.)
  try {
    await serverPromise;
  } catch (error) {
    console.error("Server initialization failed:", error);
    return res.status(500).json({ 
      error: "Server initialization failed", 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
  
  // Delegate the request to the Express app
  return app(req, res);
};
