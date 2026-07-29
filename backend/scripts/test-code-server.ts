import { launch_code_server, stop_code_server } from "../src/lib/code_server.js";

const session_id= "123e4567-e89b-12d3-a456-426614174000"
const start= await launch_code_server(session_id);
console.log("[test-code-server] Code server launched:", start);
await(new Promise<never>((r)=>{setTimeout(r, 20000)}));
await stop_code_server(start.service_id);