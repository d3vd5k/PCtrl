import {prisma} from "./prisma.js"
import { Role, Access, Operation } from "../generated/prisma/client.js";

const CAPACITOR_DRAIN_MS = 25_000;

export async function get_current_operation(lock_id:number= 0) {
    let lock
    try{
        lock= await prisma.pc_lock.findUnique({where:{lock_id:lock_id}});
    }
    catch(err){
        throw err;
    }
    if(!lock){
        throw new Error("Lock Not found")
    }
    return lock.operation;

}


export const begin_operation= async (op: Exclude<Operation, "NO_OPERATION">, lock_id:number= 0)=> {
    try{
        const threshold= new Date(Date.now() - CAPACITOR_DRAIN_MS);
        const lock= await prisma.pc_lock.updateMany({
            where:{
                lock_id:lock_id, 
                operation:Operation.NO_OPERATION,
                OR:[{power_cut_at:null}, {power_cut_at:{lte:threshold}}]
            }, 
            data:{operation:op}
        });
        return lock.count > 0;
    }
    catch(err){
        throw err;
    }
}

export const end_operation= async (lock_id:number= 0)=> {
    try{
        await prisma.pc_lock.update({where:{lock_id:lock_id}, data:{operation:Operation.NO_OPERATION}});
    }
    catch(err){
        throw err;
    }
}

export const mark_power_cut= async (lock_id:number= 0)=> {
    try{
        await prisma.pc_lock.update({where:{lock_id:lock_id}, data:{power_cut_at:new Date()}});
    }
    catch(err){
        throw err;
    }
}

export const get_cooldown_remaining_ms= async (lock_id:number= 0)=> {
    try{
        const lock= await prisma.pc_lock.findUnique({where:{lock_id:lock_id}});
        if(!lock){
            throw new Error("Lock Not found")
        }
        const time= lock.power_cut_at?.getTime();
        if(!time) return 0
        return Math.max(0, CAPACITOR_DRAIN_MS - (Date.now() - time))
    }
    catch(err){
        throw err;
    }

}