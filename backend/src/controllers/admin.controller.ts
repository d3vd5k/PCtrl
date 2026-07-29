import type { Response } from "express";
import { prisma } from "../lib/prisma.js";
import type { AuthedRequest } from "../middlewares/auth.middleware.js";

export const list_users = async (_req: AuthedRequest, res: Response) => {
  const users = await prisma.user.findMany({
    select: { user_id: true, name: true, email: true, role: true, access: true, created_at: true },
    orderBy: { created_at: "asc" },
  });
  res.json(users);
};


function canManage(actorRole: string, targetRole: string): boolean {
  if (targetRole === "ROOT") return false;           // Root is never managed through this
  if (actorRole === "ROOT") return true;              // Root manages Admin and User
  if (actorRole === "ADMIN") return targetRole === "USER"; // Admin manages User only
  return false;
}

async function set_access(req: AuthedRequest, res: Response, access: "GRANTED" | "SUSPENDED" | "REJECTED") {
    if(!req.params.id ){res.status(400).json({ message: "User ID is required in the URL." }); return;}
    if(typeof req.params.id !== "string"){res.status(400).json({ message: "User ID must be a string." }); return;}
    const target = await prisma.user.findUnique({ where: { user_id: req.params.id } });
    if(!req.user?.id){res.status(401).json({ message: "Unauthorized: User information is missing." }); return;}
    const user_from_DB = await prisma.user.findUnique({ where: { user_id: req.user?.id } });
    if(!user_from_DB){res.status(401).json({ message: "Unauthorized: User information is missing." }); return;}
    if (!target) return res.status(404).json({ message: "User not found." });

    if (!canManage(user_from_DB.role, target.role)) {
        return res.status(403).json({ message: "You don't have permission to manage this user." });
    }

    if(target.access == access){
        return res.status(403).json({ message: "User already has this access." });
    }

    if(access === "REJECTED" && target.access !== "PENDING"){
        return res.status(403).json({ message: "You cannot REJECT the access of a GRANTED/SUSPENDED user." });
    }

    if(access === "SUSPENDED" && target.access !== "GRANTED"){
        return res.status(403).json({ message: "You cannot suspend a pending user." });
    }
    const user = await prisma.user.update({ where: { user_id: target.user_id }, data: { access } });
    res.json({ message: `${user.name} is now ${access.toLowerCase()}.` });
}



export const delete_user= async (req: AuthedRequest, res: Response)=> {
    if(!req.params.id ){res.status(400).json({ message: "User ID is required in the URL." }); return;}
    if(typeof req.params.id !== "string"){res.status(400).json({ message: "User ID must be a string." }); return;}
    const target = await prisma.user.findUnique({ where: { user_id: req.params.id } });
    if (!target) return res.status(404).json({ message: "User not found." });
    if(!req.user?.id){res.status(401).json({ message: "Unauthorized: User information is missing." }); return;}
    const user_from_DB = await prisma.user.findUnique({ where: { user_id: req.user?.id } });
    if(!user_from_DB){res.status(401).json({ message: "Unauthorized: User information is missing." }); return;}

    if (!canManage(user_from_DB.role, target.role)) {
        return res.status(403).json({ message: "You don't have permission to manage this user." });
    }
    if(target.access === "PENDING"){
        return res.status(403).json({ message: "You cannot delete a pending user." });
    }
    await prisma.user.delete({ where: { user_id: target.user_id } });
    res.json({ message: `${target.name} has been deleted.` });

}

export const approve_user = (req: AuthedRequest, res: Response) => set_access(req, res, "GRANTED");
export const reject_user = (req: AuthedRequest, res: Response) => set_access(req, res, "REJECTED");
export const suspend_user = (req: AuthedRequest, res: Response) => set_access(req, res, "SUSPENDED");


export const reset_pc_lock = async (_req: AuthedRequest, res: Response) => {
    await prisma.pc_lock.update({
        where: { lock_id: 0 },
        data: { operation: "NO_OPERATION" },
    });
    res.json({ message: "PC lock cleared." });
};

export const reset_pc_cooldown = async (_req: AuthedRequest, res: Response) => {
    await prisma.pc_lock.update({
        where: { lock_id: 0 },
        data: { power_cut_at: null },
    });
    res.json({ message: "Power-on cooldown cleared." });
};