export {};

import type { AdminAuthContext, AuthContext } from "./auth";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
      adminAuth?: AdminAuthContext;
      requestId?: string;
    }
  }
}
