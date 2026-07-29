import { NodeSSH } from "node-ssh";
import fs from "fs";

const TARGET_PC_IP = process.env.TARGET_PC_IP!;
const TARGET_PC_SSH_USER = process.env.TARGET_PC_SSH_USER!;
const TARGET_PC_SSH_KEY_PATH = process.env.TARGET_PC_SSH_KEY_PATH!;
const CODE_SERVER_TARGET_USER = process.env.CODE_SERVER_TARGET_USER;

function quoteForShell(value: string) {
    return `'${value.replaceAll("'", "'\"'\"'")}'`;
}

export async function execute_session_command(command: string) {
    const ssh = new NodeSSH();
    const connectConfig: Record<string, unknown> = {
        host: TARGET_PC_IP,
        username: TARGET_PC_SSH_USER,
    };
    if (TARGET_PC_SSH_KEY_PATH) {
        try {
            connectConfig.privateKey = fs.readFileSync(TARGET_PC_SSH_KEY_PATH, "utf-8");
        } catch {
            connectConfig.privateKeyPath = TARGET_PC_SSH_KEY_PATH;
        }
    }

    await ssh.connect(connectConfig);

    try {
        const directCmd = `export TERM=xterm-256color; export COLORTERM=truecolor; /usr/bin/timeout 30s /bin/bash -lc ${quoteForShell(command)}`;
        const targetUser = CODE_SERVER_TARGET_USER?.trim();
        const needsSudo = Boolean(targetUser && targetUser !== "" && targetUser !== TARGET_PC_SSH_USER);

        if (needsSudo) {
            const sudoCmd = `sudo -n -u ${targetUser} -- ${directCmd}`;
            const result = await ssh.execCommand(sudoCmd);

            if (result.code === 0 || !result.stderr.includes("sudo: a password is required")) {
                return {
                    stdout: result.stdout,
                    stderr: result.stderr,
                    code: result.code ?? 0,
                };
            }

            // If sudo requires a password, fall back to executing directly as SSH user
            const directResult = await ssh.execCommand(directCmd);
            return {
                stdout: directResult.stdout,
                stderr: directResult.stderr ? directResult.stderr : `[notice: sudo -u ${targetUser} requires NOPASSWD in /etc/sudoers; ran directly as ${TARGET_PC_SSH_USER}]`,
                code: directResult.code ?? 0,
            };
        }

        const directResult = await ssh.execCommand(directCmd);
        return {
            stdout: directResult.stdout,
            stderr: directResult.stderr,
            code: directResult.code ?? 0,
        };
    } finally {
        ssh.dispose();
    }
}
