import {prisma} from "../lib/prisma.js"
import { Role, Access, Operation } from "../../src/generated/prisma/client.js";
// let currentOperation: Operation = null;
// let powerCutAt: number | null = null;

// Your PSU takes ~10-20s to fully discharge capacitors after power is cut.
// Padded to 25s as a safety margin — adjust if you measure it more precisely.
const CAPACITOR_DRAIN_MS = 25_000;

export async function get_current_operation() {
    let lock
    try{
        lock= await prisma.pc_lock.findUnique({where:{lock_id:0}});
    }
    catch(err){
        throw err;
    }
    if(!lock){
        throw new Error("Lock Not found")
    }
    return lock.operation;

}

export const begin_operation= async (op: Exclude<Operation, null>)=> {
    try{
        const lock= await prisma.pc_lock.update({where:{lock_id:0}, data:{operation:op}});
    }
    catch(err){
        throw err;
    }
}

export const end_operation= async()=> {
    try{
        await prisma.pc_lock.update({where:{lock_id:0}, data:{operation:Operation.NO_OPERATION}});
    }
    catch(err){
        throw err;
    }
}

export const mark_power_cut= async ()=> {
    try{
        await prisma.pc_lock.update({where:{lock_id:0}, data:{power_cut_at:new Date()}});
    }
    catch(err){
        throw err;
    }
}

export const get_cooldown_remaining_ms= async ()=> {
    try{
        const lock= await prisma.pc_lock.findUnique({where:{lock_id:0}});
        if(!lock){
            throw new Error("Lock Not found")
        }
        const time= lock.power_cut_at?.getTime();
        if(lock.operation == Operation.NO_OPERATION || typeof time == "undefined") return 0
        return Math.max(0, CAPACITOR_DRAIN_MS - (Date.now() - time))
    }
    catch(err){
        throw err;
    }

}