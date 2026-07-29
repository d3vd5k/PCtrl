import type { Response } from "express";
import { prisma } from "../lib/prisma.js";
import { launch_code_server, stop_code_server } from "../lib/code_server.js";
import { get_current_operation } from "../lib/pc_lock.js";
import { execute_session_command } from "../lib/session_terminal.js";
import type { AuthedRequest } from "../middlewares/auth.middleware.js";
import { is_pc_online } from "../../ssh/ssh.js";



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
    try{
        const is_online= await is_pc_online();
        if(!is_online){
             res.status(409).json({message:"PC is offline"});
        }
        const session = await prisma.session.create({
            data: { user_id: req.user!.id, status: "ACTIVE" },
        });
    res.status(201).json(session);
    }
    catch(err){
        throw err;
    }
};

// export const list_sessions = async (req: AuthedRequest, res: Response) => {
//     const sessions = await prisma.session.findMany({
//         where: { user_id: req.user!.id, status: "ACTIVE" },
//         include: { services: true },
//         orderBy: { started_at: "desc" },
//          res.json(sessions);
//     });
// };
export const list_sessions = async (req: AuthedRequest, res: Response) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { user_id: req.user!.id, status: "ACTIVE" },
      include: { services: true },
      orderBy: { started_at: "desc" },
    });
        // Attach service URLs so the frontend gets ready-to-use links.
        const enriched = (sessions ?? []).map((s) => attach_service_urls(s));
        console.log(`[session] Returning ${enriched.length} session(s) for user ${req.user!.id}`);
        res.json(enriched);
  } catch (err) {
    console.error("[session] Failed to list sessions:", err);
    res.status(500).json({ message: "Failed to load sessions.", error: err instanceof Error ? err.message : String(err) });
  }
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

    const operation = await get_current_operation();
    if (operation !== "NO_OPERATION") {
        return res.status(409).json({ message: "Cannot start a service while PC power operation is in progress." });
    }

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
        console.error("[session] Failed to launch code-server in session:", err);
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
        console.error(`[session] ${failures.length} service(s) failed to stop cleanly:`, failures);
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

export const run_session_terminal_command = async (req: AuthedRequest, res: Response) => {
    const session = await prisma.session.findUnique({
        where: { session_id: String(req.params.id) },
    });

    if (!session) return res.status(404).json({ message: "Session not found." });
    if (session.user_id !== req.user!.id) return res.status(403).json({ message: "Not your session." });
    if (session.status !== "ACTIVE") return res.status(409).json({ message: "Session is not active." });

    try {
        res.json(await execute_session_command(req.body.command));
    } catch (err) {
        console.error("[session] Failed to execute terminal command:", err);
        res.status(503).json({ message: "Terminal is unavailable. Check that the target PC is online." });
    }
};
