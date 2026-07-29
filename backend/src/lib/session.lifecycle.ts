import { prisma } from "./prisma.js";
import { stop_code_server } from "./code_server.js";

export async function terminate_all_active_sessions() {
    const sessions = await prisma.session.findMany({
        where: { status: "ACTIVE" },
        include: { services: true },
    });

    const runningServices = sessions.flatMap((session) =>
        session.services.filter((service) => service.status === "RUNNING")
    );

    const results = await Promise.allSettled(
        runningServices.map((service) => stop_code_server(service.service_id))
    );
    const failures = results.filter((result) => result.status === "rejected");

    if (failures.length > 0) {
        console.error(`[session] ${failures.length} service(s) failed to stop cleanly:`, failures);
    }

    const sessionIds = sessions.map((session) => session.session_id);
    if (sessionIds.length === 0) {
        return { terminatedSessions: 0, serviceStopFailures: 0 };
    }

    const endedAt = new Date();
    await prisma.$transaction([
        prisma.session_service.updateMany({
            where: {
                session_id: { in: sessionIds },
                status: { in: ["STARTING", "RUNNING"] },
            },
            data: { status: "STOPPED", stopped_at: endedAt },
        }),
        prisma.session.updateMany({
            where: { session_id: { in: sessionIds }, status: "ACTIVE" },
            data: { status: "TERMINATED", ended_at: endedAt },
        }),
    ]);

    return { terminatedSessions: sessionIds.length, serviceStopFailures: failures.length };
}
