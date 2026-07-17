import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma.js";
import { sign_token, verify_token } from "../lib/jwt.js";
import strict from "node:assert/strict";
import type { AuthedRequest } from "../middlewares/auth.middleware.js";

let COOKIE_AGE;

if(!process.env.COOKIE_AGE){COOKIE_AGE= Number(process.env.COOKIE_AGE);}
else{COOKIE_AGE= 15 * 60 * 1000}

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
        return res.status(403).json({ error: `Access ${user.access.toLowerCase()}.` });
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

export async function logout(_req: Request, res: Response) {
    res.clearCookie("pctrl_token");
    res.json({ message: "Logged out." });
}


export async function me(req: AuthedRequest, res: Response) {
    const user = await prisma.user.findUnique({ where: { user_id: req.user!.id } });
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({ id: user.user_id, name: user.name, email: user.email, role: user.role });
}