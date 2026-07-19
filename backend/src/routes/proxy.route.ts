import { Router } from "express";
import { require_auth, type AuthedRequest } from "../middlewares/auth.middleware.js";
import { prisma } from "../lib/prisma.js";
import { code_server_proxy } from "../lib/code-server-proxy.js";
import type { Response, NextFunction } from "express";

const router = Router();

// Confirm the requesting user actually owns this session before proxying anything through
async function verifySessionOwnership(req: AuthedRequest, res: Response, next: NextFunction) {
  const session = await prisma.session.findUnique({ where: { session_id: req.params.session_id } });
  if (!session) return res.status(404).json({ message: "Session not found." });
  if (session.user_id !== req.user!.id) return res.status(403).json({ message: "Not your session." });
  next();
}

router.use("/session/:session_id", require_auth, verifySessionOwnership, code_server_proxy);

export default router;