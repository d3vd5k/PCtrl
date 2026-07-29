import { loginDeviceByIp, cloudLogin, loginDevice, type TapoDevice} from "tp-link-tapo-connect";
import arp from "@network-utils/arp-lookup";
import { prisma } from "../src/lib/prisma.js"
import dotenv from "dotenv";
dotenv.config();
const TAPO_EMAIL= process.env.TAPO_EMAIL;
const TAPO_PASSWORD= process.env.TAPO_PASSWORD;
// const deviceIp= process.env.TAPO_IP;


if(typeof TAPO_EMAIL== "undefined"){
console.error("[plug] Tapo email configuration not found.");
throw new Error("Tapo Email undefined");
}
if(typeof TAPO_PASSWORD== "undefined"){
console.error("[plug] Tapo password configuration not found.");
throw new Error("Tapo Password undefined");
}

export const get_plug_by_alias= async (alias:string) =>{
    console.log("[plug] Logging in to TP-Link Tapo Cloud...");
    const cloudApi = await cloudLogin(TAPO_EMAIL, TAPO_PASSWORD);
    console.log("[plug] Cloud login successful, fetching devices...");
    const devices = await cloudApi.listDevicesByType('SMART.TAPOPLUG');
    console.log(`[plug] Devices fetched, searching for alias: ${alias}`);
    let target:TapoDevice | undefined;
    for (let i = 0; i < devices.length; i++) {
        if(devices[i]?.alias==alias){
            target= devices[i];
        }   
    }

    if(typeof target == "undefined"){
        console.error(`[plug] Device with alias ${alias} not found.`);
        throw new Error("Target Device not found.");
    }
    console.log(`[plug] ${alias} found, logging in to device...`);

    const plug= await loginDevice(TAPO_EMAIL, TAPO_PASSWORD, target);

    return plug;
}


export const get_plug_by_ip= async (ip:string) =>{
    try{
        console.log(`[plug] Logging in to TAPO device on ${ip}...`);
        const plug= await loginDeviceByIp(TAPO_EMAIL, TAPO_PASSWORD, ip);
        console.log("[plug] IP login successful.");
        return plug;

    }
    catch(err){
        console.error(`[plug] Failed to connect to plug via IP (${ip}).`);
        throw err;
    }
}


export const get_plug_by_mac= async (mac:string) =>{
    try{

        console.log(`[plug] Finding TAPO device with MAC ${mac}...`);
        const ip= await arp.toIP(mac);
        if(!ip){
            throw new Error("IP Address Not found");
        }
        console.log(`[plug] Logging in to TAPO device on ${ip}...`);
        const plug= await loginDeviceByIp(TAPO_EMAIL, TAPO_PASSWORD, ip);
        return plug;

    }
    catch(err){
        console.error(`[plug] Failed to connect to plug via MAC (${mac}).`);
        throw err;
    }
}


export const get_plug_by_id= async (id:string)=>{
    const target= await prisma.plug.findUniqueOrThrow({where:{plug_id:id}})
    try{
        const plug= await get_plug_by_ip(target.ip_address);
        return plug;
    }
    catch(err){
        console.warn(`[plug] IP login failed for ${target.name} (${target.ip_address}), trying ARP...`);
    }

    try{
        const plug= await get_plug_by_mac(target.mac_address);
        const ip = await arp.toIP(target.mac_address);
        if(!ip){
            console.warn("[plug] Could not resolve updated IP address via ARP.");
        }
        else{
            await prisma.plug.update({where:{plug_id:id}, data:{ip_address: ip}})
        }
        
        return plug;
    }
    catch(err){
        console.warn(`[plug] MAC login failed for ${target.name} (${target.mac_address}), trying Cloud Login...`);
    }

    try{
        const alias= target.plug_identifier;
        if(!alias){throw new Error("Alias not found")}
        const plug= await get_plug_by_alias(alias);
        const info=  await plug.getDeviceInfo();
        const ip = info.ip;
        const mac= info.mac.replace('-', ':');
        await prisma.plug.update({where:{plug_id:id}, data:{ip_address: ip, mac_address:mac}});
        return plug;
    }
    catch(err){
        console.warn(`[plug] IP, MAC, and Cloud login failed for ${target.name} (${target.plug_identifier}).`);
        throw err;
    }

}   