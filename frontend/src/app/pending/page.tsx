"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "@/components/app-shell";

const MESSAGES: Record<string, string> = {
  PENDING: "Your access request is awaiting admin approval.",
  SUSPENDED: "Your access has been suspended. Contact an admin for details.",
  REJECTED: "Your access request was not approved.",
};

const STATUS_BADGES: Record<string, { label: string; style: string }> = {
  PENDING: { label: "PENDING APPROVAL", style: "border-[#f7bc4d]/40 bg-[#f7bc4d]/10 text-[#f7bc4d]" },
  SUSPENDED: { label: "SUSPENDED", style: "border-[#f7bc4d]/40 bg-[#f7bc4d]/10 text-[#f7bc4d]" },
  REJECTED: { label: "REJECTED", style: "border-[#f26d70]/40 bg-[#f26d70]/10 text-[#f26d70]" },
};

function PendingContent() {
  const params = useSearchParams();
  const status = params.get("status") ?? "";
  const badge = STATUS_BADGES[status] ?? {
    label: "ACCESS DENIED",
    style: "border-[#f26d70]/40 bg-[#f26d70]/10 text-[#f26d70]",
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0e11] px-5 py-10 text-[#eef3f7]">
      <div className="w-full max-w-sm rounded-xl border border-[#2a343e] bg-[#13181d] p-8 text-center shadow-[0_18px_50px_rgba(0,0,0,.35)]">
        <h1 className="text-2xl font-semibold tracking-[-0.04em]">PCtrl</h1>
        <p className="instrument-rule mt-1 text-[10px]">ACCOUNT STATUS</p>

        <div className="mt-6 flex justify-center">
          <span
            className={`inline-block rounded-md border px-3 py-1 font-mono text-xs font-medium tracking-wide ${badge.style}`}
          >
            {badge.label}
          </span>
        </div>

        <p className="mt-4 text-sm leading-6 text-[#9aa9b5]">
          {MESSAGES[status] ?? "Unable to authenticate account access."}
        </p>
      </div>
    </div>
  );
}

export default function PendingPage() {
  return (
    <Suspense fallback={<Loading label="Loading account status…" />}>
      <PendingContent />
    </Suspense>
  );
}
