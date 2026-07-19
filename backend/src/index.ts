import express from "express";
import dotenv from "dotenv";
import { timeStamp } from "node:console";
import pc_routes from "./routes/pc.route.js";
import auth_routes from "./routes/auth.route.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import session_routes from "./routes/session.route.js"
import http from "node:http";
import proxy_routes from "./routes/proxy.route.js";
import { code_server_proxy } from "./lib/code-server-proxy.js";


dotenv.config();
const PORT= process.env.PORT || 4000;

const app= express();

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());
app.use(cookieParser());
app.use("/api/pc", pc_routes);
app.use("/api/auth", auth_routes);
app.use("/api/sessions", session_routes);
app.use("/proxy", proxy_routes);

const server = http.createServer(app);
server.on("upgrade", code_server_proxy.upgrade);


// app.get("/api/health", (req, res)=>{
//     res.json({status:"ok", timeStamp: new Date().toISOString()});
// })

// app.listen(PORT, ()=>{
//     console.log(`PCtrl server started on PORT ${PORT}`);
// })

server.listen(PORT, () => {
  console.log(`PCtrl server running on port ${PORT}`);
});