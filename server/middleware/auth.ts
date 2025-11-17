import { Request, Response, NextFunction } from "express";
import { type User } from "@shared/schema";
import "express-session";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    next();
  };
}

export function attachUser(storage: any) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.session && req.session.userId) {
      try {
        const user = await storage.getUser(req.session.userId);
        if (user) {
          req.user = user;
        } else {
          // User soft-deleted or not found - destroy stale session
          req.session.destroy((err) => {
            if (err) console.error("Error destroying stale session:", err);
          });
        }
      } catch (error) {
        console.error("Error attaching user:", error);
      }
    }
    next();
  };
}
