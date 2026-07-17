import { get_plug_by_id } from "../../plug/plug.js";

export const plug_turn_on= async(id:string)=>{
    const device = await get_plug_by_id(id);
    await device.turnOn();
}

export const plug_turn_off= async(id:string)=>{
    const device = await get_plug_by_id(id);
    await device.turnOff();
}

export const get_plug_status= async (id:string)=>{
    const device = await get_plug_by_id(id);
    const info= await device.getDeviceInfo();
    const energy= await device.getEnergyUsage();
    const power= energy.current_power??"unknown"
    return {device_on:info.device_on, power: power};
}