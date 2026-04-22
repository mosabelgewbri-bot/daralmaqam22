export default async function handler(req: any, res: any) {
  const key = process.env.GEMINI_API_KEY || "";
  res.status(200).json({ 
    status: key ? 'success' : 'error', 
    message: key ? 'مفتاح API مكوّن.' : 'مفتاح API غير مكوّن.',
    prefix: key ? key.substring(0, 4) + '...' : null,
    env: process.env.NODE_ENV,
    isVercel: !!process.env.VERCEL
  });
}
