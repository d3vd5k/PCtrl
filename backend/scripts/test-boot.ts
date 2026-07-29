import {get_plug_by_id} from "../plug/plug.js";
import {prisma} from "../src/lib/prisma.js"
import { wait_for_boot, connect_pc } from "../ssh/ssh.js";

const plug_info= await prisma.plug.findFirst({where: {name: "Gaming PC Main Socket"}});
if(!plug_info){
    throw new Error("Plug Not Found");
}

const plug= await get_plug_by_id(plug_info.plug_id);

if(!plug){
    throw new Error("Can't Connect to PLUG");
}

await plug.turnOn();

const boot_status= await wait_for_boot();
if(boot_status){
    console.log("[test-boot] Booted successfully.");
    const PC= await connect_pc();
    if(!PC){
        throw new Error("Unable to connect to PC via SSH");
    }
    const fetch= await PC.execCommand("fastfetch");
    console.log("[test-boot] Command output:", fetch);
    PC.dispose();
    
}
await prisma.$disconnect();