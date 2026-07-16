import express from "express";
import dotenv from "dotenv";
import { timeStamp } from "node:console";
import pcRoutes from "../routes/pc.routes.js";


const PORT= process.env.PORT || 4000;

dotenv.config();
const app= express();
app.use(express.json());
app.use("/api/pc", pcRoutes);

app.get("/api/health", (req, res)=>{
    res.json({status:"ok", timeStamp: new Date().toISOString()});
})

app.listen(PORT, ()=>{
    console.log(`PCtrl server started on PORT ${PORT}`);
})