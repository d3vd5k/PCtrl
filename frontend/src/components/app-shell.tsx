"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api_fetch } from "@/lib/api";

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return <div className="grid min-h-[60vh] place-items-center font-mono text-sm text-[#9aa9b5]">{label}</div>;
}

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/sunshine", label: "Sunshine", admin: true },
  { href: "/admin", label: "Admin", admin: true },
];

export function AppShell({ user, children }: { user: UserInfo; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserInfo>(user);
  const [name, setName] = useState(user.name);
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentUser(user);
    setName(user.name);
  }, [user]);

  useEffect(() => {
    if (!profileOpen) return;
    function handleOutsideClick(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [profileOpen]);

  const isAdmin = currentUser.role === "ADMIN" || currentUser.role === "ROOT";
  const initials =
    currentUser.name
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  async function saveProfile() {
    setSaving(true);
    setProfileError(null);
    try {
      const res = await api_fetch("/api/auth/me", { method: "PATCH", body: JSON.stringify({ name }) });
      const updatedName = res?.name ?? name;
      setCurrentUser((prev) => ({ ...prev, name: updatedName }));
      setProfileOpen(false);
      router.refresh();
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    try {
      await api_fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore errors during logout
    } finally {
      router.push("/login");
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0e11] text-[#eef3f7]">
      <header className="sticky top-0 z-40 border-b border-[#2a343e] bg-[#0b0e11]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-3 sm:px-8">
          <div className="flex items-center gap-6">
            <button onClick={() => router.push("/dashboard")} className="text-lg font-semibold tracking-[-0.04em]">PCtrl</button>
            <nav className="flex items-center gap-1 overflow-x-auto">
              {navItems.filter((item) => !item.admin || isAdmin).map((item) => {
                const active = item.href === "/dashboard" ? pathname.startsWith("/dashboard") : pathname === item.href;
                return (
                  <button
                    key={item.label}
                    onClick={() => router.push(item.href)}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-sm transition ${active ? "bg-[#1a2128] text-[#5dcff5]" : "text-[#9aa9b5] hover:bg-[#1a2128] hover:text-[#eef3f7]"}`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div ref={profileRef} className="relative">
              <button onClick={() => setProfileOpen((open) => !open)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[#1a2128]" aria-expanded={profileOpen}>
                <span className="hidden text-right sm:block"><span className="block text-sm font-medium leading-tight">{currentUser.name}</span><span className="block text-xs text-[#9aa9b5]">{currentUser.role}</span></span>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#5dcff5] bg-[#13181d] font-mono text-xs text-[#5dcff5]">{initials}</span>
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-12 z-30 w-80 rounded-xl border border-[#2a343e] bg-[#13181d] p-4 shadow-[0_18px_50px_rgba(0,0,0,.35)]">
                  <p className="instrument-rule text-[10px]">PROFILE</p>
                  <div className="mt-4 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-[#1a2128] font-mono text-sm text-[#5dcff5]">{initials}</span><div><p className="text-sm font-medium">{currentUser.email}</p><p className="mt-0.5 text-xs text-[#9aa9b5]">{currentUser.role} access</p></div></div>
                  <label className="mt-5 block text-xs font-medium text-[#9aa9b5]">Display name</label>
                  <input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-lg border border-[#2a343e] bg-[#0b0e11] px-3 py-2 text-sm outline-none focus:border-[#5dcff5]" />
                  {profileError && <p className="mt-2 text-xs text-[#f26d70]">{profileError}</p>}
                  <button onClick={saveProfile} disabled={saving || !name.trim()} className="mt-4 w-full rounded-lg bg-[#5dcff5] px-3 py-2 text-sm font-semibold text-[#0b0e11] disabled:opacity-50">{saving ? "Saving…" : "Save profile"}</button>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-[#2a343e] px-3 py-1.5 text-xs font-medium text-[#9aa9b5] transition hover:border-[#f26d70] hover:text-[#f26d70]"
              title="Sign out of PCtrl"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="min-w-0">{children}</main>
    </div>
  );
}
