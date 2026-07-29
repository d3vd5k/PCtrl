import { z } from "zod";

export const pair_schema = z.object({
  pin: z.string().trim().min(1),
  name: z.string().trim().min(1).max(100),
});

export const unpair_schema = z.object({
  uuid: z.string(),
});