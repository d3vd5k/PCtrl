import { NodeSSH } from "node-ssh";
import { prisma } from "./prisma.js";
import { connect_pc } from "../../ssh/ssh.js";



const SUNSHINE_TARGET_USER = process.env.CODE_SERVER_TARGET_USER!;
const SUNSHINE_WAYLAND_DISPLAY = process.env.SUNSHINE_WAYLAND_DISPLAY!;
const SUNSHINE_XDG_RUNTIME_DIR = process.env.SUNSHINE_XDG_RUNTIME_DIR!;


async function wait_for_process_start(ssh: NodeSSH, max_wait_time = 10_000, poll_interval = 500): Promise<number> {
    const start = Date.now();
    while (Date.now() - start < max_wait_time) {
        const result = await ssh.execCommand(`pgrep -f "/usr/bin/sunshine"`);
        const pid_val = result.stdout.trim().split("\n")[0];
        if (pid_val) {
            const pid = parseInt(pid_val, 10);
            if (pid && !isNaN(pid)) return pid;
        }
        await new Promise((r) => setTimeout(r, poll_interval));
    }
    throw new Error("Sunshine did not start within timeout — no matching process found.");
}

async function wait_for_process_end(ssh: NodeSSH, max_wait_time = 10_000, poll_interval = 500): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < max_wait_time) {
        const result = await ssh.execCommand(`pgrep -f "/usr/bin/sunshine"`);
        if (!result.stdout.trim()) return;
        await new Promise((r) => setTimeout(r, poll_interval));
    }
    throw new Error("Sunshine did not stop within timeout.");
}


export const start_sunshine = async () => {
    
    const status = await prisma.sunshine_status.findUnique({ where: { status_id: 0 } });
    if (status?.running) throw new Error("Sunshine is already running.");

    const ssh = await connect_pc();
    try {
        await ssh.execCommand(
        `sudo -u ${SUNSHINE_TARGET_USER} env ` +
        `XDG_RUNTIME_DIR=${SUNSHINE_XDG_RUNTIME_DIR} WAYLAND_DISPLAY=${SUNSHINE_WAYLAND_DISPLAY} ` +
        `nohup /usr/bin/sunshine > /tmp/sunshine.log 2>&1 &`
        );

        const pid = await wait_for_process_start(ssh);

        await prisma.sunshine_status.upsert({
        where: { status_id: 0 },
        update: { running: true, pid:pid, started_at: new Date() },
        create:{status_id: 0, running:true, pid:pid, started_at: new Date()}
        });

        return { pid };
    } finally {
        ssh.dispose();
    }
};


export const stop_sunshine = async () => {
    const ssh = await connect_pc();
    try {
        await ssh.execCommand(`sudo pkill -f "/usr/bin/sunshine"`);
        await wait_for_process_end(ssh);

        await prisma.sunshine_status.upsert({
        where:  { status_id: 0 },
        update: {running: false, pid: null },
        create: {status_id: 0, running:false}
        });
        await prisma.sunshine_status.update({ where: { status_id: 0 }, data: { running: false, pid: null } });
    } finally {
        ssh.dispose();
    }
};

export const get_sunshine_status = async () => {
    return (await prisma.sunshine_status.findUnique({ where: { status_id: 0 } })) ?? { running: false, pid: null, started_at: null };
};