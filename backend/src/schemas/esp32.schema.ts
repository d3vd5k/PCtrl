import { z } from "zod";

export const alert_schema = z.object({
  event: z.enum(["POWERCUT", "BROWNOUT", "NORMAL"]),
  voltage: z.number(),
});