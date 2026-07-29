"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AppShell, Loading, type UserInfo } from "@/components/app-shell";
import { api_fetch } from "@/lib/api";

interface AdminUser {
  user_id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN" | "ROOT";
  access: "PENDING" | "GRANTED" | "SUSPENDED" | "REJECTED";
  created_at: string;
}

function canManage(actorRole: string, targetRole: string): boolean {
  if (targetRole === "ROOT") return false;
  if (actorRole === "ROOT") return true;
  if (actorRole === "ADMIN") return targetRole === "USER";
  return false;
}

const ACCESS_STYLES: Record<string, string> = {
  PENDING: "text-[#f7bc4d]",
  GRANTED: "text-[#54d88b]",
  SUSPENDED: "text-[#f7bc4d]",
  REJECTED: "text-[#f26d70]",
};

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [actorRole, setActorRole] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try { setUsers(await api_fetch("/api/admin/users")); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to load users."); }
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const me = await api_fetch("/api/auth/me");
        if (!isMounted) return;
        if (me.role !== "ADMIN" && me.role !== "ROOT") { router.push("/dashboard"); return; }
        setUser(me);
        setActorRole(me.role);
        await fetchUsers();
      } catch {
        if (isMounted) router.push("/login");
      }
    }
    void init();
    return () => { isMounted = false; };
  }, [fetchUsers, router]);

  async function handleAction(userId: string, action: "approve" | "reject" | "suspend" | "delete") {
    setActionInProgress(`${userId}-${action}`); setError(null);
    try {
      if (action === "delete") {
        if (!confirm("Permanently delete this user? This cannot be undone.")) { setActionInProgress(null); return; }
        setUsers((prev) => prev.filter((u) => u.user_id !== userId));
        await api_fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      } else {
        const accessMap: Record<string, "GRANTED" | "REJECTED" | "SUSPENDED"> = {
          approve: "GRANTED",
          reject: "REJECTED",
          suspend: "SUSPENDED",
        };
        const newAccess = accessMap[action];
        if (newAccess) {
          setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, access: newAccess } : u));
        }
        await api_fetch(`/api/admin/users/${userId}/${action}`, { method: "POST" });
      }
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
      await fetchUsers();
    } finally {
      setActionInProgress(null);
    }
  }

  async function handleClearLock() {
    if (!confirm("Force-clear the PC operation lock? Only do this if you're sure nothing is actually in progress.")) return;
    try { await api_fetch("/api/admin/pc-lock/reset", { method: "POST" }); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to clear lock."); }
  }
  async function handleClearCooldown() {
    try { await api_fetch("/api/admin/pc-lock/reset-cooldown", { method: "POST" }); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to clear cooldown."); }
  }

  if (!user) return <Loading label="Loading…" />;

  const pendingUsers = users.filter((u) => u.access === "PENDING");
  const activeUsers = users.filter((u) => u.access !== "PENDING");

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <h1 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">Admin</h1>
        <p className="mt-1 text-sm text-[#9aa9b5]">Manage user access requests and operations locks.</p>

        {error && <div className="mt-6 border border-[#f26d70] bg-[#2a171b] px-4 py-3 text-sm text-[#f26d70]">{error}</div>}

        {/* Section 1: Pending Access Request Cards (Above User List) */}
        {pendingUsers.length > 0 && (
          <section className="mt-8">
            <div className="flex items-center justify-between border-b border-[#2a343e] pb-3">
              <h2 className="text-lg font-semibold">
                Access Requests <span className="font-mono text-sm text-[#f7bc4d]">[{pendingUsers.length}]</span>
              </h2>
              <span className="instrument-rule text-[10px]">AWAITING APPROVAL</span>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pendingUsers.map((u) => {
                const manageable = actorRole && canManage(actorRole, u.role);
                const busyPrefix = `${u.user_id}-`;
                return (
                  <div key={u.user_id} className="flex flex-col justify-between rounded-xl border border-[#f7bc4d]/40 bg-[#13181d] p-5 shadow-sm">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-[#eef3f7]">{u.name}</p>
                        <span className="rounded bg-[#f7bc4d]/10 px-2 py-0.5 font-mono text-[10px] font-medium text-[#f7bc4d]">PENDING</span>
                      </div>
                      <p className="mt-1 text-xs text-[#9aa9b5]">{u.email}</p>
                      <p className="mt-3 font-mono text-[10px] text-[#9aa9b5]">ROLE: {u.role}</p>
                    </div>
                    <div className="mt-5 flex gap-2 border-t border-[#2a343e] pt-3">
                      {manageable ? (
                        <>
                          <button
                            onClick={() => handleAction(u.user_id, "approve")}
                            disabled={actionInProgress === busyPrefix + "approve"}
                            className="flex-1 rounded-lg bg-[#5dcff5] py-2 text-xs font-semibold text-[#0b0e11] transition hover:opacity-90 disabled:opacity-50"
                          >
                            {actionInProgress === busyPrefix + "approve" ? "…" : "Approve"}
                          </button>
                          <button
                            onClick={() => handleAction(u.user_id, "reject")}
                            disabled={actionInProgress === busyPrefix + "reject"}
                            className="flex-1 rounded-lg border border-[#f26d70] py-2 text-xs font-medium text-[#f26d70] transition hover:bg-[#2a171b] disabled:opacity-50"
                          >
                            {actionInProgress === busyPrefix + "reject" ? "…" : "Reject"}
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-[#66737f]">No permission</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Section 2: User Accounts List Table */}
        <section className="mt-8">
          <div className="border-b border-[#2a343e] pb-3">
            <h2 className="text-lg font-semibold">
              User Accounts <span className="font-mono text-sm text-[#9aa9b5]">[{activeUsers.length}]</span>
            </h2>
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-[#2a343e]">
            <table className="w-full text-sm">
              <thead className="border-b border-[#2a343e] text-left text-xs text-[#9aa9b5]">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Access</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a343e]">
                {activeUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-[#9aa9b5]">No user accounts found.</td>
                  </tr>
                ) : (
                  activeUsers.map((u) => {
                    const manageable = actorRole && canManage(actorRole, u.role);
                    const busyPrefix = `${u.user_id}-`;
                    return (
                      <tr key={u.user_id} className="bg-[#0b0e11]">
                        <td className="px-4 py-3 font-medium">{u.name}</td>
                        <td className="px-4 py-3 text-[#9aa9b5]">{u.email}</td>
                        <td className="px-4 py-3 text-[#9aa9b5]">{u.role}</td>
                        <td className={`px-4 py-3 font-medium ${ACCESS_STYLES[u.access]}`}>{u.access}</td>
                        <td className="px-4 py-3">
                          {!manageable ? (
                            <span className="text-xs text-[#66737f]">{u.role === "ROOT" ? "—" : "No permission"}</span>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {u.access === "GRANTED" && (
                                <ActionBtn label="Suspend" busy={actionInProgress === busyPrefix + "suspend"} onClick={() => handleAction(u.user_id, "suspend")} variant="neutral"/>
                              )}
                              {(u.access === "SUSPENDED" || u.access === "REJECTED") && (
                                <ActionBtn label="Reinstate" busy={actionInProgress === busyPrefix + "approve"} onClick={() => handleAction(u.user_id, "approve")} variant="primary"/>
                              )}
                              <ActionBtn label="Delete" busy={actionInProgress === busyPrefix + "delete"} onClick={() => handleAction(u.user_id, "delete")} variant="danger"/>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-6 flex flex-wrap gap-2 border-t border-[#2a343e] pt-5">
          <button onClick={handleClearLock} className="rounded-lg border border-[#f7bc4d] px-3 py-1.5 text-xs text-[#f7bc4d] hover:bg-[#2a171b]">Force-clear stuck lock</button>
          <button onClick={handleClearCooldown} className="rounded-lg border border-[#2a343e] px-3 py-1.5 text-xs text-[#9aa9b5] hover:border-[#5dcff5]">Skip power-on cooldown</button>
        </div>
      </div>
    </AppShell>
  );
}

function ActionBtn({ label, busy, onClick, variant }: { label: string; busy: boolean; onClick: () => void; variant: "primary" | "neutral" | "danger" }) {
  const styles = {
    primary: "border border-[#5dcff5] text-[#5dcff5] hover:bg-[#5dcff5] hover:text-[#0b0e11]",
    neutral: "border border-[#2a343e] text-[#eef3f7] hover:border-[#5dcff5]",
    danger: "border border-[#f26d70] text-[#f26d70] hover:bg-[#2a171b]",
  };
  return <button onClick={onClick} disabled={busy} className={`rounded-lg px-2.5 py-1 text-xs font-medium transition disabled:opacity-50 ${styles[variant]}`}>{busy ? "…" : label}</button>;
}
