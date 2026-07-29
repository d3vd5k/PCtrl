import type { Request, Response } from "express";
import axios from "axios";
import { prisma } from "../lib/prisma.js";
import { send_message, send_failure_alert } from "../lib/telegram.js";
import { shutdown_pc, } from "../lib/pc.js";
import { is_pc_online } from "../../ssh/ssh.js";
import { Agent } from "node:http";

type ESP_STATUS = "POWERCUT" | "BROWNOUT" | "NORMAL";
const getEsp32Url = () => process.env.ESP32_API_URL || "http://energymonitor.local:80";
let STATUS: ESP_STATUS = "NORMAL";
const ESP32_SECRET_KEY = process.env.ESP32_SECRET_KEY;

const ipv4Agent = new Agent({ family: 4 });

export const mains_info = async (req: Request, res: Response) => {
    try {
        const baseUrl = getEsp32Url();
        const response = await axios.get(`${baseUrl}/telemetry`, { httpAgent: ipv4Agent, timeout: 5000 });
        res.json(response.data);
    }
    catch (error: any) {
        const message = error?.code === "EAI_AGAIN" || error?.code === "ENOTFOUND" || error?.code === "ECONNABORTED" || error?.code === "ECONNREFUSED"
            ? `ESP32 device at ${getEsp32Url()} is offline or unreachable (${error?.code}).`
            : error?.message || "Failed to fetch telemetry data.";

        console.error("[esp32] Error fetching telemetry:", message);
        res.status(503).json({ error: "ESP32 energy monitor is offline or unreachable.", details: message });
    }
}

export const alert = async (req: Request, res: Response) => {
    const secret_key = req.headers['x-esp32-secret'];

    if (secret_key !== ESP32_SECRET_KEY) {
        console.warn("[esp32] Unauthorized access attempt with secret key:", secret_key);
        return res.status(401).json({ error: "Unauthorized" });
    }

    const { event, voltage } = req.body;
    if (!event || voltage == undefined) {
        return res.status(400).json({ error: "Event and voltage are required." });
    }
    try {
        await prisma.grid_status.upsert({
            where: { status_id: 1 },
            update: { status: event as ESP_STATUS, updated_at: new Date() },
            create: { status_id: 1, status: event as ESP_STATUS, updated_at: new Date() }
        });
    }
    catch (error) {
        console.error("[esp32] Error updating grid status:", error);
        return res.status(500).json({ error: "Failed to update grid status." });
    }
    console.log(`[esp32] Received status alert: event=${event}, voltage=${voltage}`);
    const pc_state = await is_pc_online();
    if (!pc_state) return res.status(200).json({ message: "PC already offline, no actions taken." });;
    send_message(event, voltage);
    if (event == "BROWNOUT") {
        await shutdown_pc(() => { return res.status(200).json({ message: "Alert received successfully." }); })
            .catch((err) => {
                console.error("[esp32] Automatic brownout shutdown failed:", err);
                send_failure_alert("BROWNOUT_SHUTDOWN_FAILED" as any, voltage);
            });
    }
    res.status(200).json({ message: "Telegram alerted" });

}


export const get_status = async (req: Request, res: Response) => {
    const status = await prisma.grid_status.findFirst();
    if (!status) {
        return res.status(404).json({ error: "Grid status not found." });
    }
    res.json({ status: status?.status });
}