import type { Request, Response } from "express";
import { get_plug_id, get_plug_status } from "../lib/plug.action.js";
import { is_pc_online } from "../../ssh/ssh.js";
import { shutdown_pc , boot_pc, forced_shutdown} from "../lib/pc.js";
import { PcActionError } from "../lib/errors.js";
const SHUTDOWN_TIMER=  2*60*1000;


export const get_status= async (_req:Request, res:Response)=>{
    try{
        const plug= await get_plug_id();
        if(!plug){
            throw new Error("Plug Not Found");
        }
        const [pc_status, plug_status]= await Promise.all([is_pc_online(2000), get_plug_status(plug.plug_id)]);
        res.json({pc_status:pc_status?"online":"offline", plug:plug_status});
    
    }
    catch(err){
        console.error("[pc] Failed to get PC status:", err);
        res.status(500).json({ pc_status: "unknown", plug: { reachable: false, device_on: null, power: null } });
    }
}

function statusOf(err: unknown): number {
  return err instanceof PcActionError ? err.status : 500;
}


// export const boot_pc= async (req:Request, res:Response)=>{
//     const plug= await get_plug_id();
//     if(!plug){
//         throw new Error("Plug Not Found");
//     }
//     try{
//         await prisma.power_event.create({
//             data: { event_type: "BOOT_STARTED", plug_id: plug.plug_id },
//         });
//         res.status(202).json({ message: "Power-on initiated, waiting for boot confirmation." });

//         await initiate_boot(plug.plug_id);
//         await prisma.power_event.create({
//         data: {
//             event_type: "BOOT_COMPLETE",
//             plug_id: plug.plug_id,
//             description: null ,
//         },
//         });
    
//     }
//     catch(err){
//         await prisma.power_event.create({
//         data: {
//             event_type: "MAINS_CONNECTED",
//             plug_id: plug.plug_id,
//             description: "Timed out waiting for boot confirmation" ,
//         },
//         });
//     }
// }

export const boot_pc_route = async (_req: Request, res: Response) => {
  try {
    await boot_pc(() => {
      res.status(202).json({ message: "Power-on initiated, waiting for boot confirmation." });
    });
  } catch (err) {
    if (!res.headersSent) {
      res.status(statusOf(err)).json({ message: err instanceof Error ? err.message : "Boot failed." });
    }
  }
};




export const shutdown_pc_route = async (_req: Request, res: Response) => {
  try {
    await shutdown_pc(() => {
      res.status(202).json({ message: "Graceful shutdown initiated." });
    });
  } catch (err) {
    if (!res.headersSent) {
      res.status(503).json({ message: err instanceof Error ? err.message : "Shutdown failed." });
    }
  }
};
export const forced_shutdown_route = async (_req: Request, res: Response) => {
    try {
        await forced_shutdown();
        res.json({ message: "Power cut immediately." });
    } catch (err) {
        res.status(statusOf(err)).json({ message: err instanceof Error ? err.message : "error" });
    }
};


