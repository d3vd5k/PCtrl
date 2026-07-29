import { start_sunshine, stop_sunshine, get_sunshine_status } from "../lib/sunshine.js";
import type { Request, Response } from "express";
import https from "https";
import axios from "axios";

const get_sunshine_client = () => {
    return axios.create({
        baseURL: `https://${process.env.TARGET_PC_IP}:47990`,
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        auth: {
            username: process.env.SUNSHINE_WEB_USER!,
            password: process.env.SUNSHINE_WEB_PASS!,
        },
        headers: {
            "Content-Type": "application/json",
        },
    });
};

const extract_error_message = (error: any): string => {
    if (error.response?.data) {
        const data = error.response.data;
        if (typeof data === "string") return data;
        if (typeof data === "object" && data !== null) {
            return data.message || data.error || data.details || JSON.stringify(data);
        }
    }
    return error.message || "Sunshine API request failed.";
};

const fetch_sunshine_api = async (endpoint: string, method: "GET" | "POST" = "GET", data?: any) => {
    const client = get_sunshine_client();
    const response = await client({
        url: endpoint,
        method,
        data,
    });
    return response.data;
};

export const start_sunshine_route = async (_req: Request, res: Response) => {
    try {
        const result = await start_sunshine();
        res.status(202).json(result);
    } catch (err) {
        console.error("[sunshine] Start failed:", err);
        res.status(409).json({ message: err instanceof Error ? err.message : "Failed to start Sunshine." });
    }
};

export const stop_sunshine_route = async (_req: Request, res: Response) => {
    try {
        await stop_sunshine();
        res.json({ message: "Sunshine stopped." });
    } catch (err) {
        console.error("[sunshine] Stop failed:", err);
        res.status(500).json({ message: err instanceof Error ? err.message : "Failed to stop Sunshine." });
    }
};

export const get_sunshine_status_route = async (_req: Request, res: Response) => {
    res.json(await get_sunshine_status());
};

export const pair_route = async (req: Request, res: Response) => {
    try {
        const { running } = await get_sunshine_status();
        if (!running) { return res.status(400).json({ error: "Sunshine is not running." }); }
        const { pin, name } = req.body;
        if (!pin || !name) return res.status(400).json({ error: "PIN and device name are required." });

        const data = await fetch_sunshine_api("/api/pin", "POST", { pin: pin.toString(), name: name.toString() });
        res.json({ success: true, message: "Successfully paired with Sunshine!", data });
    } catch (error: any) {
        console.error("[sunshine] Pairing failed:", error);
        const status = error.response?.status || 500;
        res.status(status).json({ error: extract_error_message(error) });
    }
};

export const get_clients_route = async (_req: Request, res: Response) => {
    try {
        const { running } = await get_sunshine_status();
        if (!running) { return res.status(400).json({ named_certs: [], error: "Sunshine is not running." }); }
        const data = await fetch_sunshine_api("/api/clients/list", "GET");
        res.json(data);
    } catch (error: any) {
        console.error("[sunshine] Get clients failed:", error);
        const status = error.response?.status || 500;
        res.status(status).json({ error: extract_error_message(error) });
    }
};

export const unpair_client_route = async (req: Request, res: Response) => {
    try {
        const { running } = await get_sunshine_status();
        if (!running) { return res.status(400).json({ error: "Sunshine is not running." }); }
        const { uuid } = req.body;
        if (!uuid) return res.status(400).json({ error: "Client UUID is required." });
        const data = await fetch_sunshine_api("/api/clients/unpair", "POST", { uuid: uuid.toString() });
        res.json({ success: true, data });
    } catch (error: any) {
        console.error("[sunshine] Unpair client failed:", error);
        const status = error.response?.status || 500;
        res.status(status).json({ error: extract_error_message(error) });
    }
};

export const unpair_all_clients_route = async (_req: Request, res: Response) => {
    try {
        const { running } = await get_sunshine_status();
        if (!running) { return res.status(400).json({ error: "Sunshine is not running." }); }
        const data = await fetch_sunshine_api("/api/clients/unpair-all", "POST");
        res.json({ success: true, data });
    } catch (error: any) {
        console.error("[sunshine] Unpair all clients failed:", error);
        const status = error.response?.status || 500;
        res.status(status).json({ error: extract_error_message(error) });
    }
};

export const get_logs_route = async (_req: Request, res: Response) => {
    try {
        const { running } = await get_sunshine_status();
        if (!running) { return res.status(400).json({ error: "Sunshine is not running." }); }
        const sunshine_client = get_sunshine_client();
        const response = await sunshine_client.get("/api/logs", { responseType: "text" });
        res.send(response.data);
    } catch (error: any) {
        console.error("[sunshine] Get logs failed:", error);
        const status = error.response?.status || 500;
        res.status(status).json({ error: extract_error_message(error) });
    }
};
