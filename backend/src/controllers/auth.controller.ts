import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma.js";
import { sign_token, verify_token } from "../lib/jwt.js";


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
    res.json({
        token,
        user: { id: user.user_id, name: user.name, email: user.email, role: user.role },
    });
    
}   