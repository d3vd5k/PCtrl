import { z } from "zod";

export const login_schema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const register_schema = z.object({
    name: z.string().trim().min(1).max(100),
    email: z.email(),
    password: z.string().min(8),
});

export const forgot_password_schema = z.object({
    email: z.email(),
});

export const reset_password_schema = z.object({
    token: z.string().min(1),
    newPassword: z.string().min(8),
});

export const update_profile_schema = z.object({
    name: z.string().trim().min(1).max(100),
});
