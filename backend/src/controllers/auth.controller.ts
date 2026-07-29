import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma.js";
import { sign_token, verify_token } from "../lib/jwt.js";
import strict from "node:assert/strict";
import type { AuthedRequest } from "../middlewares/auth.middleware.js";
import { generate_reset_token, hash_reset_token } from "../lib/reset_token.js";
import { send_password_reset_email } from "../lib/mail.js";

let COOKIE_AGE = Number(process.env.COOKIE_AGE) || 15 * 60 * 1000;
const RESET_TOKEN_TTL_MS = Number(process.env.RESET_TOKEN_TTL_MS) || 30 * 60 * 1000;



export const register=  async(req: Request, res: Response)=> {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: "Name, email, and password required." });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "An account with this email already exists." });

    const password_hash = await bcrypt.hash(password, 10);
    await prisma.user.create({
        data: { name, email, password_hash, role: "USER", access: "PENDING" },
    });

    res.status(201).json({ message: "Registration submitted. An admin will review your request." });
}


export const login= async(req:Request, res:Response)=>{
    const {email, password}= req.body;
    if(!email || !password){
        return res.status(400).json({ error: "Email and password required." })
    }
    const user= await prisma.user.findUnique({where:{email:email}});

    if(!user){
        return res.status(401).json({ error: "User Not Found." });
    }
    if(!user.password_hash){
        return res.status(401).json({ error: "Invalid credentials." });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
        return res.status(401).json({ error: "Invalid credentials." });
    }
    if (user.access !== "GRANTED") {
        return res.status(403).json({ error: `Access ${user.access.toLowerCase()}.`, access: user.access });
    }

    const token = sign_token({ user_id: user.user_id, role: user.role, access: user.access });
    res.cookie("pctrl_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV==="production",
        sameSite: "lax",
        maxAge: COOKIE_AGE,
    });
    
    res.json({ user: { id: user.user_id, name: user.name, email: user.email, role: user.role }});
    
} 

export const logout= async  (_req: Request, res: Response) => {
    res.clearCookie("pctrl_token");
    res.json({ message: "Logged out." });
}


export const me= async (req: AuthedRequest, res: Response) => {
    const user = await prisma.user.findUnique({ where: { user_id: req.user!.id } });
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({ id: user.user_id, name: user.name, email: user.email, role: user.role });
}

export const update_profile = async (req: AuthedRequest, res: Response) => {
    const user = await prisma.user.update({
        where: { user_id: req.user!.id },
        data: { name: req.body.name },
    });

    res.json({ id: user.user_id, name: user.name, email: user.email, role: user.role });
}


export const forgot_password= async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required." });

    const user = await prisma.user.findUnique({ where: { email } });
    const generic_response = { message: "If an account with that email exists, a reset link has been sent." };

    if (!user) {
        return res.json(generic_response);
    }

    const { rawToken, tokenHash } = generate_reset_token();

    await prisma.password_reset_token.updateMany({
        where: { user_id: user.user_id, used: false },
        data: { used: true },
    });

    await prisma.password_reset_token.create({
        data: {
        user_id: user.user_id,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
    });

    const resetUrl = `${process.env.PASSWORD_RESET_BASE_URL}/reset-password?token=${rawToken}`;
    try {
        await send_password_reset_email(user.email, resetUrl);
    } 
    catch (err) {
        console.error("[auth] Failed to send password reset email:", err);
    }

  res.json(generic_response);
}

export const reset_password= async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password required." });
    }
    if (newPassword.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    const tokenHash = hash_reset_token(token);
    const resetToken = await prisma.password_reset_token.findUnique({ where: { token_hash: tokenHash } });

    if (!resetToken || resetToken.used || resetToken.expires_at < new Date()) {
        return res.status(400).json({ error: "This reset link is invalid or has expired." });
    }

    const password_hash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
        prisma.user.update({ where: { user_id: resetToken.user_id }, data: { password_hash } }),
        prisma.password_reset_token.update({ where: { token_id: resetToken.token_id }, data: { used: true } }),
    ]);

    res.json({ message: "Password updated. You can now log in." });
}
