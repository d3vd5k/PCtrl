import { get_plug_by_id } from "../../plug/plug.js";
import { prisma } from "./prisma.js"

export const get_plug_id= async()=>{
    const plug= prisma.plug.findFirst();
    return plug;
}


export const plug_turn_on= async(id:string)=>{
    const device = await get_plug_by_id(id);
    await device.turnOn();
}

export const plug_turn_off= async(id:string)=>{
    const device = await get_plug_by_id(id);
    await device.turnOff();
}

export const get_plug_status = async (id: string) => {
    try {
        const device = await get_plug_by_id(id);
        const info = await device.getDeviceInfo();
        const energy = await device.getEnergyUsage();
        return {
        reachable: true as const,
        device_on: info.device_on,
        power: energy.current_power ?? null,
        };
    } catch (err) {
        console.error(`[plug] Status check failed for ${id}:`, err);
        return { reachable: false as const, device_on: null, power: null };
    }
};
