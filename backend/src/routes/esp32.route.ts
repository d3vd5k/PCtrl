import router from "express";
import { get_status, mains_info, alert } from "../controllers/esp32.controller.js";
import { require_auth } from "../middlewares/auth.middleware.js";
import { validate_body } from "../middlewares/validate.middleware.js";
import { alert_schema } from "../schemas/esp32.schema.js";

const esp32_router = router();

esp32_router.get("/status", require_auth, get_status);
esp32_router.get("/mains-info", require_auth, mains_info);
esp32_router.post("/alert", validate_body(alert_schema), alert);//   for esp32 to send alerts to backend;
                                   //   verified by secret key - esp32 is not a user

export default esp32_router;