import type { z } from "zod";
import type { Request, Response, NextFunction } from "express";

export function validate_body(schema: z.ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: "Validation failed", details: result.error.flatten().fieldErrors });
    }
    req.body = result.data; // replaced with parsed/coerced data — trims, type-coerces, strips unknown keys
    next();
  };
}

export function validate_params(schema: z.ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return res.status(400).json({ error: "Invalid URL parameters", details: result.error.flatten().fieldErrors });
    }
    req.params = result.data as any;
    next();
  };
}