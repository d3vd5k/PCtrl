"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api_fetch } from "@/lib/api";
import { Loading } from "@/components/app-shell";

interface SessionService { service_id: string; service_type: string; port: number; password: string; status: string; url: string; }
interface SessionData { session_id: string; status: string; services?: SessionService[]; }

export default function CodeServerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loggingIn, setLoggingIn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const iframeName = `cs-frame-${id}`;

  const fetchSession = useCallback(async () => {
    try { const data = await api_fetch(`/api/sessions/${id}`); setSession(data); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load session."); }
  }, [id]);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const me = await api_fetch("/api/auth/me");
        if (!isMounted) return;
        if (!me) { router.push("/login"); return; }
        await fetchSession();
      } catch {
        if (isMounted) router.push("/login");
      }
    }
    void init();
    const interval = setInterval(() => void fetchSession(), 5_000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [fetchSession, router]);

  const runningCodeServer = (session?.services ?? []).find((service) => service.service_type === "CODE_SERVER" && service.status === "RUNNING");
  const proxiedPath = runningCodeServer ? `/proxy/session/${id}/` : null;

  useEffect(() => {
    if (proxiedPath && formRef.current) {
      formRef.current.submit();
    }
  }, [proxiedPath]);

  async function closeCodeServer() {
    if (!confirm("Terminate this session? Code-server will be stopped.")) return;
    await api_fetch(`/api/sessions/${id}/terminate`, { method: "POST" });
    router.push(`/dashboard/session/${id}`);
  }

  return (
    <div className="flex h-screen flex-col bg-[#0b0e11] text-[#eef3f7]">
      <header className="flex items-center justify-between gap-3 border-b border-[#2a343e] px-5 py-2.5">
        <button
          onClick={() => router.push(`/dashboard/session/${id}`)}
          className="rounded-lg border border-[#2a343e] px-3 py-1.5 text-xs font-medium transition hover:border-[#5dcff5]"
        >
          ← Back to terminal
        </button>
        <button
          onClick={closeCodeServer}
          className="rounded-lg border border-[#f26d70] px-3 py-1.5 text-xs font-medium text-[#f26d70] transition hover:bg-[#2a171b]"
        >
          Terminate
        </button>
      </header>

      <div className="min-w-0 flex-1">
        {error && <div className="border-b border-[#f26d70] bg-[#2a171b] px-4 py-2 text-sm text-[#f26d70]">{error}</div>}
        {!session ? (
          <Loading label="Connecting to code-server…" />
        ) : runningCodeServer ? (
          <div className="relative h-full bg-[#0b0e11]">
            {loggingIn && <div className="absolute inset-0 z-10 grid place-items-center bg-[#0b0e11] font-mono text-sm text-[#9aa9b5]">CONNECTING TO WORKSPACE…</div>}
            <form ref={formRef} action={`${proxiedPath}login`} method="POST" target={iframeName} className="hidden">
              <input type="hidden" name="base" value=""/>
              <input type="hidden" name="href" value={`${typeof window !== "undefined" ? window.location.origin : ""}${proxiedPath}`}/>
              <input type="hidden" name="password" value={runningCodeServer.password}/>
            </form>
            <iframe name={iframeName} className="h-full w-full border-0" onLoad={() => setLoggingIn(false)}/>
          </div>
        ) : (
          <div className="grid h-full place-items-center font-mono text-sm text-[#9aa9b5]">Starting code-server…</div>
        )}
      </div>
    </div>
  );
}
