"use client";

export type UserRole = "admin" | "tutor" | "student" | "parent";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  parent_id: string | null;
  is_active: boolean;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

const TOKEN_KEY = "fusion_mdcat_tokens";
const USER_KEY = "fusion_mdcat_user";

export function getTokens(): AuthTokens | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(TOKEN_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setTokens(tokens: AuthTokens) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setStoredUser(user: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

let refreshPromise: Promise<AuthTokens> | null = null;

async function attemptRefresh(): Promise<AuthTokens> {
  const tokens = getTokens();
  if (!tokens?.refresh_token) throw new Error("No refresh token");

  const res = await fetch("/api/auth/refresh?token=" + encodeURIComponent(tokens.refresh_token), {
    method: "POST",
  });
  if (!res.ok) {
    clearAuth();
    throw new Error("Session expired. Please log in again.");
  }
  const newTokens: AuthTokens = await res.json();
  setTokens(newTokens);
  return newTokens;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const tokens = getTokens();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (tokens?.access_token) {
    headers.Authorization = `Bearer ${tokens.access_token}`;
  }

  const res = await fetch(path, { ...options, headers });

  // Token expired — attempt refresh once
  if (res.status === 401 && tokens?.refresh_token) {
    if (!refreshPromise) {
      refreshPromise = attemptRefresh().finally(() => {
        refreshPromise = null;
      });
    }
    const newTokens = await refreshPromise;
    headers.Authorization = `Bearer ${newTokens.access_token}`;
    const retryRes = await fetch(path, { ...options, headers });
    if (!retryRes.ok) {
      const err = await retryRes.json().catch(() => ({ detail: retryRes.statusText }));
      let errorMsg = err.detail || "Request failed";
      if (Array.isArray(err.detail)) {
        errorMsg = err.detail[0]?.msg || "Validation error";
      } else if (typeof err.detail === "object") {
        errorMsg = JSON.stringify(err.detail);
      }
      throw new Error(errorMsg);
    }
    return retryRes.json();
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    let errorMsg = err.detail || "Request failed";
    if (Array.isArray(err.detail)) {
      errorMsg = err.detail[0]?.msg || "Validation error";
    } else if (typeof err.detail === "object") {
      errorMsg = JSON.stringify(err.detail);
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export function dashboardPath(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "tutor":
      return "/tutor";
    case "student":
      return "/student";
    case "parent":
      return "/parent";
    default:
      return "/login";
  }
}

export function formatSubjectName(code: string | undefined | null): string {
  if (!code) return "";
  const map: Record<string, string> = {
    bio: "Biology",
    chem: "Chemistry",
    physics: "Physics",
    english: "English",
    logical_reasoning: "Logical Reasoning",
  };
  return map[code.toLowerCase()] || code.toUpperCase();
}
