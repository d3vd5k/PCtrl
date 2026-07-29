"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, newPassword: password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed.");
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return <div className="flex min-h-screen items-center justify-center bg-[#0b0e11] px-5 text-sm text-[#9aa9b5]">Missing reset token.</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0e11] px-5 py-10 text-[#eef3f7]">
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-[-0.04em]">Set New Password</h1>
        <p className="mt-1 text-sm text-[#9aa9b5]">Choose a new password for your account.</p>
        <label className="mt-6 block">
          <span className="mb-1.5 block text-xs font-medium text-[#9aa9b5]">New password</span>
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-[#2a343e] bg-[#13181d] px-3 py-2.5 text-sm outline-none focus:border-[#5dcff5]" />
        </label>
        {error && <p className="mt-4 text-sm text-[#f26d70]">{error}</p>}
        <button type="submit" disabled={loading} className="mt-6 w-full rounded-lg bg-[#5dcff5] px-3 py-2.5 text-sm font-semibold text-[#0b0e11] disabled:opacity-50">{loading ? "…" : "Update password"}</button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<div className="grid min-h-screen place-items-center bg-[#0b0e11] text-sm text-[#9aa9b5]">Loading…</div>}><ResetPasswordContent /></Suspense>;
}
