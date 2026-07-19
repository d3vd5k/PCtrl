import type { Request, Response } from "express";
import {prisma} from "../lib/prisma.js"
// import {initiate_boot, full_shutdown} from "../src/lib/boot.js"
import { plug_turn_off, plug_turn_on, get_plug_status } from "../lib/plug.action.js";
import { is_pc_online, wait_for_boot, wait_for_shutdown, graceful_shutdown } from "../../ssh/ssh.js";
import { get_cooldown_remaining_ms, get_current_operation, begin_operation, end_operation, mark_power_cut } from "../lib/pc_lock.js";
import { Operation } from "../generated/prisma/enums.js";
const SHUTDOWN_TIMER=  2*60*1000;
const get_plug= async()=>{
    const plug= prisma.plug.findFirst();
    return plug;
}

export const get_status= async (_req:Request, res:Response)=>{
    try{
        const plug= await get_plug();
        if(!plug){
            throw new Error("Plug Not Found");
        }
        const [pc_status, plug_status]= await Promise.all([is_pc_online(2000), get_plug_status(plug.plug_id)]);
        res.json({pc_status:pc_status?"online":"offline", plug:plug_status});
    
    }
    catch(err){
        console.error("[get_status] failed:", err);
        res.status(500).json({ pc_status: "unknown", plug: { reachable: false, device_on: null, power: null } });
    }
}




// export const boot_pc= async (req:Request, res:Response)=>{
//     const plug= await get_plug();
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
//         console.error("can't get Plug Status");
//         await prisma.power_event.create({
//         data: {
//             event_type: "MAINS_CONNECTED",
//             plug_id: plug.plug_id,
//             description: "Timed out waiting for boot confirmation" ,
//         },
//         });
//     }
// }

export const boot_pc= async(_req: Request, res: Response)=> {
    const op = await get_current_operation();
    if (op != "NO_OPERATION") {
        return res.status(409).json({ message: `Cannot power on — ${op.replace(/_/g, " ")} already in progress.` });
    }

    const cooldown = await get_cooldown_remaining_ms();
    if (cooldown > 0) {
        return res.status(409).json({
        message: `Power was recently cut — waiting for cooldown time. Try again in ${Math.ceil(cooldown / 1000)}s.`,
        });
    }
    const plug = await get_plug();
    if (!plug) {
        return res.status(404).json({ message: "Plug not configured." });
    }
    const is_safe= await begin_operation(Operation.BOOT);
    if(!is_safe){
        return res.status(409).json({message: "Another operation maybe in progress, Wait for Cooldown"})
    }
    try {
        await plug_turn_on(plug.plug_id);
    }
    catch (err) {
        await end_operation();
        console.error("[boot_pc] plug unreachable:", err);
        return res.status(503).json({ message: "Unable to reach plug. Check physical connection." });
    }
    const pc_online= await is_pc_online(1500);
    if(pc_online){
        return res.status(409).json({message: "PC already online"})
    }
    await prisma.power_event.create({
    data: { event_type: "BOOT_STARTED", plug_id: plug.plug_id },
    });

    res.status(202).json({ message: "Power-on initiated, waiting for boot confirmation." });

    wait_for_boot().then((booted) => {
    prisma.power_event.create({
        data: {
        event_type: booted ? "BOOT_COMPLETE" : "MAINS_CONNECTED",
        plug_id: plug.plug_id,
        description: booted ? null : "Timed out waiting for boot confirmation",
        },
    }).catch(console.error);
    }).finally(()=> end_operation());
};


export const shutdown_pc = async (_req: Request, res: Response) => {
    const op = await get_current_operation();
    if (op!="NO_OPERATION") {
        return res.status(409).json({ message: `Cannot power on — ${op.replace(/_/g, " ")} already in progress.` });
    }
    
    
    const plug = await get_plug();
    if (!plug) {
        return res.status(404).json({ message: "Plug not configured." });
    }
    const plug_status= await get_plug_status(plug.plug_id);
    
    if(!plug_status.reachable){return res.status(500).json({message:"Plug unreachable"})}
    else if(plug_status.device_on== false){return res.status(409).json({message:"Power Already cut"})}
    
    const is_safe= await begin_operation(Operation.SHUTDOWN);
    if(!is_safe){
        return res.status(409).json({message: "Another operation maybe in progress, Wait for Cooldown"})
    }
    try {
        await graceful_shutdown();
    } catch (err) {
        console.error("[shutdown_pc] SSH shutdown command failed:", err);
        return res.status(503).json({ message: "Could not reach target PC over SSH." });
    }

    await prisma.power_event.create({
        data: { event_type: "SHUTDOWN_NORMAL", plug_id: plug.plug_id },
    });

    res.status(202).json({ message: "Graceful shutdown initiated." });
    try {
        const confirmed = await wait_for_shutdown();
        if (!confirmed) {
        console.error(`[shutdown] Target did not go offline within timeout — NOT cutting power.`);
        await prisma.power_event.create({
            data: {
            event_type: "SHUTDOWN_NORMAL",
            plug_id: plug.plug_id,
            description: "Timed out waiting for shutdown confirmation — power NOT cut, needs manual check",
            },
        });
        return;
        }

        await new Promise((r) => setTimeout(r, SHUTDOWN_TIMER));
        await mark_power_cut();
        await plug_turn_off(plug.plug_id);
        await prisma.power_event.create({
        data: { event_type: "MAINS_CUT", plug_id: plug.plug_id, description: "Power cut after confirmed graceful shutdown" },
        });
    }
    catch (err) {
        console.error("[shutdown_pc] post-response failure:", err);
        await prisma.power_event.create({
        data: {
            event_type: "SHUTDOWN_NORMAL",
            plug_id: plug.plug_id,
            description: `Post-shutdown-confirmation step failed: ${err instanceof Error ? err.message : String(err)}`,
        },
        }).catch(console.error); 
    }
    finally{
        await end_operation();
    }
};
export async function forced_shutdown(_req: Request, res: Response) {
    const op = await get_current_operation();
    if (op!="NO_OPERATION") {
        return res.status(409).json({ message: `Cannot power on — ${op.replace(/_/g, " ")} already in progress.` });
    }
    try{
        const plug = await get_plug();
        if(!plug){
            throw new Error("Plug Not Found");
        }
        const plug_status= await get_plug_status(plug.plug_id);
        if(!plug_status.reachable){return res.status(500).json({message:"Plug unreachable"})}
        else if(plug_status.device_on== false){return res.status(409).json({message:"Power Already cut"})}
        const is_safe= await begin_operation(Operation.PLUG_CUT);
        if(!is_safe){
            return res.status(409).json({message: "Another operation maybe in progress, Wait for Cooldown"})
        }
        await plug_turn_off(plug.plug_id);
        await mark_power_cut();
        await prisma.power_event.create({
            data: { event_type: "SHUTDOWN_FORCED", plug_id: plug.plug_id },
        });

        res.json({ message: "Power cut immediately." });
    }
    catch(err){
        res.status(500).json({message:"error", errors:err})
    }
    finally{
        await end_operation();
    }
   
}


