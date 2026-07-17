import { Router } from "express";
import { login, logout, me} from "../controllers/auth.controller.js";
import { require_auth } from "../middlewares/auth.middleware.js";

const router = Router();
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", require_auth, me);


export default router;