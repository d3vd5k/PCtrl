import { z } from "zod";

export const session_id_param_schema = z.object({
  id: z.uuid(),
});

export const session_terminal_schema = z.object({
  command: z.string().trim().min(1).max(4_000),
});
