import { Router } from "express";
import { forgot_password, login, logout, me, register, reset_password, update_profile} from "../controllers/auth.controller.js";
import { require_auth } from "../middlewares/auth.middleware.js";
import { validate_body } from "../middlewares/validate.middleware.js";
import { login_schema, register_schema, forgot_password_schema, reset_password_schema, update_profile_schema } from "../schemas/auth.schema.js";

const router = Router();
router.post("/register", validate_body(register_schema), register);
router.post("/login", validate_body(login_schema), login);
router.post("/logout", logout);
router.get("/me", require_auth, me);
router.patch("/me", require_auth, validate_body(update_profile_schema), update_profile);
router.post("/forgot-password", validate_body(forgot_password_schema), forgot_password);
router.post("/reset-password", validate_body(reset_password_schema), reset_password);

export default router;
