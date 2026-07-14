"use client";

import { useEffect, useState, useRef } from "react";
import MobileNav, { AuthGuard } from "@/components/MobileNav";
import { Card, PageShell } from "@/components/Brand";
import { apiFetch } from "@/lib/api";
import {
  Bell, KeyRound, X, CheckCircle2, Loader2, ShieldAlert,
  Plus, UserPlus, BookOpen, Shield, Camera, User, Trash2
} from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

interface UserItem {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  parent_id: string | null;
  profile_picture_url?: string | null;
  specialization?: string | null;
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
  reqId?: string;
}

interface AddUserForm {
  full_name: string;
  email: string;
  password: string;
  phone: string;
  specialization: string;
  profile_picture_url: string;
}

const ROLES = ["admin", "tutor", "student", "parent"] as const;

const EMPTY_FORM: AddUserForm = {
  full_name: "",
  email: "",
  password: "",
  phone: "",
  specialization: "",
  profile_picture_url: "",
};

type AddModalType = "student" | "tutor" | "admin" | null;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [parentSelections, setParentSelections] = useState<Record<string, string>>({});
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
  const [addModalType, setAddModalType] = useState<AddModalType>(null);
  const [addForm, setAddForm] = useState<AddUserForm>(EMPTY_FORM);
  const [addingUser, setAddingUser] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [picturePreview, setPicturePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete User modal
  const [deleteModal, setDeleteModal] = useState<{ id: string; name: string } | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  const fetchUsers = () => {
    setLoading(true);
    const params = filterRole ? `?role=${filterRole}` : "";
    apiFetch<UserItem[]>(`/api/admin/users${params}`)
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
    apiFetch<ResetRequest[]>("/api/admin/password-reset-requests")
      .then(setResetRequests)
      .catch(() => {});
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

  const confirmDelete = async () => {
    if (!deleteModal) return;
    setDeletingUser(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/users/${deleteModal.id}`, { method: "DELETE" });
      setUpdateMsg(`Deleted user ${deleteModal.name}`);
      setUsers((prev) => prev.filter((u) => u.id !== deleteModal.id));
      setSearchResults((prev) => prev.filter((u) => u.id !== deleteModal.id));
      setDeleteModal(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete user");
    } finally {
      setDeletingUser(false);
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
      if (resetModal.reqId) {
        await apiFetch(`/api/admin/password-reset-requests/${resetModal.reqId}/resolve`, { method: "PATCH" });
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

  const openAddModal = (type: AddModalType) => {
    setAddModalType(type);
    setAddForm(EMPTY_FORM);
    setAddError(null);
    setPictureFile(null);
    setPicturePreview(null);
  };

  const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPictureFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPicturePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const submitAddUser = async () => {
    if (!addForm.full_name || !addForm.email || !addForm.password) {
      setAddError("Full name, email, and password are required");
      return;
    }
    if (!addForm.email.includes("@")) {
      setAddError("Please enter a valid email address");
      return;
    }
    if (addForm.password.length < 8) {
      setAddError("Password must be at least 8 characters long");
      return;
    }
    setAddingUser(true);
    setAddError(null);
    try {
      let pictureUrl = "";
      if (pictureFile) {
        const { upload } = await import("@vercel/blob/client");
        const blob = await upload(pictureFile.name, pictureFile, {
          access: "public",
          handleUploadUrl: "/api/upload",
        });
        pictureUrl = blob.url;
      }

      const role = addModalType === "student" ? "student" : addModalType === "tutor" ? "tutor" : "admin";
      await apiFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          email: addForm.email,
          full_name: addForm.full_name,
          password: addForm.password,
          phone: addForm.phone || null,
          role,
          specialization: addForm.specialization || null,
          profile_picture_url: pictureUrl || null,
        }),
      });
      setUpdateMsg(`${addModalType === "student" ? "Student" : addModalType === "tutor" ? "Tutor" : "Admin"} ${addForm.full_name} added`);
      setAddModalType(null);
      fetchUsers();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Failed to add user");
    } finally {
      setAddingUser(false);
    }
  };

  const displayed = searchResults.length > 0 ? searchResults : users;

  const modalConfig = {
    student: { label: "Add Student", icon: UserPlus, color: "cyan", accentFrom: "from-cyan-600", accentTo: "to-blue-700" },
    tutor: { label: "Add Tutor", icon: BookOpen, color: "purple", accentFrom: "from-purple-600", accentTo: "to-indigo-700" },
    admin: { label: "Add Admin", icon: Shield, color: "rose", accentFrom: "from-rose-600", accentTo: "to-pink-700" },
  };

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
            <span className="text-xs text-amber-500">{showNotifications ? "Hide" : "View"}</span>
          </button>
        )}

        {showNotifications && resetRequests.length > 0 && (
          <div className="mb-4 space-y-2 rounded-2xl border border-amber-500/20 bg-[#0d0e1a] p-3">
            {resetRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between gap-2 rounded-xl border border-[#1e2340] bg-[#0a0c14] p-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{req.user_name}</p>
                  <p className="text-xs text-zinc-500">{req.user_email}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{new Date(req.created_at).toLocaleString()}</p>
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

        {/* Role filter + Add buttons */}
        <div className="mb-4 space-y-3">
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
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => openAddModal("student")}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-cyan-500/20 bg-cyan-500/10 py-2.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 transition-colors"
            >
              <UserPlus className="h-3.5 w-3.5" /> Add Student
            </button>
            <button
              onClick={() => openAddModal("tutor")}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-purple-500/20 bg-purple-500/10 py-2.5 text-xs font-bold text-purple-300 hover:bg-purple-500/20 transition-colors"
            >
              <BookOpen className="h-3.5 w-3.5" /> Add Tutor
            </button>
            <button
              onClick={() => openAddModal("admin")}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition-colors"
            >
              <Shield className="h-3.5 w-3.5" /> Add Admin
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
          </div>
        ) : (
          <motion.div 
            className="space-y-2"
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.05 } }
            }}
          >
            <AnimatePresence>
            {displayed.map((u) => (
            <motion.div
              key={u.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Card>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Profile Picture */}
                    <div className="shrink-0 h-10 w-10 rounded-full overflow-hidden border border-[#2b3052] bg-[#16192b] flex items-center justify-center">
                      {u.profile_picture_url ? (
                        <Image src={u.profile_picture_url} alt={u.full_name} width={40} height={40} className="object-cover w-full h-full" />
                      ) : (
                        <User className="h-5 w-5 text-zinc-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-white">{u.full_name}</h3>
                      <p className="text-xs text-zinc-500">{u.email}</p>
                      {u.specialization && <p className="text-[10px] text-purple-400 mt-0.5">{u.specialization}</p>}
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-purple-300">
                          {u.role}
                        </span>
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${u.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                          {u.is_active ? "Active" : "Pending Verification / Inactive"}
                        </span>
                        {resetRequests.some((r) => r.user_id === u.id) && (
                          <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-400 flex items-center gap-0.5">
                            <ShieldAlert className="h-2.5 w-2.5" /> Reset Requested
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <button
                      onClick={() => toggleActive(u.id, u.is_active)}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold ${u.is_active ? "bg-red-600/30 text-red-300" : "bg-emerald-600/30 text-emerald-300"}`}
                    >
                      {u.is_active ? "Deactivate" : "Approve / Activate"}
                    </button>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => openResetModal(u)}
                        className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-cyan-600/20 px-3 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-600/30"
                      >
                        <KeyRound className="h-3 w-3" /> Reset
                      </button>
                      <button
                        onClick={() => setDeleteModal({ id: u.id, name: u.full_name })}
                        className="flex shrink-0 items-center justify-center rounded-lg bg-red-600/20 px-2 py-1 text-red-400 hover:bg-red-600/40 transition-colors"
                        title="Delete User"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
                {u.role === "student" && (
                  <div className="mt-2 flex items-center gap-2 border-t border-[#1e233d] pt-2">
                    <select
                      value={parentSelections[u.id] ?? u.parent_id ?? ""}
                      onChange={(e) => setParentSelections({ ...parentSelections, [u.id]: e.target.value })}
                      className="flex-1 rounded-lg border border-[#2b3052] bg-[#0a0c14] px-2 py-1.5 text-xs text-white"
                    >
                      <option value="">No Parent Linked</option>
                      {users.filter(p => p.role === "parent").map(p => (
                        <option key={p.id} value={p.id}>
                          {p.full_name} ({p.email})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        setParent(u.id, parentSelections[u.id] ?? u.parent_id ?? "");
                      }}
                      className="rounded-lg bg-cyan-600/20 text-cyan-300 hover:bg-cyan-600/40 px-3 py-1.5 text-xs font-bold transition-colors"
                    >
                      Save Parent
                    </button>
                  </div>
                )}
              </Card>
            </motion.div>
            ))}
            </AnimatePresence>
            {!error && displayed.length === 0 && (
              <p className="text-center text-sm text-zinc-500">No users found.</p>
            )}
          </motion.div>
        )}
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
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white placeholder-zinc-600" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-400">Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white placeholder-zinc-600" />
              </div>
              {resetError && <p className="text-xs text-red-400">{resetError}</p>}
              <button onClick={submitReset} disabled={resetting || !newPassword || !confirmPassword}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 py-3 text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2">
                {resetting ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : "Set New Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {addModalType && (() => {
        const cfg = modalConfig[addModalType];
        const Icon = cfg.icon;
        return (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-3xl border border-[#1e2340] bg-[#0d0f1e] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Icon className={`h-4 w-4 text-${cfg.color}-400`} /> {cfg.label}
                </h2>
                <button onClick={() => setAddModalType(null)} className="text-zinc-500 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3">
                {/* Profile Picture */}
                <div className="flex flex-col items-center gap-3">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative h-20 w-20 rounded-full overflow-hidden border-2 border-dashed border-[#2b3052] bg-[#0a0c14] flex items-center justify-center cursor-pointer hover:border-cyan-500/50 transition-colors"
                  >
                    {picturePreview ? (
                      <Image src={picturePreview} alt="Preview" fill className="object-cover" />
                    ) : (
                      <Camera className="h-7 w-7 text-zinc-600" />
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePictureChange} className="hidden" />
                  <p className="text-[10px] text-zinc-500">Tap to add profile photo (optional)</p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-400">Full Name</label>
                  <input value={addForm.full_name} onChange={(e) => setAddForm(f => ({ ...f, full_name: e.target.value }))}
                    placeholder="e.g. Ali Khan"
                    className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white placeholder-zinc-600" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-400">Email Address</label>
                  <input type="email" value={addForm.email} onChange={(e) => setAddForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="ali@example.com"
                    className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white placeholder-zinc-600" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-400">Phone Number <span className="text-zinc-600">(optional)</span></label>
                  <input value={addForm.phone} onChange={(e) => setAddForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+92 300 0000000"
                    className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white placeholder-zinc-600" />
                </div>

                {addModalType === "tutor" && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-400">Subject Specialization</label>
                    <input value={addForm.specialization} onChange={(e) => setAddForm(f => ({ ...f, specialization: e.target.value }))}
                      placeholder="e.g. Biology, Chemistry"
                      className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white placeholder-zinc-600" />
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-400">Password</label>
                  <input type="password" value={addForm.password} onChange={(e) => setAddForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Min 8 characters"
                    className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white placeholder-zinc-600" />
                </div>

                {addError && <p className="text-xs text-red-400">{addError}</p>}
                <button
                  onClick={submitAddUser}
                  disabled={addingUser || !addForm.full_name || !addForm.email || !addForm.password}
                  className={`w-full rounded-xl bg-gradient-to-r ${cfg.accentFrom} ${cfg.accentTo} py-3 mt-2 text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2`}
                >
                  {addingUser ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : cfg.label}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete User Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md rounded-3xl border border-red-500/30 bg-[#0d0f1e] p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/20">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Delete User</h2>
                <p className="text-xs text-zinc-500">{deleteModal.name}</p>
              </div>
            </div>
            <p className="mb-6 text-sm text-zinc-300">
              Are you sure you want to permanently delete this user? This will also erase all their test scores, answers, and batch enrollments. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal(null)}
                className="flex-1 rounded-xl border border-[#2b3052] bg-transparent py-3 text-sm font-bold text-white hover:bg-[#16192b]"
                disabled={deletingUser}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deletingUser}
                className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-bold text-white flex items-center justify-center gap-2 hover:bg-red-500 disabled:opacity-50"
              >
                {deletingUser ? <><Loader2 className="h-4 w-4 animate-spin" /> Deleting...</> : "Delete"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <MobileNav />
    </AuthGuard>
  );
}
