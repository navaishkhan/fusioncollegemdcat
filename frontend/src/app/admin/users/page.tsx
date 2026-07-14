"use client";

import { useEffect, useState } from "react";
import MobileNav, { AuthGuard } from "@/components/MobileNav";
import { Card, PageShell } from "@/components/Brand";
import { apiFetch } from "@/lib/api";
import { Bell, KeyRound, X, CheckCircle2, Loader2, ShieldAlert, Plus } from "lucide-react";

interface UserItem {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  parent_id: string | null;
}

interface ResetRequest {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  status: string;
  created_at: string;
}

interface ResetModalState {
  userId: string;
  userName: string;
  reqId?: string; // if coming from a notification
}

const ROLES = ["admin", "tutor", "student", "parent"] as const;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [filterRole, setFilterRole] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<UserItem[]>([]);
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);

  // Password reset notifications
  const [resetRequests, setResetRequests] = useState<ResetRequest[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Reset password modal
  const [resetModal, setResetModal] = useState<ResetModalState | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Add User modal
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState("student");
  const [addPassword, setAddPassword] = useState("");
  const [addingUser, setAddingUser] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const fetchUsers = () => {
    const params = filterRole ? `?role=${filterRole}` : "";
    apiFetch<UserItem[]>(`/api/admin/users${params}`)
      .then(setUsers)
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    fetchUsers();

    // Load pending reset requests
    apiFetch<ResetRequest[]>("/api/admin/password-reset-requests")
      .then(setResetRequests)
      .catch(() => {}); // silent fail if table doesn't exist yet
  }, [filterRole]);

  const submitAddUser = async () => {
    if (!addName || !addEmail || !addPassword) {
      setAddError("Please fill all fields");
      return;
    }
    setAddingUser(true);
    setAddError(null);
    try {
      await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: addEmail,
          full_name: addName,
          password: addPassword,
          role: addRole,
        }),
      });
      setUpdateMsg(`User ${addName} added`);
      setShowAddUserModal(false);
      setAddName("");
      setAddEmail("");
      setAddPassword("");
      fetchUsers();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Failed to add user");
    } finally {
      setAddingUser(false);
    }
  };

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

  const openResetModal = (user: UserItem, reqId?: string) => {
    setResetModal({ userId: user.id, userName: user.full_name, reqId });
    setNewPassword("");
    setConfirmPassword("");
    setResetError(null);
  };

  const openResetModalFromRequest = (req: ResetRequest) => {
    setResetModal({ userId: req.user_id, userName: req.user_name, reqId: req.id });
    setNewPassword("");
    setConfirmPassword("");
    setResetError(null);
    setShowNotifications(false);
  };

  const submitReset = async () => {
    if (!resetModal) return;
    if (newPassword.length < 8) { setResetError("Password must be at least 8 characters"); return; }
    if (newPassword !== confirmPassword) { setResetError("Passwords do not match"); return; }

    setResetting(true);
    setResetError(null);
    try {
      await apiFetch(`/api/admin/users/${resetModal.userId}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ new_password: newPassword }),
      });

      // If this came from a notification, resolve it
      if (resetModal.reqId) {
        await apiFetch(`/api/admin/password-reset-requests/${resetModal.reqId}/resolve`, {
          method: "PATCH",
        });
        setResetRequests((prev) => prev.filter((r) => r.id !== resetModal.reqId));
      }

      setUpdateMsg(`Password reset for ${resetModal.userName}`);
      setResetModal(null);
    } catch (e) {
      setResetError(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setResetting(false);
    }
  };

  const resolveRequest = async (reqId: string) => {
    try {
      await apiFetch(`/api/admin/password-reset-requests/${reqId}/resolve`, { method: "PATCH" });
      setResetRequests((prev) => prev.filter((r) => r.id !== reqId));
    } catch {}
  };

  const displayed = searchResults.length > 0 ? searchResults : users;

  return (
    <AuthGuard roles={["admin"]}>
      <PageShell title="Manage Users">
        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
        {updateMsg && (
          <p className="mb-3 text-xs text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> {updateMsg}
          </p>
        )}

        {/* Notification banner */}
        {resetRequests.length > 0 && (
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="mb-4 w-full flex items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left transition-all hover:bg-amber-500/15"
          >
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Bell className="h-5 w-5 text-amber-400" />
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-black">
                  {resetRequests.length}
                </span>
              </div>
              <span className="text-sm font-semibold text-amber-300">
                {resetRequests.length} user{resetRequests.length > 1 ? "s" : ""} requested a password reset
              </span>
            </div>
            <span className="text-xs text-amber-500">{showNotifications ? "Hide ▲" : "View ▼"}</span>
          </button>
        )}

        {/* Notification list */}
        {showNotifications && resetRequests.length > 0 && (
          <div className="mb-4 space-y-2 rounded-2xl border border-amber-500/20 bg-[#0d0e1a] p-3">
            {resetRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between gap-2 rounded-xl border border-[#1e2340] bg-[#0a0c14] p-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{req.user_name}</p>
                  <p className="text-xs text-zinc-500">{req.user_email}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">
                    {new Date(req.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    onClick={() => openResetModalFromRequest(req)}
                    className="flex items-center gap-1 rounded-lg bg-cyan-600/30 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-600/50"
                  >
                    <KeyRound className="h-3 w-3" /> Reset
                  </button>
                  <button
                    onClick={() => resolveRequest(req.id)}
                    className="rounded-lg bg-zinc-700/40 px-2 py-1.5 text-xs text-zinc-400 hover:bg-zinc-700"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

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

        {/* Role filter & Add User */}
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
            <button onClick={() => setFilterRole("")} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${!filterRole ? "bg-cyan-500/20 text-cyan-400" : "bg-[#16192b] text-zinc-400"}`}>
              All
            </button>
            {ROLES.map((r) => (
              <button key={r} onClick={() => setFilterRole(r)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${filterRole === r ? "bg-cyan-500/20 text-cyan-400" : "bg-[#16192b] text-zinc-400"}`}>
                {r}
              </button>
            ))}
          </div>
          <button onClick={() => setShowAddUserModal(true)} className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#3d4193] px-4 py-2 text-sm font-semibold text-white hover:bg-[#252a4a] transition-colors">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add User</span>
          </button>
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
                    {resetRequests.some((r) => r.user_id === u.id) && (
                      <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-400 flex items-center gap-0.5">
                        <ShieldAlert className="h-2.5 w-2.5" /> Reset Requested
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <button
                    onClick={() => toggleActive(u.id, u.is_active)}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold ${u.is_active ? "bg-red-600/30 text-red-300" : "bg-emerald-600/30 text-emerald-300"}`}
                  >
                    {u.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => openResetModal(u)}
                    className="flex items-center justify-center gap-1 rounded-lg bg-cyan-600/20 px-3 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-600/30"
                  >
                    <KeyRound className="h-3 w-3" /> Reset PW
                  </button>
                </div>
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

      {/* Reset Password Modal */}
      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-[#1e2340] bg-[#0d0f1e] p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/20">
                <KeyRound className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Reset Password</h2>
                <p className="text-xs text-zinc-500">{resetModal.userName}</p>
              </div>
              <button onClick={() => setResetModal(null)} className="ml-auto text-zinc-500 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-400">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white placeholder-zinc-600"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-400">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white placeholder-zinc-600"
                />
              </div>
              {resetError && <p className="text-xs text-red-400">{resetError}</p>}
              <button
                onClick={submitReset}
                disabled={resetting || !newPassword || !confirmPassword}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 py-3 text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {resetting ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : "Set New Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-[#1e2340] bg-[#0d0f1e] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Plus className="h-4 w-4 text-cyan-400" /> Add New User
                </h2>
              </div>
              <button onClick={() => setShowAddUserModal(false)} className="text-zinc-500 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-400">Full Name</label>
                <input
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Ali Khan"
                  className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white placeholder-zinc-600"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-400">Email Address</label>
                <input
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="ali@example.com"
                  className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white placeholder-zinc-600"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-400">Role</label>
                <select
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value)}
                  className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white capitalize"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-400">Password</label>
                <input
                  type="password"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white placeholder-zinc-600"
                />
              </div>
              {addError && <p className="text-xs text-red-400">{addError}</p>}
              <button
                onClick={submitAddUser}
                disabled={addingUser || !addName || !addEmail || !addPassword}
                className="w-full rounded-xl bg-gradient-to-r from-[#3d4193] to-cyan-700 py-3 mt-2 text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {addingUser ? <><Loader2 className="h-4 w-4 animate-spin" /> Adding...</> : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}

      <MobileNav />
    </AuthGuard>
  );
}
