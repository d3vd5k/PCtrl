import { prisma } from "../src/lib/prisma.js";
import { Role, Access, Operation } from "../src/generated/prisma/client.js";
import bcrypt from "bcrypt";
import "dotenv/config";
async function main(){
    const root_passwd_hash= await bcrypt.hash(process.env.ROOT_SEED_PASSWORD??"password", 10);
    if(!root_passwd_hash){
        throw new Error("Error in generating password hash");
    }
    const root = await prisma.user.upsert({
    where: { email: "root@pctrl.local" },
    update: {access: Access.GRANTED,},
    create: {
      name: "Root",
      email: "root@pctrl.local",
      role: Role.ROOT,
      access: Access.GRANTED,
      password_hash: root_passwd_hash,
    },
  });
    const admin_passwd_hash= await bcrypt.hash(process.env.ADMIN_SEED_PASSWORD??"password", 10);
    if(!admin_passwd_hash){
        throw new Error("Error in generating password hash");
    }
    const admin = await prisma.user.upsert({
    where: { email: "get.d3v@gmail.com" },
    update: {access: Access.GRANTED,},
    create: {
      name: "d3vd5k",
      email: "get.d3v@gmail.com",
      role: Role.ADMIN,
      access: Access.GRANTED,
      password_hash: admin_passwd_hash,
    },
  });
  const plug = await prisma.plug.upsert({
    where: { mac_address: "C0:3A:55:A1:69:F4" }, // replace with real MAC
    update: {},
    create: {
      name: "Gaming PC Main Socket",
      ip_address: "192.168.29.108", // replace
      mac_address: "C0:3A:55:A1:69:F4", // replace
      plug_identifier: "Tapo P110", // must match Tapo app alias
    },
    });
    const operation = await prisma.pc_lock.upsert({
    where: { lock_id: 0 }, // replace with real MAC
    update: {operation: Operation.NO_OPERATION,},
    create: {
      lock_id: 0,
      operation: Operation.NO_OPERATION,
    },
    });


     const user_passwd_hash= await bcrypt.hash(process.env.USER_SEED_PASSWORD??"password", 10);
    if(!user_passwd_hash){
        throw new Error("Error in generating password hash");
    }
    const user = await prisma.user.upsert({
    where: { email: "user@pctrl.local" },
    update: {access: Access.GRANTED,},
    create: {
      name: "user",
      email: "user@pctrl.local",
      role: Role.USER,
      access: Access.GRANTED,
      password_hash: user_passwd_hash,
    },
  });

  const HARDCODED_SESSION_ID = '123e4567-e89b-12d3-a456-426614174000';

  const session = await prisma.session.upsert({
    where: { 
      session_id: HARDCODED_SESSION_ID 
    },
    update: {
      status: 'ACTIVE',
      ended_at: null,
    },
    create: {
      session_id: HARDCODED_SESSION_ID, 
      user_id: root.user_id,
      status: 'ACTIVE',
    },
  });

  const sunshine= await prisma.sunshine_status.upsert({
      where:{status_id:0},
      update:{status_id:0, running:false},
      create:{
        status_id:0, running:false}
  });

    console.log("[seed] Seeding complete:", { root: root.email, admin: admin.email, plug: plug.name, operation:operation, session:session.session_id, sunshine: sunshine});




  }

main().catch((e)=>{
    console.error("[seed] Seeding failed:", e);
    process.exit(1);
})
.finally(async ()=>{
    await prisma.$disconnect();
});