import { graceful_shutdown, wait_for_shutdown } from "../ssh/ssh.js";
import { get_plug_by_id } from "../plug/plug.js";
import {prisma} from "../src/lib/prisma.js"



await graceful_shutdown();
await wait_for_shutdown();

const plug_data = await prisma.plug.findFirst({where: {name: "Gaming PC Main Socket",}});
if(!plug_data){
    console.log("PLUG not found in DB");
    throw new Error("Plug Not Found in DB");
}
const plug= await get_plug_by_id(plug_data.plug_id);

await plug.turnOff();