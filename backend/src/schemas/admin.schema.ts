import { z } from "zod";

export const user_id_param_pchema = z.object({
  id: z.uuid(),
});