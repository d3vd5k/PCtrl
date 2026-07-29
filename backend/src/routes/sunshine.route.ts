import { Router } from "express";
import { require_auth } from "../middlewares/auth.middleware.js";
import { start_sunshine_route, 
    stop_sunshine_route, 
    get_sunshine_status_route, 
    pair_route,
    get_clients_route,
    unpair_client_route,
    unpair_all_clients_route
 } from "../controllers/sunshine.controller.js";
import { require_role } from "../middlewares/role.middleware.js";
import { validate_body } from "../middlewares/validate.middleware.js";
import { pair_schema, unpair_schema } from "../schemas/sunshine.schema.js";
const router= Router();
router.use(require_auth);
router.use(require_role("ADMIN"));



router.post("/start", start_sunshine_route);
router.post("/stop", stop_sunshine_route);
router.get("/status", get_sunshine_status_route);


router.post("/pair", validate_body(pair_schema), pair_route);
router.get("/clients", get_clients_route);
router.post("/clients/unpair", validate_body(unpair_schema), unpair_client_route);
router.post("/clients/unpair-all", unpair_all_clients_route);

export default router