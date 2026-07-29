import { Router } from "express";
import { require_auth } from "../middlewares/auth.middleware.js";
import { require_role } from "../middlewares/role.middleware.js";
import { approve_user, delete_user, list_users, reject_user, reset_pc_cooldown, reset_pc_lock, suspend_user } from "../controllers/admin.controller.js";
import { validate_params } from "../middlewares/validate.middleware.js";
import { user_id_param_pchema } from "../schemas/admin.schema.js";
const router = Router();
router.use(require_auth, require_role("ADMIN"));

router.get("/users", list_users);
router.post("/users/:id/approve", validate_params(user_id_param_pchema), approve_user);
router.post("/users/:id/reject",  validate_params(user_id_param_pchema), reject_user);
router.post("/users/:id/suspend",  validate_params(user_id_param_pchema), suspend_user);
router.delete("/users/:id",  validate_params(user_id_param_pchema), delete_user);
router.post("/pc-lock/reset", reset_pc_lock);
router.post("/pc-lock/reset-cooldown", reset_pc_cooldown);

export default router;