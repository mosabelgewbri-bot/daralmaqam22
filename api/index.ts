import { app, serverPromise } from "../server";

export default async (req: any, res: any) => {
  await serverPromise;
  return app(req, res);
};
