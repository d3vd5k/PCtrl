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
import { code_server_proxy, extract_session_id } from "./lib/code_server_proxy.js";
import { parseCookie } from "cookie";
import { verify_token } from "./lib/jwt.js";
import { prisma } from "./lib/prisma.js";
import admin_routes from "./routes/admin.route.js";
import esp32_routes from "./routes/esp32.route.js";
import sunshine_routes from "./routes/sunshine.route.js"



dotenv.config();
const PORT= process.env.PORT || 4000;

const app= express();

app.use(cors({ origin: ["http://localhost:3000", "http://energymonitor.local/telemetry"] }));
app.use(express.json());
app.use(cookieParser());
app.use("/api/pc", pc_routes);
app.use("/api/auth", auth_routes);
app.use("/api/sessions", session_routes);
app.use("/proxy", proxy_routes);
app.use("/api/admin", admin_routes);
app.use("/api/esp32", esp32_routes);
app.use("/api/sunshine", sunshine_routes)


const server = http.createServer(app);
server.on("upgrade", async (req, socket, head) => {
  try {
    const sessionId = extract_session_id(req);
    if (!sessionId) {
      socket.destroy();
      return;
    }

    const cookies = parseCookie(req.headers.cookie || "");
    const token = cookies.pctrl_token;

    if (!token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    let payload;
    try {
      payload = verify_token(token);
    } catch {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    if (payload.access !== "GRANTED") {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }

    const session = await prisma.session.findUnique({ where: { session_id: sessionId } });
    if (!session || session.user_id !== payload.user_id) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }

    code_server_proxy.upgrade(req, socket as import("node:net").Socket, head);
  } catch (err) {
    console.error("[ws-upgrade] Auth check failed:", err);
    socket.destroy();
  }
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[server] Unhandled rejection:", reason, promise);
});

process.on("uncaughtException", (err) => {
  console.error("[server] Uncaught exception:", err);
});

server.listen(PORT, () => {
  console.log(`[server] Running on port ${PORT}`);
});