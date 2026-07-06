"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MobileNav, { AuthGuard } from "@/components/MobileNav";
import { Card, PageShell } from "@/components/Brand";
import { apiFetch, clearAuth, getStoredUser, setStoredUser } from "@/lib/api";

export default function ProfilePage() {
  const user = getStoredUser();
  const router = useRouter();
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [currPw, setCurrPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setProfileMsg(null);
    try {
      const updated = await apiFetch<{ full_name: string; phone: string | null }>("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ full_name: fullName, phone: phone || null }),
      });
      if (user) setStoredUser({ ...user, ...updated });
      setProfileMsg("Profile updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 8) { setPwMsg("Password must be at least 8 characters"); return; }
    setSaving(true);
    setError(null);
    setPwMsg(null);
    try {
      await apiFetch("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password: currPw, new_password: newPw }),
      });
      setPwMsg("Password changed");
      setCurrPw("");
      setNewPw("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthGuard>
      <PageShell title="Profile">
        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

        <form onSubmit={updateProfile} className="mb-4 space-y-3">
          <h2 className="text-sm font-bold text-white">Profile</h2>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Email</label>
            <input value={user?.email || ""} disabled className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-zinc-500" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Full Name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white" />
          </div>
          {profileMsg && <p className="text-xs text-emerald-400">{profileMsg}</p>}
          <button disabled={saving} className="w-full rounded-xl bg-[#3d4193] py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? "Saving..." : "Update Profile"}
          </button>
        </form>

        <form onSubmit={changePassword} className="space-y-3">
          <h2 className="text-sm font-bold text-white">Change Password</h2>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Current Password</label>
            <input type="password" value={currPw} onChange={(e) => setCurrPw(e.target.value)} required className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">New Password (min 8 chars)</label>
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={8} className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white" />
          </div>
          {pwMsg && <p className="text-xs text-emerald-400">{pwMsg}</p>}
          <button disabled={saving} className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white disabled:opacity-50">
            {saving ? "Saving..." : "Change Password"}
          </button>
        </form>

        <button onClick={() => { clearAuth(); router.push("/login"); }} className="mt-6 w-full rounded-xl bg-[#16192b] py-3 text-sm text-zinc-400">
          Sign out
        </button>
      </PageShell>
      <MobileNav />
    </AuthGuard>
  );
}
