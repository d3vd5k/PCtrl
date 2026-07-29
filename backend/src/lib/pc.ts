import { end_operation, get_current_operation,mark_power_cut, begin_operation } from "./pc_lock.js";
import { prisma } from "./prisma.js";
import { is_pc_online, wait_for_boot, wait_for_shutdown, graceful_shutdown } from "../../ssh/ssh.js";
import {get_plug_id, get_plug_status, plug_turn_off, plug_turn_on } from "./plug.action.js"
import { Operation } from "../generated/prisma/enums.js";
import { get_cooldown_remaining_ms } from "./pc_lock.js";
import { PcActionError } from "./errors.js";
import { terminate_all_active_sessions } from "./session.lifecycle.js";


const SHUTDOWN_TIMER= Number(process.env.SHUTDOWN_TIMER_MS)

// lib/pc.ts
export const shutdown_pc = async (on_initiated?: () => void) => {
    const op = await get_current_operation();
    if (op !== "NO_OPERATION") {
        throw new PcActionError(`Cannot power on — ${op.replace(/_/g, " ")} already in progress.`);
    }
    const plug = await get_plug_id();
    if (!plug) throw new PcActionError("Plug not configured.", 404);

    const plug_status = await get_plug_status(plug.plug_id);
    if (!plug_status.reachable) throw new PcActionError("Plug unreachable", 404);
    if (plug_status.device_on === false) throw new PcActionError("Power already cut", 409);

    const is_safe = await begin_operation(Operation.SHUTDOWN);
    if (!is_safe) throw new PcActionError("Another operation may be in progress, wait for cooldown.", 409);

    try {
        const { terminatedSessions, serviceStopFailures } = await terminate_all_active_sessions();
        console.log(`[pc] Terminated ${terminatedSessions} active session(s), ${serviceStopFailures} service(s) required forced cleanup.`);

        try {
        await graceful_shutdown();
        } catch (err) {
        console.error("[pc] SSH shutdown command failed:", err);
        throw new PcActionError("Could not reach target PC over SSH", 500);
        }

        await prisma.power_event.create({
        data: { event_type: "SHUTDOWN_NORMAL", plug_id: plug.plug_id },
        });

        on_initiated?.();

        const confirmed = await wait_for_shutdown();
        if (!confirmed) {
        console.error("[pc] Target did not go offline within timeout — NOT cutting power.");
        await prisma.power_event.create({
            data: {
            event_type: "SHUTDOWN_NORMAL",
            plug_id: plug.plug_id,
            description: "Timed out waiting for shutdown confirmation — power NOT cut, needs manual check",
            },
        });
        return;
        }

        await new Promise((r) => setTimeout(r, SHUTDOWN_TIMER));
        await mark_power_cut();
        await plug_turn_off(plug.plug_id);
        await prisma.power_event.create({
        data: { event_type: "MAINS_CUT", plug_id: plug.plug_id, description: "Power cut after confirmed graceful shutdown" },
        });
    } catch (err) {
        console.error("[pc] Post-initiation failure:", err);
        await prisma.power_event.create({
        data: {
            event_type: "SHUTDOWN_NORMAL",
            plug_id: plug.plug_id,
            description: `Post-shutdown-confirmation step failed: ${err instanceof PcActionError ? err.message : String(err)}`,
        },
        }).catch((err) => console.error("[pc] Failed to log power event error:", err));
    } finally {
        await end_operation();
    }
};




export const boot_pc = async (on_initiated?: () => void) => {
    const op = await get_current_operation();
    if (op !== "NO_OPERATION") {
        throw new PcActionError(`Cannot power on — ${op.replace(/_/g, " ")} already in progress.`);
    }

    const cooldown = await get_cooldown_remaining_ms();
    if (cooldown > 0) {
        throw new PcActionError(`Power was recently cut — try again in ${Math.ceil(cooldown / 1000)}s.`);
    }

    const plug = await get_plug_id();
    if (!plug) throw new PcActionError("Plug not configured.", 404);

    const is_safe = await begin_operation(Operation.BOOT);
    if (!is_safe) throw new PcActionError("Another operation may be in progress, wait for cooldown.");

    try {
        try {
        await plug_turn_on(plug.plug_id);
        } catch (err) {
        console.error("[pc] Plug unreachable during boot:", err);
        throw new PcActionError("Unable to reach plug. Check physical connection.", 503);
        }

        const pc_online = await is_pc_online(1500);
        if (pc_online) {
        throw new PcActionError("PC already online.");
        }

        await prisma.power_event.create({
        data: { event_type: "BOOT_STARTED", plug_id: plug.plug_id },
        });

        on_initiated?.();

        const booted = await wait_for_boot();
        await prisma.power_event.create({
        data: {
            event_type: booted ? "BOOT_COMPLETE" : "MAINS_CONNECTED",
            plug_id: plug.plug_id,
            description: booted ? null : "Timed out waiting for boot confirmation",
        },
        });
    } finally {
    
        await end_operation();
    }
};


export const forced_shutdown = async () => {
    const op = await get_current_operation();
    if (op !== "NO_OPERATION") {
        throw new PcActionError(`Cannot power off — ${op.replace(/_/g, " ")} already in progress.`);
    }

    const plug = await get_plug_id();
    if (!plug) throw new PcActionError("Plug not configured.", 404);

    const plug_status = await get_plug_status(plug.plug_id);
    if (!plug_status.reachable) throw new PcActionError("Plug unreachable.", 503);
    if (plug_status.device_on === false) throw new PcActionError("Power already cut.");

    const is_safe = await begin_operation(Operation.PLUG_CUT);
    if (!is_safe) throw new PcActionError("Another operation may be in progress, wait for cooldown.");

    try {
        const { terminatedSessions } = await terminate_all_active_sessions();
        console.log(`[pc] Forced shutdown terminated ${terminatedSessions} active session(s).`);

        await plug_turn_off(plug.plug_id);
        await mark_power_cut();
        await prisma.power_event.create({
        data: { event_type: "SHUTDOWN_FORCED", plug_id: plug.plug_id },
        });
    } finally {
        await end_operation();
    }
};
