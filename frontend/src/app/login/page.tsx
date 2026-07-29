"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "register";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function performLogin(loginEmail: string, loginPassword: string) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: loginEmail, password: loginPassword }),
    });
    const data = await res.json();
    if (res.status === 403 && data.access) {
      router.push(`/pending?status=${data.access}`);
      return;
    }
    if (!res.ok) throw new Error(data.error || "Login failed.");
    router.push("/dashboard");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        await performLogin(email, password);
      } else {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Registration failed.");
        await performLogin(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setMode((m) => (m === "login" ? "register" : "login"));
    setError(null);
    setConfirmPassword("");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0e11] px-5 py-10 text-[#eef3f7]">
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-[-0.04em]">PCtrl</h1>
        <p className="mt-1 text-sm text-[#9aa9b5]">
          {mode === "login" ? "Sign in to your account" : "Request access"}
        </p>

        {mode === "register" && (
          <Field className="mt-6" label="Name">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
            />
          </Field>
        )}
        <Field className="mt-4" label="Email">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field className="mt-4" label="Password">
          <input
            type="password"
            required
            minLength={mode === "register" ? 8 : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
          />
        </Field>
        {mode === "register" && (
          <Field className="mt-4" label="Confirm password">
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputCls}
            />
          </Field>
        )}

        {error && <p className="mt-4 text-sm text-[#f26d70]">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-[#5dcff5] px-3 py-2.5 text-sm font-semibold text-[#0b0e11] disabled:opacity-50"
        >
          {loading ? "…" : mode === "login" ? "Sign in" : "Request access"}
        </button>

        {mode === "login" && (
          <button
            type="button"
            onClick={() => router.push("/forgot-password")}
            className="mt-3 w-full text-center text-xs text-[#9aa9b5] hover:text-[#5dcff5]"
          >
            Forgot password?
          </button>
        )}

        <button
          type="button"
          onClick={switchMode}
          className="mt-6 w-full text-center text-sm text-[#9aa9b5] hover:text-[#eef3f7]"
        >
          {mode === "login"
            ? "Need an account? Request access"
            : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-[#2a343e] bg-[#13181d] px-3 py-2.5 text-sm outline-none focus:border-[#5dcff5]";

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1.5 block text-xs font-medium text-[#9aa9b5]">{label}</span>
      {children}
    </label>
  );
}
