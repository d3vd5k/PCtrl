import type { Request, Response, NextFunction } from "express";
import { verify_token } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";

export interface AuthedRequest extends Request {
    user?: { id: string; role: string; access: string };
}



export async function require_auth(req: AuthedRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

    if (!token) {
        return res.status(401).json({ error: "Missing authorization token." });
    }

    try {
        const payload = verify_token(token);
        const user= await prisma.user.findUnique({where: {user_id: payload.user_id}})
        if (user?.access !== "GRANTED") {
            return res.status(403).json({ error: "Access no longer granted." });
        }
        req.user = { id: payload.user_id, role: user.role, access: user.access };
        next();
    } catch {
        return res.status(401).json({ error: "Invalid or expired token." });
    }
}