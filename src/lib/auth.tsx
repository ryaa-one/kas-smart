"use client";

// Autentikasi KasSmart — berbasis API server (bukan mock/localStorage).
// Sesi = cookie httpOnly `kassmart_session` dari POST /api/auth/login;
// client TIDAK menyimpan token/password apa pun — pemulihan state setelah
// refresh memakai GET /api/auth/me (server yang memvalidasi cookie).
// Interface useAuth dipertahankan agar halaman lama tidak perlu dirombak.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { logActivity } from "@/lib/mock/db";

export type Role = "Owner" | "Kasir";

export interface AuthUser {
  id: string; // USERS.id
  name: string; // USERS.name
  username: string; // USERS.username
  phone: string; // USERS.phone_number
  email: string; // USERS.email (NULL di DB -> "" di sini)
  role: Role; // USERS.role
}

// Bentuk respons API (lihat src/app/api/auth/*): { ok, data } | { ok:false, error }
interface ApiUser {
  id: string;
  name: string;
  username: string;
  phone_number: string;
  email: string | null;
  role: Role;
}

function toAuthUser(u: ApiUser): AuthUser {
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    phone: u.phone_number,
    email: u.email ?? "",
    role: u.role,
  };
}

export type LoginResult =
  | { ok: true; user: AuthUser }
  | { ok: false; reason: "invalid" | "inactive" | "network" };

interface AuthContextType {
  user: AuthUser | null;
  login: (
    username: string,
    password: string
  ) => Promise<LoginResult>;
  logout: () => Promise<void>;
  hydrated: boolean; // false sampai GET /api/auth/me pertama selesai
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Pulihkan sesi dari cookie (server-side) saat pertama load.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { credentials: "same-origin" })
      .then(async (res) => {
        if (res.status === 200) {
          const json = (await res.json()) as { data?: { user?: ApiUser } };
          if (!cancelled && json.data?.user) setUser(toAuthUser(json.data.user));
        }
      })
      .catch(() => {
        // server mati/ offline — anggap belum login
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      login: async (username, password) => {
        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ username, password }),
          });
          const json = (await res.json().catch(() => null)) as
            | { data?: { user?: ApiUser } }
            | null;
          if (res.status === 200 && json?.data?.user) {
            const authUser = toAuthUser(json.data.user);
            setUser(authUser);
            // Log aktivitas mock store lama dipertahankan supaya dashboard
            // "aktivitas terbaru" tetap berisi selama halaman lain belum
            // dimigrasi (API sudah menulis ACTIVITY_LOGS DB tersendiri).
            logActivity(
              { id: authUser.id, name: authUser.name },
              "login",
              "Login ke sistem"
            );
            return { ok: true, user: authUser };
          }
          if (res.status === 403) return { ok: false, reason: "inactive" };
          if (res.status === 401) return { ok: false, reason: "invalid" };
          return { ok: false, reason: "invalid" };
        } catch {
          return { ok: false, reason: "network" };
        }
      },
      logout: async () => {
        try {
          await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "same-origin",
          });
        } catch {
          // gagal network — state lokal tetap dibersihkan
        }
        setUser(null);
      },
      hydrated,
    }),
    [user, hydrated]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
