import { NodeSSH } from "node-ssh";
import fs from "fs";
import dotenv from "dotenv";
import net from "node:net";


dotenv.config();

const TARGET_PC_IP = process.env.TARGET_PC_IP!;
const TARGET_PC_SSH_USER = process.env.TARGET_PC_SSH_USER!;
const TARGET_PC_SSH_KEY_PATH = process.env.TARGET_PC_SSH_KEY_PATH!;


export const connect_pc =  async ():Promise<NodeSSH> => {
    const ssh= new NodeSSH();
    await ssh.connect({
        host: TARGET_PC_IP,
        username: TARGET_PC_SSH_USER,
        privateKey: fs.readFileSync(TARGET_PC_SSH_KEY_PATH, "utf-8"),
    });
    return ssh;
}

export const graceful_shutdown= async ()=>{
    let ssh;

    try {
        ssh = await connect_pc();
    } 
    catch (err) {
        console.warn("[ssh] PC is already offline or unreachable. Skipping shutdown.");
        throw err;
    }

    try{
        await ssh.execCommand("sudo -n shutdown -h now > /dev/null 2>&1 &");
    }
    catch(err){
        console.log("[ssh] SSH connection dropped during shutdown (expected behavior).");
    }
    finally{
        if(ssh){
            ssh.dispose();
        }
        
    }
    

}

// export const is_pc_online = async (timeoutMs = 2000): Promise<boolean> => {
//     let is_timeout:boolean= false;
//     try {
//         const ssh_promise= connect_pc().then((ssh)=>{
//             if(is_timeout){
//                 ssh.dispose();
//                 return null;
//             }
//             return ssh;
//         });
//         const timer_promise= new Promise<never>((_, reject)=>{
//             setTimeout(()=>{
//                 is_timeout= true;
//                 reject(new Error("SSH connection timeout"));
//             }, timeoutMs);
//         });

//         const result = await Promise.race([ssh_promise, timer_promise]);
//         if(result){
//             result.dispose();
//             return true;
//         }
//         return false;
//     } catch {
//         return false; 
//     }
// }
export const is_pc_online = (timeoutMs: number = 2000): Promise<boolean> => {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(timeoutMs);

      // Helper to ensure the socket is always destroyed
      const cleanUpAndResolve = (status: boolean) => {
        socket.destroy();
        resolve(status);
      };

      socket.once("connect", () => cleanUpAndResolve(true));
      
      // It's important to destroy the socket on error as well to prevent memory leaks
      socket.once("error", () => cleanUpAndResolve(false));
      
      socket.once("timeout", () => cleanUpAndResolve(false));

      socket.connect(22, TARGET_PC_IP);
  });
};


export const wait_for_shutdown= async(maxWaitMs = 120_000, pollIntervalMs = 3000): Promise<boolean>=> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const online = await is_pc_online(1500);
    if (!online) return true;
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
  return false;
}


export const wait_for_boot= async(maxWaitMs = 120_000, pollIntervalMs = 3000): Promise<boolean>=> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const online = await is_pc_online(1500);
    if (online) return true;
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
  return false;
}
