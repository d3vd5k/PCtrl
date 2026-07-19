"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api_fetch } from "@/lib/api";

interface SessionService {
  service_id: string;
  service_type: string;
  port: number;
  password: string;
  status: string;
  url:string;
}

interface SessionData {
  session_id: string;
  status: string;
  services: SessionService[];
}

export default function SessionPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [session, setSession] = useState<SessionData | null>(null);
    // const [codeServerUrl, setCodeServerUrl] = useState<string | null>(null);
    const [loggingIn, setLoggingIn] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [launching, setLaunching] = useState(false);
    const [proxiedPath, setProxiedPath] = useState<string | null>(null);
    // const [origin, setOrigin] = useState("");

    const formRef = useRef<HTMLFormElement>(null);
    const iframeName = `cs-frame-${id}`;

    const AUTO_LOGIN_ENABLED = true;

    // 1. Wrap the shared fetching logic in useCallback
    const fetchSession = useCallback(async () => {
        try {
        const data = await api_fetch(`/api/sessions/${id}`);
        setSession(data);
        const cs = data.services.find(
            (s: SessionService) => s.service_type === "CODE_SERVER" && s.status === "RUNNING"
        );
        if (cs) {
             setProxiedPath(`/proxy/session/${id}/`);
        }
        } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load session.");
        }
    }, [id]); // Add 'id' as a dependency

    // 2. Safely call the async function inside the effect
    useEffect(() => {
        // Wrapping in an async IIFE or inner function clarifies to the linter 
        // that this execution flow is safely asynchronous
        const loadData = async () => {
        await fetchSession();
        };
        
        loadData();
    }, [fetchSession]);

    useEffect(() => {
        if (AUTO_LOGIN_ENABLED && proxiedPath && formRef.current) {
            formRef.current.submit();
        }
    }, [proxiedPath, AUTO_LOGIN_ENABLED]);
    // useEffect(() => {
    //     setOrigin(window.location.origin);
    // }, []);

    async function handleLaunchCodeServer() {
        setLaunching(true);
        setError(null);
        try {
        await api_fetch(`/api/sessions/${id}/code-server`, { method: "POST" });
        await fetchSession(); // Can still be reused here cleanly
        } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to launch code-server.");
        } finally {
        setLaunching(false);
        }
    }

    async function handleTerminate() {
        if (!confirm("Terminate this session? All running services will be stopped.")) return;
        await api_fetch(`/api/sessions/${id}/terminate`, { method: "POST" });
        router.push("/dashboard");
    }

    const runningCodeServer = session?.services.find(
        (s) => s.service_type === "CODE_SERVER" && s.status === "RUNNING"
    );

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100">
        <div className="flex items-center justify-between border-b border-neutral-800 p-4">
            <button onClick={() => router.push("/dashboard")} className="text-sm text-neutral-400 hover:text-neutral-100">
            ← Dashboard
            </button>
            <button
            onClick={handleTerminate}
            className="rounded border border-red-900 px-3 py-1.5 text-sm text-red-400 hover:bg-red-950/50"
            >
            Terminate Session
            </button>
        </div>

        {error && <div className="p-4 text-sm text-red-400">{error}</div>}

        {!runningCodeServer && (
            <div className="p-8">
            <button
                onClick={handleLaunchCodeServer}
                disabled={launching}
                className="rounded bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-50"
            >
                {launching ? "Launching..." : "Launch Code-Server"}
            </button>
            </div>
        )}

        {runningCodeServer && proxiedPath && (
        <div className="relative h-[calc(100vh-65px)]">
            {loggingIn && AUTO_LOGIN_ENABLED && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-950">
                <p className="text-neutral-400">Connecting to your session...</p>
            </div>
            )}

            {AUTO_LOGIN_ENABLED && (
            <form
                ref={formRef}
                action={`${proxiedPath}login`}
                method="POST"
                target={iframeName}
                style={{ display: "none" }}
            >
                <input type="hidden" name="base" value="" />
                <input type="hidden" name="href" value={`${window.location.origin}${proxiedPath}`} />
                <input type="hidden" name="password" value={runningCodeServer.password} />
            </form>
            )}

            <iframe
            name={iframeName}
            src={AUTO_LOGIN_ENABLED ? undefined : proxiedPath}
            className="h-full w-full border-0"
            onLoad={() => setLoggingIn(false)}
            />
        </div>
        )}
        </div>
    );
}