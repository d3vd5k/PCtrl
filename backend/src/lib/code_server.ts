import { NodeSSH } from "node-ssh";
import crypto from "node:crypto";
import { prisma } from "./prisma.js";
import dotenv from "dotenv";
import net from "node:net";
dotenv.config()

const TARGET_PC_IP = process.env.TARGET_PC_IP!;
const TARGET_PC_SSH_USER = process.env.TARGET_PC_SSH_USER!;
const TARGET_PC_SSH_KEY_PATH = process.env.TARGET_PC_SSH_KEY_PATH!;
const CODE_SERVER_TARGET_USER = process.env.CODE_SERVER_TARGET_USER!;
const PORT_RANGE_START = Number(process.env.PORT_RANGE_START) | 8100;
const PORT_RANGE_END = Number(process.env.PORT_RANGE_END) | 8200;
const FRONTEND_ORIGIN= process.env.FRONTEND_ORIGIN;



async function connect() {
    const ssh = new NodeSSH();
    await ssh.connect({
        host: TARGET_PC_IP,
        username: TARGET_PC_SSH_USER,
        privateKeyPath: TARGET_PC_SSH_KEY_PATH,
    });
  return ssh;
}

function generate_assword() {
    return crypto.randomBytes(16).toString("hex");
}

async function find_free_port(): Promise<number> {
    const usedPorts = await prisma.session_service.findMany({
        where: { service_type: "CODE_SERVER", status: { in: ["STARTING", "RUNNING"] } },
        select: { port: true },
    });
    const used = new Set(usedPorts.map((p) => p.port));

    for (let port = PORT_RANGE_START; port <= PORT_RANGE_END; port++) {
        if (!used.has(port)) return port;
    }
    throw new Error("No free ports available in range.");
}


function wait_for_port_open(host: string, port: number, maxWaitMs = 10_000, intervalMs = 500): Promise<void> {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    function attempt() {
      const socket = new net.Socket();
      socket.setTimeout(1000);

      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });

      socket.once("error", retryOrFail);
      socket.once("timeout", () => {
        socket.destroy();
        retryOrFail();
      });

      socket.connect(port, host);
    }

    function retryOrFail() {
      if (Date.now() - start >= maxWaitMs) {
        reject(new Error(`Port ${port} on ${host} did not open within ${maxWaitMs}ms.`));
        return;
      }
      setTimeout(attempt, intervalMs);
    }

    attempt();
  });
}

async function wait_for_process_start(ssh: NodeSSH, port: number, max_wait_time = 10_000, poll_interval = 500): Promise<number> {
    const start = Date.now();

    while (Date.now() - start < max_wait_time) {
        const pid_result = await ssh.execCommand(`pgrep -f "code-server.*--bind-addr 0.0.0.0:${port}"`);
        const pid_val= pid_result.stdout.trim().split("\n")[0]
        if(!pid_val){ 
            await new Promise((r) => setTimeout(r, poll_interval));
            continue;
        }
        const pid = parseInt(pid_val, 10);

        if (pid && !isNaN(pid)) {
        return pid;
        }

        await new Promise((r) => setTimeout(r, poll_interval));
    }

    throw new Error(`code-server did not start within ${max_wait_time}ms — no matching process found.`);
}

async function wait_for_process_end(ssh: NodeSSH, port: number, max_wait_time = 10_000, poll_interval = 500){
    const start = Date.now();

    while (Date.now() - start < max_wait_time) {
        const pid_result = await ssh.execCommand(`pgrep -f "code-server.*--bind-addr 0.0.0.0:${port}"`);
        const pid_val= pid_result.stdout.trim().split("\n")[0]
        if(!pid_val){return;}
        const pid = parseInt(pid_val, 10);

        if (!pid || isNaN(pid)) {
        return;
        }

        await new Promise((r) => setTimeout(r, poll_interval));
    }

    throw new Error(`code-server did not start within ${max_wait_time}ms — no matching process found.`);
}


export const launch_code_server= async (sessionId: string)=> {
    const port = await find_free_port();
    const password = generate_assword();

    const service_record = await prisma.session_service.create({
        data: { session_id: sessionId, service_type: "CODE_SERVER", port, password, status: "STARTING" },
    });

    const ssh = await connect();
    try {
        const launchCmd =
        `sudo -u ${CODE_SERVER_TARGET_USER} env "PASSWORD=${password}" nohup /usr/bin/code-server ` +
        `--bind-addr 0.0.0.0:${port} --auth password --trusted-origins ${FRONTEND_ORIGIN} ` +
        `> /tmp/code-server-${port}.log 2>&1 &`;

        console.log("[code-server] Executing launch command:", launchCmd);
        await ssh.execCommand(launchCmd);

        const pid = await wait_for_process_start(ssh, port);
        await wait_for_port_open(TARGET_PC_IP, port);

        await prisma.session_service.update({
        where: { service_id: service_record.service_id },
        data: { pid, status: "RUNNING" },
        });

        return { port:port, password:password, url: `http://${TARGET_PC_IP}:${port}`, service_id:service_record.service_id };
    } catch (err) {
        await prisma.session_service.update({
        where: { service_id: service_record.service_id },
        data: { status: "FAILED" },
        });
        throw err;
    } finally {
        ssh.dispose();
    }
}

export const stop_code_server= async (serviceId: string)=> {
    const service = await prisma.session_service.findUniqueOrThrow({ where: { service_id: serviceId } });

    const ssh = await connect();
    try {
        await ssh.execCommand(`sudo pkill -f "code-server.*--bind-addr 0.0.0.0:${service.port}"`);
        await wait_for_process_end(ssh, service.port);
        await prisma.session_service.update({
        where: { service_id: serviceId },
        data: { status: "STOPPED", stopped_at: new Date() },
        });
    } finally {
        ssh.dispose();
    }
}