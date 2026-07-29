import {get_plug_by_id} from "../plug/plug.js";
import { wait_for_boot, graceful_shutdown,  wait_for_shutdown} from "../ssh/ssh.js";

export const initiate_boot= async (plug_id:string)=>{
    try{
        const plug= await get_plug_by_id(plug_id);


        await plug.turnOn();

        const boot_status= await wait_for_boot();
        if(boot_status){
            console.log("[ssh] PC booted successfully.");
            
        }
        throw new Error("Boot Unsuccessful");
    }
    catch(err){
        console.error("[ssh] Boot failed:", err);
        throw err;
    }


}

export const full_shutdown= async (plug_id:string)=>{
    try{
        await graceful_shutdown();
        await wait_for_shutdown();
        const plug= await get_plug_by_id(plug_id);
        if(!plug){
            throw new Error("Can't Connect to PLUG");
        }
        await plug.turnOff();
        console.log("[ssh] Shutdown completed successfully.");
    }
    catch(err){
        console.error("[ssh] Shutdown failed:", err);
        throw err;
    }




}


