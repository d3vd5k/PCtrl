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


    console.log({ root: root.email, admin: admin.email, plug: plug.name });

    const operation = await prisma.pc_lock.upsert({
    where: { lock_id: 0 }, // replace with real MAC
    update: {},
    create: {
      lock_id: 0,
      operation: Operation.NO_OPERATION,
    },
    });



  }

main().catch((e)=>{
    console.error(e);
    process.exit(1);
})
.finally(async ()=>{
    await prisma.$disconnect();
});