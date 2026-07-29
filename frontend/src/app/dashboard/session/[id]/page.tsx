"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell, Loading, type UserInfo } from "@/components/app-shell";
import { api_fetch } from "@/lib/api";

interface SessionService { service_id: string; service_type: string; port: number; password: string; status: string; url: string; }
interface SessionData { session_id: string; status: string; services?: SessionService[]; }
interface TerminalEntry { command: string; stdout: string; stderr: string; code: number; }

interface StyleState {
  color?: string;
  backgroundColor?: string;
  bold?: boolean;
  dim?: boolean;
  underline?: boolean;
}

interface AnsiSegment {
  text: string;
  style: StyleState;
}

function get256Color(index: number): string {
  if (index < 16) {
    const palette = [
      "#000000", "#f26d70", "#54d88b", "#f7bc4d", "#5dcff5", "#c084fc", "#38bdf8", "#eef3f7",
      "#66737f", "#ff6b6b", "#4ade80", "#facc15", "#60a5fa", "#e879f9", "#22d3ee", "#ffffff"
    ];
    return palette[index];
  }
  if (index >= 16 && index <= 231) {
    const i = index - 16;
    const r = Math.floor(i / 36) * 51;
    const g = Math.floor((i % 36) / 6) * 51;
    const b = (i % 6) * 51;
    return `rgb(${r},${g},${b})`;
  }
  if (index >= 232 && index <= 255) {
    const v = 8 + (index - 232) * 10;
    return `rgb(${v},${v},${v})`;
  }
  return "inherit";
}

function parseAnsiToSegments(input: string): AnsiSegment[] {
  const regex = /\x1b\[([0-9;]*)([a-zA-Z])/g;
  const segments: AnsiSegment[] = [];
  let lastIndex = 0;
  let currentStyle: StyleState = {};

  let match: RegExpExecArray | null;
  while ((match = regex.exec(input)) !== null) {
    const textBefore = input.slice(lastIndex, match.index);
    if (textBefore) {
      segments.push({ text: textBefore, style: { ...currentStyle } });
    }
    lastIndex = regex.lastIndex;

    const [_, paramsStr, command] = match;
    if (command === "m") {
      const codes = paramsStr ? paramsStr.split(";").map((s) => parseInt(s, 10) || 0) : [0];
      let i = 0;
      while (i < codes.length) {
        const code = codes[i];
        if (code === 0) {
          currentStyle = {};
        } else if (code === 1) {
          currentStyle.bold = true;
        } else if (code === 2) {
          currentStyle.dim = true;
        } else if (code === 4) {
          currentStyle.underline = true;
        } else if (code === 22) {
          currentStyle.bold = false;
          currentStyle.dim = false;
        } else if (code === 24) {
          currentStyle.underline = false;
        } else if (code === 39) {
          delete currentStyle.color;
        } else if (code === 49) {
          delete currentStyle.backgroundColor;
        } else if (code >= 30 && code <= 37) {
          currentStyle.color = get256Color(code - 30);
        } else if (code >= 90 && code <= 97) {
          currentStyle.color = get256Color(code - 90 + 8);
        } else if (code >= 40 && code <= 47) {
          currentStyle.backgroundColor = get256Color(code - 40);
        } else if (code >= 100 && code <= 107) {
          currentStyle.backgroundColor = get256Color(code - 100 + 8);
        } else if (code === 38 || code === 48) {
          const isBg = code === 48;
          if (codes[i + 1] === 5 && codes[i + 2] !== undefined) {
            const colorVal = get256Color(codes[i + 2]);
            if (isBg) currentStyle.backgroundColor = colorVal;
            else currentStyle.color = colorVal;
            i += 2;
          } else if (codes[i + 1] === 2 && codes[i + 2] !== undefined && codes[i + 3] !== undefined && codes[i + 4] !== undefined) {
            const colorVal = `rgb(${codes[i + 2]},${codes[i + 3]},${codes[i + 4]})`;
            if (isBg) currentStyle.backgroundColor = colorVal;
            else currentStyle.color = colorVal;
            i += 4;
          }
        }
        i++;
      }
    }
  }

  const remaining = input.slice(lastIndex);
  if (remaining) {
    segments.push({ text: remaining, style: { ...currentStyle } });
  }

  return segments;
}

function AnsiOutput({ text, defaultColor }: { text: string; defaultColor?: string }) {
  const segments = parseAnsiToSegments(text);
  return (
    <pre className="mt-1 whitespace-pre-wrap font-mono text-xs sm:text-sm leading-relaxed">
      {segments.map((seg, idx) => (
        <span
          key={idx}
          style={{
            color: seg.style.color || defaultColor || "inherit",
            backgroundColor: seg.style.backgroundColor,
            fontWeight: seg.style.bold ? "bold" : "normal",
            opacity: seg.style.dim ? 0.7 : 1,
            textDecoration: seg.style.underline ? "underline" : "none",
          }}
        >
          {seg.text}
        </span>
      ))}
    </pre>
  );
}

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [command, setCommand] = useState("");
  const [runningCommand, setRunningCommand] = useState(false);
  const [history, setHistory] = useState<TerminalEntry[]>([]);
  const [commandList, setCommandList] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const terminalBoxRef = useRef<HTMLDivElement>(null);

  const fetchSession = useCallback(async () => {
    try { const data = await api_fetch(`/api/sessions/${id}`); setSession(data); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load session."); }
  }, [id]);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const me = await api_fetch("/api/auth/me");
        if (isMounted) setUser(me);
        await fetchSession();
      } catch {
        if (isMounted) router.push("/login");
      }
    }
    void init();
    return () => { isMounted = false; };
  }, [fetchSession, router]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, runningCommand]);

  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => void fetchSession(), 5_000);
    return () => clearInterval(interval);
  }, [session, fetchSession]);

  const runningCodeServer = (session?.services ?? []).find((service) => service.service_type === "CODE_SERVER" && service.status === "RUNNING");

  async function launchCodeServer() {
    setLaunching(true); setError(null);
    try {
      const res = await api_fetch(`/api/sessions/${id}/code-server`, { method: "POST" });
      if (res && res.service_id) {
        setSession((prev) => prev ? {
          ...prev,
          services: [...(prev.services ?? []).filter(s => s.service_type !== "CODE_SERVER"), res]
        } : null);
      }
      await fetchSession();
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to launch code-server."); }
    finally { setLaunching(false); }
  }

  async function terminateSession() {
    if (!confirm("Terminate this session? Running services will be stopped.")) return;
    setSession((prev) => prev ? { ...prev, status: "TERMINATED" } : null);
    await api_fetch(`/api/sessions/${id}/terminate`, { method: "POST" });
    router.push("/dashboard");
  }

  async function executeCommand(event: React.FormEvent) {
    event.preventDefault();
    const requested = command.trim();
    if (!requested || runningCommand) return;

    if (requested.toLowerCase() === "clear") {
      setHistory([]);
      setCommand("");
      setHistoryIndex(-1);
      return;
    }

    if (requested.toLowerCase() === "help") {
      setHistory((prev) => [
        ...prev,
        {
          command: requested,
          stdout: "PCtrl Shell Helpers:\n  clear     Clear terminal screen\n  whoami    Display effective session username\n  pwd       Print working directory\n  ls -la    List directory contents",
          stderr: "",
          code: 0,
        },
      ]);
      setCommandList((prev) => [...prev, requested]);
      setCommand("");
      setHistoryIndex(-1);
      return;
    }

    setRunningCommand(true);
    setError(null);
    try {
      const result = await api_fetch(`/api/sessions/${id}/terminal`, {
        method: "POST",
        body: JSON.stringify({ command: requested }),
      });
      setHistory((entries) => [...entries, { command: requested, ...result }]);
      setCommandList((prev) => [...prev, requested]);
      setCommand("");
      setHistoryIndex(-1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Command failed.");
    } finally {
      setRunningCommand(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandList.length === 0) return;
      const nextIndex = historyIndex < commandList.length - 1 ? historyIndex + 1 : historyIndex;
      setHistoryIndex(nextIndex);
      setCommand(commandList[commandList.length - 1 - nextIndex] ?? "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setCommand(commandList[commandList.length - 1 - nextIndex] ?? "");
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand("");
      }
    } else if (e.ctrlKey && e.key.toLowerCase() === "l") {
      e.preventDefault();
      setHistory([]);
    }
  }

  if (!user) return <Loading label="Opening session…" />;

  const promptUser = process.env.NEXT_PUBLIC_TARGET_PC_SSH_USER || "pctrl-svc";

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-semibold tracking-[-0.04em]">
            Session <span className="font-mono text-base text-[#5dcff5]">{id.slice(0, 8)}</span>
          </h1>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-[#54d88b]">● {session?.status ?? "…"}</span>
            <button
              onClick={terminateSession}
              className="rounded-lg border border-[#f26d70] px-3 py-1.5 text-xs font-medium text-[#f26d70] hover:bg-[#2a171b]"
            >
              Terminate
            </button>
          </div>
        </div>

        {error && <div className="mt-4 border border-[#f26d70] bg-[#2a171b] px-4 py-3 text-sm text-[#f26d70]">{error}</div>}

        <div className="mt-6">
          {/* Terminal Window Header */}
          <div className="flex items-center justify-between rounded-t-xl border border-[#2a343e] bg-[#13181d] px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#f26d70]/80" />
              <span className="h-3 w-3 rounded-full bg-[#f7bc4d]/80" />
              <span className="h-3 w-3 rounded-full bg-[#54d88b]/80" />
              <span className="ml-2 font-mono text-xs text-[#9aa9b5]">{promptUser}@pctrl:~ (bash)</span>
            </div>
            <span className="font-mono text-[10px] text-[#9aa9b5]">SSH SHELL / 30S LIMIT</span>
          </div>

          {/* Terminal Window Output & Integrated Inline Prompt */}
          <div
            ref={terminalBoxRef}
            onClick={() => inputRef.current?.focus()}
            className="h-[420px] cursor-text overflow-y-auto rounded-b-xl border-x border-b border-[#2a343e] bg-[#06080a] p-4 font-mono text-sm leading-6 selection:bg-[#5dcff5] selection:text-[#0b0e11]"
          >
            <p className="text-xs text-[#66737f]">
              PCtrl Remote Shell v1.0 [Session {id.slice(0, 8)}]
            </p>
            <p className="text-xs text-[#66737f]">
              Type commands to execute. Use &apos;clear&apos; or Ctrl+L to clear screen. Up/Down arrows for history.
            </p>
            <div className="my-2 border-b border-[#1a2128]" />

            {history.map((entry, index) => (
              <div key={`${entry.command}-${index}`} className="mt-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#54d88b]">{promptUser}@pctrl</span>
                  <span className="text-[#9aa9b5]">:</span>
                  <span className="text-[#5dcff5]">~</span>
                  <span className="text-[#eef3f7]">$</span>
                  <span className="ml-1 text-[#eef3f7] font-semibold">{entry.command}</span>
                </div>
                {entry.stdout && <AnsiOutput text={entry.stdout} defaultColor="#eef3f7" />}
                {entry.stderr && <AnsiOutput text={entry.stderr} defaultColor="#f7bc4d" />}
                {entry.code !== 0 && (
                  <p className="mt-0.5 text-xs text-[#f26d70]">process exited with code {entry.code}</p>
                )}
              </div>
            ))}

            {/* Active Inline Interactive Prompt Line */}
            <form onSubmit={executeCommand} className="mt-3 flex items-center gap-1.5">
              <span className="text-[#54d88b]">{promptUser}@pctrl</span>
              <span className="text-[#9aa9b5]">:</span>
              <span className="text-[#5dcff5]">~</span>
              <span className="text-[#eef3f7]">$</span>
              <input
                ref={inputRef}
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={runningCommand}
                autoFocus
                autoComplete="off"
                spellCheck={false}
                placeholder={runningCommand ? "executing…" : ""}
                className="ml-1 flex-1 bg-transparent font-mono text-sm text-[#eef3f7] outline-none placeholder:text-[#66737f]"
              />
            </form>
            <div ref={terminalEndRef} />
          </div>
        </div>

        <div className="mt-8 border-t border-[#2a343e] pt-5">
          {runningCodeServer ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">
                  Code-server <span className="font-mono text-xs text-[#54d88b]">running</span>
                </p>
                <p className="mt-0.5 text-xs text-[#9aa9b5]">Open the editor in a dedicated view.</p>
              </div>
              <button
                onClick={() => router.push(`/dashboard/session/${id}/code-server`)}
                className="rounded-lg bg-[#5dcff5] px-4 py-2 text-sm font-semibold text-[#0b0e11]"
              >
                Open code-server
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Code-server</p>
                <p className="mt-0.5 text-xs text-[#9aa9b5]">Start a dedicated editor for this session.</p>
              </div>
              <button
                onClick={launchCodeServer}
                disabled={launching}
                className="rounded-lg bg-[#5dcff5] px-4 py-2 text-sm font-semibold text-[#0b0e11] disabled:opacity-50"
              >
                {launching ? "Launching…" : "Launch code-server"}
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
