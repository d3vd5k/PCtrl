import { Router } from "express";
import { get_status, boot_pc, shutdown_pc, forced_shutdown } from "../controllers/pc.controller.js";

const router = Router();

router.get("/status", get_status);
router.post("/power-on", boot_pc);
router.post("/shutdown/graceful", shutdown_pc);
router.post("/shutdown/forced", forced_shutdown);

export default router;