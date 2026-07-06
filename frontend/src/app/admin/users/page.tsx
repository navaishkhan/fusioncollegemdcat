"use client";

import { useEffect, useState } from "react";
import MobileNav, { AuthGuard } from "@/components/MobileNav";
import { Card, PageShell } from "@/components/Brand";
import { apiFetch } from "@/lib/api";

interface UserItem {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  parent_id: string | null;
}

const ROLES = ["admin", "tutor", "student", "parent"] as const;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [filterRole, setFilterRole] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<UserItem[]>([]);
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);

  useEffect(() => {
    const params = filterRole ? `?role=${filterRole}` : "";
    apiFetch<UserItem[]>(`/api/admin/users${params}`)
      .then(setUsers)
      .catch((e) => setError(e.message));
  }, [filterRole]);

  const doSearch = async () => {
    if (!search.trim()) return;
    try {
      const results = await apiFetch<UserItem[]>(`/api/admin/users/search?q=${encodeURIComponent(search)}`);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    }
  };

  const toggleActive = async (userId: string, current: boolean) => {
    try {
      await apiFetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !current }),
      });
      setUpdateMsg("User updated");
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_active: !current } : u)));
      setSearchResults((prev) => prev.map((u) => (u.id === userId ? { ...u, is_active: !current } : u)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  };

  const setParent = async (userId: string, parentId: string) => {
    try {
      await apiFetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ parent_id: parentId || null }),
      });
      setUpdateMsg("Parent linked");
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, parent_id: parentId || null } : u)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  };

  const displayed = searchResults.length > 0 ? searchResults : users;

  return (
    <AuthGuard roles={["admin"]}>
      <PageShell title="Manage Users">
        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
        {updateMsg && <p className="mb-3 text-xs text-emerald-400">{updateMsg}</p>}

        {/* Search */}
        <div className="mb-4 flex gap-2">
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSearchResults([]); }}
            placeholder="Search by name or email..."
            className="flex-1 rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white placeholder-zinc-600"
          />
          <button onClick={doSearch} className="rounded-xl bg-[#3d4193] px-4 py-2.5 text-sm font-semibold text-white">
            Search
          </button>
        </div>

        {/* Role filter */}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setFilterRole("")} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${!filterRole ? "bg-cyan-500/20 text-cyan-400" : "bg-[#16192b] text-zinc-400"}`}>
            All
          </button>
          {ROLES.map((r) => (
            <button key={r} onClick={() => setFilterRole(r)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${filterRole === r ? "bg-cyan-500/20 text-cyan-400" : "bg-[#16192b] text-zinc-400"}`}>
              {r}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {displayed.map((u) => (
            <Card key={u.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-white">{u.full_name}</h3>
                  <p className="text-xs text-zinc-500">{u.email}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-purple-300">
                      {u.role}
                    </span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${u.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => toggleActive(u.id, u.is_active)}
                  className={`shrink-0 rounded-lg px-3 py-1 text-xs font-semibold ${u.is_active ? "bg-red-600/30 text-red-300" : "bg-emerald-600/30 text-emerald-300"}`}
                >
                  {u.is_active ? "Deactivate" : "Activate"}
                </button>
              </div>
              {u.role === "student" && (
                <div className="mt-2 flex items-center gap-2 border-t border-[#1e233d] pt-2">
                  <input
                    defaultValue={u.parent_id || ""}
                    placeholder="Parent UUID to link"
                    id={`parent-${u.id}`}
                    className="flex-1 rounded-lg border border-[#2b3052] bg-[#0a0c14] px-2 py-1 text-xs text-white placeholder-zinc-600"
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById(`parent-${u.id}`) as HTMLInputElement;
                      setParent(u.id, input.value);
                    }}
                    className="rounded-lg bg-cyan-600 px-3 py-1 text-xs font-bold text-white"
                  >
                    Link Parent
                  </button>
                </div>
              )}
            </Card>
          ))}
          {!error && displayed.length === 0 && (
            <p className="text-center text-sm text-zinc-500">No users found.</p>
          )}
        </div>
      </PageShell>
      <MobileNav />
    </AuthGuard>
  );
}
