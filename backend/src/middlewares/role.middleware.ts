import type { Response, NextFunction } from "express";
import type { AuthedRequest } from "./auth.middleware.js";
import { prisma } from "../lib/prisma.js";
const ROLE_RANK = { "USER": 0, "ADMIN": 1, "ROOT": 2 } as const;
type Role_name = keyof typeof ROLE_RANK;

export const require_role= function (minRole: Role_name) {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({ message: "Unauthorized: User information is missing." });
    }
    const user_from_DB= await prisma.user.findUnique({ where: { user_id: user.id } });
    const user_role= user_from_DB?.role as Role_name;
    if (!user_role || ROLE_RANK[user_role] < ROLE_RANK[minRole]) {
      return res.status(403).json({ message: "Insufficient permissions for this action." });
    }
    next();
  };
}