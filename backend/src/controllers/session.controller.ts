import type { Response } from "express";
import { prisma } from "../lib/prisma.js";
import { launch_code_server, stop_code_server } from "../lib/code_server.js";
import type { AuthedRequest } from "../middlewares/auth.middleware.js";



const TARGET_PC_IP = process.env.TARGET_PC_IP!;

function attach_service_urls(session: any) {
  return {
    ...session,
    services: session.services.map((s: any) => ({
      ...s,
      url: `http://${TARGET_PC_IP}:${s.port}`,
    })),
  };
}

export const create_session = async (req: AuthedRequest, res: Response) => {
    const session = await prisma.session.create({
        data: { user_id: req.user!.id, status: "ACTIVE" },
    });
    res.status(201).json(session);
};

export const list_sessions = async (req: AuthedRequest, res: Response) => {
    const sessions = await prisma.session.findMany({
        where: { user_id: req.user!.id, status: "ACTIVE" },
        include: { services: true },
        orderBy: { started_at: "desc" },
    });
    res.json(attach_service_urls(sessions));
};

export const get_session = async (req: AuthedRequest, res: Response) => {
    
    const session = await prisma.session.findUnique({
        where: { session_id: String(req.params.id) },
        include: { services: true },
    });

    if (!session) return res.status(404).json({ message: "Session not found." });
    if (session.user_id !== req.user!.id) return res.status(403).json({ message: "Not your session." });

    res.json(attach_service_urls(session));
};

export const start_code_server_in_session = async (req: AuthedRequest, res: Response) => {
    const session_id= String(req.params.id);
    const session = await prisma.session.findUnique({ where: { session_id: session_id } });
    if (!session) return res.status(404).json({ message: "Session not found." });
    if (session.user_id !== req.user!.id) return res.status(403).json({ message: "Not your session." });
    if (session.status !== "ACTIVE") return res.status(409).json({ message: "Session is not active." });

    // Reuse an existing running instance instead of spawning a duplicate
    const existing = await prisma.session_service.findFirst({
        where: { session_id: session.session_id, service_type: "CODE_SERVER", status: "RUNNING" },
        orderBy: { started_at: "desc" },
    });
    if (existing) {
        return res.status(200).json({
        port: existing.port,
        password: existing.password,
        service_id: existing.service_id,
        url: `http://${process.env.TARGET_PC_IP}:${existing.port}`,
        });
    }

    try {
        const result = await launch_code_server(session.session_id);
        res.status(202).json(result);
    } catch (err) {
        console.error("[start_code_server_in_session] failed:", err);
        res.status(503).json({ message: "Failed to launch code-server." });
    }
};

export const terminate_session = async (req: AuthedRequest, res: Response) => {
    const session = await prisma.session.findUnique({
        where: { session_id: String(req.params.id) },
        include: { services: true },
    });
    if (!session) return res.status(404).json({ message: "Session not found." });
    if (session.user_id !== req.user!.id) return res.status(403).json({ message: "Not your session." });

    const runningServices = session.services.filter((s) => s.status === "RUNNING");

    const results = await Promise.allSettled(
        runningServices.map((s) => stop_code_server(s.service_id))
    );

    const failures = results.filter((r) => r.status === "rejected");
    if (failures.length > 0) {
        console.error(`[terminate_session] ${failures.length} service(s) failed to stop cleanly:`, failures);
    }

    await prisma.session.update({
        where: { session_id: session.session_id },
        data: { status: "TERMINATED", ended_at: new Date() },
    });

    res.json({
        message: failures.length > 0
        ? "Session terminated, but some services may not have stopped cleanly — check logs."
        : "Session terminated.",
    });
};