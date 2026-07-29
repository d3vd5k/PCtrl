"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell, Loading, type UserInfo } from "@/components/app-shell";
import { api_fetch } from "@/lib/api";

interface SunshineStatus {
  running: boolean;
  pid: number | null;
  started_at: string | null;
}

interface NamedCert {
  enabled: boolean;
  name: string;
  uuid: string;
}

export default function SunshinePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [status, setStatus] = useState<SunshineStatus | null>(null);
  const [clients, setClients] = useState<NamedCert[]>([]);
  const [pin, setPin] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [statusResult, clientResult] = await Promise.allSettled([
      api_fetch("/api/sunshine/status"),
      api_fetch("/api/sunshine/clients"),
    ]);
    if (statusResult.status === "fulfilled") setStatus(statusResult.value);
    if (clientResult.status === "fulfilled") setClients(clientResult.value.named_certs ?? []);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const me = await api_fetch("/api/auth/me");
        if (me.role !== "ADMIN" && me.role !== "ROOT") {
          router.push("/dashboard");
          return;
        }
        setUser(me);
        await refresh();
      } catch {
        router.push("/login");
      }
    })();
  }, [refresh, router]);

  async function action(name: "start" | "stop") {
    setBusy(name);
    setError(null);
    const targetRunning = name === "start";
    setStatus((prev) => (prev ? { ...prev, running: targetRunning } : { running: targetRunning, pid: null, started_at: null }));
    try {
      await api_fetch(`/api/sunshine/${name}`, { method: "POST" });
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Unable to ${name} Sunshine.`);
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  async function pair(event: React.FormEvent) {
    event.preventDefault();
    setBusy("pair");
    setError(null);
    try {
      const res = await api_fetch("/api/sunshine/pair", {
        method: "POST",
        body: JSON.stringify({ pin, name: deviceName }),
      });
      setPin("");
      setDeviceName("");
      if (res && res.named_certs) {
        setClients(res.named_certs);
      }
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Pairing failed.");
    } finally {
      setBusy(null);
    }
  }

  async function unpair(uuid: string) {
    if (!confirm("Unpair this device? It must be paired again to stream.")) return;
    setBusy(uuid);
    setClients((prev) => prev.filter((c) => c.uuid !== uuid));
    try {
      await api_fetch("/api/sunshine/clients/unpair", {
        method: "POST",
        body: JSON.stringify({ uuid }),
      });
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to unpair client.");
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  if (!user) return <Loading label="Loading streaming control…" />;

  const isRunning = status?.running ?? false;

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-10">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">Sunshine</h1>
            <p className="mt-1 text-sm text-[#9aa9b5]">
              Host access and Moonlight client pairing.
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <StatusDot active={isRunning} />
            <span className="text-[#9aa9b5]">HOST</span>
            <span>{isRunning ? `RUNNING / PID ${status?.pid}` : "STOPPED"}</span>
          </div>
        </section>

        {error && (
          <div className="mt-6 border border-[#f26d70] bg-[#2a171b] px-4 py-3 text-sm text-[#f26d70]">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
          <section className="rounded-xl border border-[#2a343e] bg-[#13181d] p-6">
            <p className="instrument-rule text-[10px]">HOST STATE</p>
            <p className="mt-4 text-xl font-semibold">
              {isRunning ? "Ready for clients" : "Host is offline"}
            </p>
            <p className="mt-2 text-sm leading-6 text-[#9aa9b5]">
              {isRunning
                ? "Paired devices can discover and connect to this host."
                : "Start Sunshine before pairing or connecting a client."}
            </p>
            <button
              onClick={() => action(isRunning ? "stop" : "start")}
              disabled={!!busy}
              className={`mt-6 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
                isRunning
                  ? "border border-[#f26d70] text-[#f26d70] hover:bg-[#2a171b]"
                  : "bg-[#5dcff5] text-[#0b0e11]"
              }`}
            >
              {busy === "start"
                ? "Starting…"
                : busy === "stop"
                ? "Stopping…"
                : isRunning
                ? "Stop host"
                : "Start host"}
            </button>
          </section>

          <form onSubmit={pair} className="rounded-xl border border-[#2a343e] bg-[#13181d] p-6">
            <p className="instrument-rule text-[10px]">PAIR NEW DEVICE</p>
            <p className="mt-2 text-sm text-[#9aa9b5]">
              Enter the device name and PIN shown in Moonlight.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_120px]">
              <input
                value={deviceName}
                onChange={(event) => setDeviceName(event.target.value)}
                placeholder="Device name"
                required
                className="rounded-lg border border-[#2a343e] bg-[#0b0e11] px-3 py-2.5 text-sm outline-none focus:border-[#5dcff5]"
              />
              <input
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                placeholder="PIN"
                required
                className="rounded-lg border border-[#2a343e] bg-[#0b0e11] px-3 py-2.5 font-mono text-sm outline-none focus:border-[#5dcff5]"
              />
            </div>
            <button
              disabled={!!busy}
              className="mt-4 rounded-lg bg-[#5dcff5] px-4 py-2.5 text-sm font-semibold text-[#0b0e11] disabled:opacity-50"
            >
              {busy === "pair" ? "Pairing…" : "Pair device"}
            </button>
          </form>
        </div>

        <section className="mt-10">
          <div className="flex items-end justify-between border-b border-[#2a343e] pb-3">
            <h2 className="text-lg font-semibold">
              Paired devices <span className="font-mono text-sm text-[#9aa9b5]">[{clients.length}]</span>
            </h2>
          </div>
          <div className="divide-y divide-[#2a343e] border-b border-[#2a343e]">
            {clients.length === 0 ? (
              <div className="py-10 text-center text-sm text-[#9aa9b5]">
                No devices have been paired yet.
              </div>
            ) : (
              clients.map((client) => (
                <div key={client.uuid} className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <p className="font-medium">{client.name}</p>
                    <p className="mt-1 font-mono text-xs text-[#9aa9b5]">
                      {client.uuid.slice(0, 12)}… / {client.enabled ? "ENABLED" : "DISABLED"}
                    </p>
                  </div>
                  <button
                    onClick={() => unpair(client.uuid)}
                    disabled={!!busy}
                    className="rounded-lg px-3 py-2 text-xs text-[#f26d70] hover:bg-[#2a171b] disabled:opacity-50"
                  >
                    {busy === client.uuid ? "Removing…" : "Unpair"}
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return <span className={`h-2.5 w-2.5 rounded-full ${active ? "bg-[#54d88b]" : "bg-[#66737f]"}`} />;
}
