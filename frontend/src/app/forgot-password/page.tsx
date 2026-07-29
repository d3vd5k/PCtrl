"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0e11] px-5 text-[#eef3f7]">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-[-0.04em]">Reset Password</h1>
          <p className="mt-4 text-sm leading-6 text-[#9aa9b5]">If an account with that email exists, a reset link has been sent.</p>
          <button onClick={() => router.push("/login")} className="mt-6 text-sm text-[#5dcff5] hover:text-[#eef3f7]">Back to sign in</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0e11] px-5 py-10 text-[#eef3f7]">
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-[-0.04em]">Reset Password</h1>
        <p className="mt-1 text-sm text-[#9aa9b5]">We&rsquo;ll send a reset link to your email.</p>
        <label className="mt-6 block">
          <span className="mb-1.5 block text-xs font-medium text-[#9aa9b5]">Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-[#2a343e] bg-[#13181d] px-3 py-2.5 text-sm outline-none focus:border-[#5dcff5]" />
        </label>
        <button type="submit" disabled={loading} className="mt-6 w-full rounded-lg bg-[#5dcff5] px-3 py-2.5 text-sm font-semibold text-[#0b0e11] disabled:opacity-50">{loading ? "…" : "Send reset link"}</button>
        <button type="button" onClick={() => router.push("/login")} className="mt-6 w-full text-center text-sm text-[#9aa9b5] hover:text-[#eef3f7]">Back to sign in</button>
      </form>
    </div>
  );
}
