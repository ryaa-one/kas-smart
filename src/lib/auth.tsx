"use client";

// Mock authentication sementara — struktur ready diganti API backend.
// Ganti isi login() dengan panggilan API nanti; AuthContext tetap terpakai.
// Data akun ada di lib/mock/users.ts (dipakai juga CRUD Kasir Owner).
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authenticate, type StoreUser } from "@/lib/mock/users";
import { logActivity } from "@/lib/mock/db";

export type Role = "Owner" | "Kasir";

export interface AuthUser {
  id: string; // USERS.id
  name: string; // USERS.name
  username: string; // USERS.username
  phone: string; // USERS.phone_number
  email: string; // USERS.email
  role: Role; // USERS.role
}

const STORAGE_KEY = "kassmart_session";

interface AuthContextType {
  user: AuthUser | null;
  login: (
    username: string,
    password: string
  ) => { ok: true; user: AuthUser } | { ok: false; reason: "invalid" | "inactive" };
  logout: () => void;
  hydrated: boolean; // false sebelum localStorage selesai dibaca (hindari redirect salah)
}

const AuthContext = createContext<AuthContextType | null>(null);

function toAuthUser(u: StoreUser): AuthUser {
  const { id, name, username, phone_number, email, role } = u;
  return { id, name, username, phone: phone_number, email, role };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Pulihkan sesi dari localStorage saat pertama load.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw) as AuthUser);
    } catch {
      // sesi rusak — abaikan
    }
    setHydrated(true);
  }, []);

  const value: AuthContextType = useMemo(
    () => ({
      user,
      login: (username, password) => {
        // ponytail: mock lookup lokal — ganti POST /api/login saat backend ada.
        const res = authenticate(username, password);
        if (!res.ok) return { ok: false, reason: res.reason };
        const authUser = toAuthUser(res.user);
        setUser(authUser);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
        // FR-19: login dicatat ke ACTIVITY_LOGS (store bersama).
        logActivity({ id: authUser.id, name: authUser.name }, "login", "Login ke sistem");
        return { ok: true, user: authUser };
        },
        logout: () => {
        if (user) logActivity({ id: user.id, name: user.name }, "logout", "Logout dari sistem");
        setUser(null);
        window.localStorage.removeItem(STORAGE_KEY);
        },
        hydrated,
        }),
        [user, hydrated]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
