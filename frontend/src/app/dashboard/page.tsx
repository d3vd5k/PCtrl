"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell, Loading, type UserInfo } from "@/components/app-shell";
import { api_fetch } from "@/lib/api";

interface StatusResponse { pc_status: "online" | "offline"; plug: { reachable: boolean; device_on: boolean | null; power: number | string | null; }; }
interface Telemetry { voltage: number | null; current: number | null; power: number | null; frequency: number | null; pf: number | null; gridState: "NORMAL" | "BROWNOUT" | "POWERCUT"; uptime_24h: number | null; }
interface SessionSummary { session_id: string; status: string; started_at: string; services?: { service_type: string; status: string }[]; }

const POLL_INTERVAL_MS = 5_000;
const gridCopy = { NORMAL: "Mains stable", BROWNOUT: "Brownout", POWERCUT: "Mains cut" };

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [creatingSession, setCreatingSession] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    const [statusResult, telemetryResult, sessionResult] = await Promise.allSettled([
      api_fetch("/api/pc/status"), api_fetch("/api/esp32/mains-info"), api_fetch("/api/sessions"),
    ]);
    if (statusResult.status === "fulfilled") setStatus(statusResult.value);
    if (telemetryResult.status === "fulfilled") setTelemetry(telemetryResult.value);
    if (sessionResult.status === "fulfilled") setSessions(sessionResult.value);
  }, []);

  useEffect(() => {
    async function init() {
      try { setUser(await api_fetch("/api/auth/me")); await fetchDashboard(); }
      catch { router.push("/login"); }
    }
    void init();
    const interval = setInterval(() => void fetchDashboard(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchDashboard, router]);

  async function createSession() {
    setCreatingSession(true); setError(null);
    try {
      const session = await api_fetch("/api/sessions", { method: "POST" });
      if (session && session.session_id) {
        setSessions((prev) => [{ ...session, services: session.services ?? [] }, ...prev]);
      }
      router.push(`/dashboard/session/${session.session_id}`);
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to create a session."); setCreatingSession(false); }
  }
  async function terminateSession(sessionId: string) {
    if (!confirm("Terminate this session? Running services will be stopped.")) return;
    setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
    try { await api_fetch(`/api/sessions/${sessionId}/terminate`, { method: "POST" }); await fetchDashboard(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to terminate session."); await fetchDashboard(); }
  }
  async function powerAction(action: "power-on" | "shutdown/graceful" | "shutdown/forced") {
    if (action === "shutdown/forced" && !confirm("Cut power immediately? The OS will not shut down cleanly.")) return;
    setActionInProgress(action); setError(null);
    const targetStatus = action === "power-on" ? "online" : "offline";
    setStatus((prev) => prev ? { ...prev, pc_status: targetStatus } : null);
    try { await api_fetch(`/api/pc/${action}`, { method: "POST" }); await fetchDashboard(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Power action failed."); await fetchDashboard(); }
    finally { setActionInProgress(null); }
  }

  if (!user) return <Loading label="Loading…" />;
  const canControlPower = user.role === "ADMIN" || user.role === "ROOT";
  const gridClass = telemetry?.gridState === "NORMAL" ? "text-[#54d88b]" : telemetry?.gridState === "BROWNOUT" ? "text-[#f7bc4d]" : "text-[#f26d70]";
  const pcOnline = status?.pc_status === "online";

  return <AppShell user={user}><div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
    <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">Overview</h1>
        <p className="mt-1 text-sm text-[#9aa9b5]">Live telemetry and remote controls.</p>
      </div>
      <div className="flex items-center gap-2 font-mono text-xs"><StatusDot active={pcOnline} /><span className="text-[#9aa9b5]">WORKSTATION</span><span>{status?.pc_status?.toUpperCase() ?? "—"}</span></div>
    </section>

    {error && <div className="mt-6 border border-[#f26d70] bg-[#2a171b] px-4 py-3 text-sm text-[#f26d70]">{error}</div>}

    <div className="mt-8 grid gap-6 lg:grid-cols-3">
      <HealthCard title="Electrical" signalColor={gridClass} signalLabel={telemetry?.gridState ? (gridCopy[telemetry.gridState] ?? "—") : "—"}>
        {telemetry?.voltage == null ? <Metric label="Voltage" value="—" /> : (
          <div className="flex items-end gap-2">
            <span className={`font-mono text-4xl font-semibold tracking-[-0.06em] ${gridClass}`}>{telemetry.voltage.toFixed(1)}</span>
            <span className="mb-1.5 font-mono text-sm text-[#9aa9b5]">V</span>
          </div>
        )}
        <div className="mt-4 border-t border-[#2a343e] pt-3 font-mono text-xs">
          <Metric label="Frequency" value={telemetry?.frequency != null ? `${telemetry.frequency.toFixed(1)} Hz` : "—"} />
        </div>
      </HealthCard>

      <HealthCard title="Power path">
        <div className="flex items-center gap-2 text-sm"><StatusDot active={status?.plug.reachable ?? false} /><span>{status?.plug.reachable ? "Plug reachable" : "Plug unreachable"}</span></div>
        {status?.plug.device_on !== null && <p className="mt-3 font-mono text-xs text-[#9aa9b5]">RELAY {status?.plug.device_on ? "ON" : "OFF"}</p>}
        <p className="mt-3 font-mono text-xs text-[#9aa9b5]">DRAW {status?.plug.power != null ? `${(Number(status.plug.power) / 1000).toFixed(1)} W` : "—"}</p>
        <div className="mt-4 border-t border-[#2a343e] pt-3">
          <Metric label="24h mains availability" value={telemetry?.uptime_24h == null ? "—" : `${(telemetry.uptime_24h * 100).toFixed(1)}%`} />
        </div>
      </HealthCard>

      {canControlPower && (
        <div className="rounded-xl border border-[#2a343e] bg-[#13181d] p-5">
          <p className="text-xs font-medium text-[#9aa9b5]">Power control</p>
          <div className="mt-4"><PowerControl online={pcOnline} actionInProgress={actionInProgress} onAction={powerAction} /></div>
        </div>
      )}
    </div>

    <section id="sessions" className="mt-10">
      <div className="flex items-end justify-between gap-4 border-b border-[#2a343e] pb-3">
        <h2 className="text-lg font-semibold">Sessions <span className="font-mono text-sm text-[#9aa9b5]">[{sessions.length}]</span></h2>
        <button onClick={createSession} disabled={creatingSession} className="rounded-lg bg-[#5dcff5] px-4 py-2 text-sm font-semibold text-[#0b0e11] disabled:opacity-50">{creatingSession ? "Creating…" : "+ New session"}</button>
      </div>
      <div className="divide-y divide-[#2a343e] border-b border-[#2a343e]">
        {sessions.length === 0
          ? <div className="py-10 text-center text-sm text-[#9aa9b5]">No active sessions.</div>
          : sessions.map((session) => <SessionRow key={session.session_id} session={session} onOpen={() => router.push(`/dashboard/session/${session.session_id}`)} onTerminate={() => terminateSession(session.session_id)} />)}
      </div>
    </section>
  </div></AppShell>;
}

function StatusDot({ active }: { active: boolean }) { return <span className={`h-2.5 w-2.5 rounded-full ${active ? "bg-[#54d88b]" : "bg-[#66737f]"}`} />; }
function Metric({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] uppercase tracking-wider text-[#9aa9b5]">{label}</p><p className="mt-1 text-sm">{value}</p></div>; }
function HealthCard({ title, signalColor, signalLabel, children }: { title: string; signalColor?: string; signalLabel?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#2a343e] bg-[#13181d] p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-[#9aa9b5]">{title}</p>
        {signalLabel && <span className={`font-mono text-xs ${signalColor}`}>● {signalLabel}</span>}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function PowerControl({ online, actionInProgress, onAction }: { online: boolean; actionInProgress: string | null; onAction: (a: "power-on" | "shutdown/graceful" | "shutdown/forced") => void }) {
  if (online) {
    return (
      <div className="space-y-2">
        <button onClick={() => onAction("shutdown/graceful")} disabled={!!actionInProgress} className="w-full rounded-lg bg-[#5dcff5] px-3 py-2.5 text-sm font-semibold text-[#0b0e11] disabled:opacity-50">{actionInProgress === "shutdown/graceful" ? "Shutting down…" : "Shutdown"}</button>
        <button onClick={() => onAction("shutdown/forced")} disabled={!!actionInProgress} className="w-full rounded-lg border border-[#f26d70] px-3 py-2.5 text-sm font-medium text-[#f26d70] hover:bg-[#2a171b] disabled:opacity-50">{actionInProgress === "shutdown/forced" ? "Cutting power…" : "Cut power"}</button>
      </div>
    );
  }
  return (
    <button onClick={() => onAction("power-on")} disabled={!!actionInProgress} className="w-full rounded-lg bg-[#54d88b] px-3 py-2.5 text-sm font-semibold text-[#0b0e11] disabled:opacity-50">{actionInProgress === "power-on" ? "Booting…" : "Boot PC"}</button>
  );
}

function SessionRow({ session, onOpen, onTerminate }: { session: SessionSummary; onOpen: () => void; onTerminate: () => void }) {
  const code = (session.services ?? []).find((service) => service.service_type === "CODE_SERVER");
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium">Session <span className="font-mono text-sm text-[#5dcff5]">{session.session_id.slice(0, 8)}</span></p>
        <p className="mt-1 text-xs text-[#9aa9b5]">Started {session.started_at ? new Date(session.started_at).toLocaleString() : "Just now"}{code && ` · code-server ${code.status.toLowerCase()}`}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button onClick={onOpen} className="rounded-lg border border-[#2a343e] px-3 py-2 text-xs font-medium hover:border-[#5dcff5]">Open</button>
        <button onClick={onTerminate} className="rounded-lg px-3 py-2 text-xs text-[#f26d70] hover:bg-[#2a171b]">Terminate</button>
      </div>
    </div>
  );
}
