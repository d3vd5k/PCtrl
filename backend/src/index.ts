import express from "express";
import dotenv from "dotenv";
import { timeStamp } from "node:console";
import pc_routes from "./routes/pc.route.js";
import auth_routes from "./routes/auth.route.js";

const PORT= process.env.PORT || 4000;

dotenv.config();
const app= express();
app.use(express.json());
app.use("/api/pc", pc_routes);
app.use("/api/auth", auth_routes);

app.get("/api/health", (req, res)=>{
    res.json({status:"ok", timeStamp: new Date().toISOString()});
})

app.listen(PORT, ()=>{
    console.log(`PCtrl server started on PORT ${PORT}`);
})