import {prisma} from "../src/lib/prisma.js"

const plug = await prisma.plug.findFirst({where: {name: "Gaming PC Main Socket",}});
console.log(plug);