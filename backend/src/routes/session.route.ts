import { Router } from "express";
import { require_auth } from "../middlewares/auth.middleware.js";
import { create_session, list_sessions, get_session, start_code_server_in_session, terminate_session, run_session_terminal_command } from "../controllers/session.controller.js";
import { session_id_param_schema, session_terminal_schema } from "../schemas/session.schema.js";
import { validate_body, validate_params } from "../middlewares/validate.middleware.js";
const router = Router();
router.use(require_auth);

router.post("/", create_session);
router.get("/", list_sessions);
router.get("/:id", validate_params(session_id_param_schema), get_session);
router.post("/:id/code-server", validate_params(session_id_param_schema), start_code_server_in_session);
router.post("/:id/terminal", validate_params(session_id_param_schema), validate_body(session_terminal_schema), run_session_terminal_command);
router.post("/:id/terminate", validate_params(session_id_param_schema), terminate_session);

export default router;
