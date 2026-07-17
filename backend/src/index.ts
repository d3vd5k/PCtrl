import express from "express";
import dotenv from "dotenv";
import { timeStamp } from "node:console";
import pc_routes from "./routes/pc.route.js";
import auth_routes from "./routes/auth.route.js";
import cookieParser from "cookie-parser";
import cors from "cors";

dotenv.config();
const PORT= process.env.PORT || 4000;

const app= express();

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());
app.use(cookieParser());
app.use("/api/pc", pc_routes);
app.use("/api/auth", auth_routes);

app.get("/api/health", (req, res)=>{
    res.json({status:"ok", timeStamp: new Date().toISOString()});
})

app.listen(PORT, ()=>{
    console.log(`PCtrl server started on PORT ${PORT}`);
})