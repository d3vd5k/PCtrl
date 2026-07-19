import { Router } from "express";
import { require_auth } from "../middlewares/auth.middleware.js";
import { create_session, list_sessions, get_session, start_code_server_in_session, terminate_session } from "../controllers/session.controller.js";

const router = Router();
router.use(require_auth);

router.post("/", create_session);
router.get("/", list_sessions);
router.get("/:id", get_session);
router.post("/:id/code-server", start_code_server_in_session);
router.post("/:id/terminate", terminate_session);

export default router;