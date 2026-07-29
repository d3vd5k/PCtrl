import { Router } from "express";
import { get_status, boot_pc_route, shutdown_pc_route, forced_shutdown_route } from "../controllers/pc.controller.js";
import { require_auth } from "../middlewares/auth.middleware.js";
import { require_role } from "../middlewares/role.middleware.js";


const router = Router();
router.use(require_auth)

router.get("/status", get_status);
router.post("/power-on", require_role("ADMIN"), boot_pc_route);
router.post("/shutdown/graceful", require_role("ADMIN"), shutdown_pc_route);
router.post("/shutdown/forced", require_role("ADMIN"), forced_shutdown_route);

export default router;