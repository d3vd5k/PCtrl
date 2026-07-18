"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api_fetch } from "@/lib/api";

interface PlugStatus {
  reachable: boolean;
  device_on: boolean | null;
  power: number | string | null;
}

interface StatusResponse {
    pc_status: "online" | "offline";
    plug: PlugStatus;
}

interface UserInfo {
    id: string;
    name: string;
    email: string;
    role: string;
}

const POLL_INTERVAL_MS = 5000;

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<UserInfo | null>(null);
    const [status, setStatus] = useState<StatusResponse | null>(null);
    const [actionInProgress, setActionInProgress] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStatus = useCallback(async () => {
        try {
        const data = await api_fetch("/api/pc/status");
        setStatus(data);
        } catch {
        // A failed status poll shouldn't kick you to login — only an actual 401 should.
        // api_fetch throws on any non-OK response, so we can't distinguish here yet;
        // that's handled in the initial auth check below instead.
        }
    }, []);

    useEffect(() => {
        async function init() {
        try {
            const me = await api_fetch("/api/auth/me");
            setUser(me);
            await fetchStatus();
        } catch {
            router.push("/login");
            return;
        } finally {
            setLoading(false);
        }
        }
        init();

        const interval = setInterval(fetchStatus, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [fetchStatus, router]);

    async function handleAction(action: "power-on" | "shutdown/graceful" | "shutdown/forced") {
        setError(null);
        setActionInProgress(action);
        try {
        await api_fetch(`/api/pc/${action}`, { method: "POST" });
        await fetchStatus();
        } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed.");
        } finally {
        setActionInProgress(null);
        }
    }

    async function handleLogout() {
        await api_fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
        router.push("/login");
    }

    if (loading) {
        return (
        <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-400">
            Loading...
        </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 p-8 text-neutral-100">
        <div className="mx-auto max-w-2xl space-y-6">
            <div className="flex items-center justify-between">
            <div>
                <h1 className="text-xl font-semibold">PCtrl Dashboard</h1>
                <p className="text-sm text-neutral-400">
                {user?.name} · {user?.role}
                </p>
            </div>
            <button
                onClick={handleLogout}
                className="rounded border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800"
            >
                Log out
            </button>
            </div>

            <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 space-y-4">
            <div className="flex items-center gap-3">
                <StatusDot online={status?.pc_status === "online"} />
                <span className="font-medium">
                PC is {status?.pc_status ?? "unknown"}
                </span>
            </div>

            <div className="flex items-center gap-3 text-sm text-neutral-400">
                <StatusDot online={status?.plug.reachable ?? false} />
                <span>
                Plug {status?.plug.reachable ? "reachable" : "unreachable"}
                {status?.plug.reachable && status.plug.device_on !== null && (
                    <> · relay {status.plug.device_on ? "on" : "off"}</>
                )}
                </span>
            </div>

            {status?.plug.reachable && status.plug.power !== null && (
            <p className="text-xs text-neutral-500">Current draw: {status.plug.power} W</p>
            )}
            </div>

            {error && (
            <div className="rounded border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
                {error}
            </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ActionButton
                label="Power On"
                busyLabel="Booting..."
                busy={actionInProgress === "power-on"}
                disabled={!!actionInProgress}
                onClick={() => handleAction("power-on")}
                variant="primary"
            />
            <ActionButton
                label="Graceful Shutdown"
                busyLabel="Shutting down..."
                busy={actionInProgress === "shutdown/graceful"}
                disabled={!!actionInProgress}
                onClick={() => handleAction("shutdown/graceful")}
                variant="neutral"
            />
            <ActionButton
                label="Force Power Off"
                busyLabel="Cutting power..."
                busy={actionInProgress === "shutdown/forced"}
                disabled={!!actionInProgress}
                onClick={() => {
                if (confirm("This cuts power immediately without a clean OS shutdown. Continue?")) {
                    handleAction("shutdown/forced");
                }
                }}
                variant="danger"
            />
            </div>
        </div>
        </div>
    );
}

function StatusDot({ online }: { online: boolean }) {
    return (
        <span
        className={`h-2.5 w-2.5 rounded-full ${online ? "bg-green-500" : "bg-neutral-600"}`}
        />
    );
}

function ActionButton({
    label,
    busyLabel,
    busy,
    disabled,
    onClick,
    variant,
    }: {
    label: string;
    busyLabel: string;
    busy: boolean;
    disabled: boolean;
    onClick: () => void;
    variant: "primary" | "neutral" | "danger";
}) {
    const styles = {
        primary: "bg-neutral-100 text-neutral-900",
        neutral: "border border-neutral-700 text-neutral-100 hover:bg-neutral-800",
        danger: "border border-red-900 text-red-400 hover:bg-red-950/50",
    };

    return (
        <button
        onClick={onClick}
        disabled={disabled}
        className={`rounded px-4 py-2.5 text-sm font-medium transition disabled:opacity-40 ${styles[variant]}`}
        >
        {busy ? busyLabel : label}
        </button>
    );
}