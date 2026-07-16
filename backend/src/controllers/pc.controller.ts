import type { Request, Response } from "express";
import {prisma} from "../lib/prisma.js"
// import {initiate_boot, full_shutdown} from "../src/lib/boot.js"
import { plug_turn_off, plug_turn_on, get_plug_status } from "../lib/plug.action.js";
import { is_pc_online, wait_for_boot, wait_for_shutdown, graceful_shutdown } from "../../ssh/ssh.js";
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
        const [pc_status, plug_status]= await Promise.all([is_pc_online(1500), get_plug_status(plug.plug_id)]);
        res.json({pc_status:pc_status?"online":"offline", plug:plug_status});
    
    }
    catch(err){
        console.error("can't get Plug Status");
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
    const plug = await get_plug();
    if(!plug){
        throw new Error("Plug Not Found");
    }
    await plug_turn_on(plug.plug_id);
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
    });
}


export const shutdown_pc= async(_req:Request, res:Response)=>{
    const plug = await get_plug();
    if(!plug){
        throw new Error("Plug Not Found");
    }

    await graceful_shutdown();
    await prisma.power_event.create({
        data: { event_type: "SHUTDOWN_NORMAL", plug_id: plug.plug_id },
    });

    res.status(202).json({ message: "Graceful shutdown initiated." });
    const confirmed= await wait_for_shutdown();
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
    await new Promise((r)=>{setTimeout(r, SHUTDOWN_TIMER)});
    await plug_turn_off(plug.plug_id);
    await prisma.power_event.create({
        data: { event_type: "MAINS_CUT", plug_id: plug.plug_id, description: "Power cut after confirmed graceful shutdown" },
    });
}

export async function forced_shutdown(_req: Request, res: Response) {
    const plug = await get_plug();
    if(!plug){
        throw new Error("Plug Not Found");
    }

    await plug_turn_off(plug.plug_id);
    await prisma.power_event.create({
        data: { event_type: "SHUTDOWN_FORCED", plug_id: plug.plug_id },
    });

    res.json({ message: "Power cut immediately." });
}


