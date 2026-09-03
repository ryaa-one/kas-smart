"use client";

// Mock authentication sementara — struktur ready diganti API backend.
// Ganti isi login() dengan panggilan API nanti; AuthContext tetap terpakai.
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Role = "Owner" | "Kasir";

export interface AuthUser {
  id: string; // USERS.id
  name: string; // USERS.name
  username: string; // USERS.username
  phone: string; // USERS.phone_number
  email: string; // USERS.email
  role: Role; // USERS.role
}

// Akun mock — pengganti tabel USERS saat backend terhubung.
const MOCK_USERS: (AuthUser & { password: string })[] = [
  {
    id: "U-001",
    name: "Musthofa Arya",
    username: "admin",
    password: "admin",
    phone: "0812-9999-8888",
    email: "musthofa@kas-smart.id",
    role: "Owner",
  },
  {
    id: "U-002",
    name: "Dina Kasir",
    username: "user",
    password: "user",
    phone: "0813-2222-1111",
    email: "dina@kas-smart.id",
    role: "Kasir",
  },
];

const STORAGE_KEY = "kassmart_session";

interface AuthContextType {
  user: AuthUser | null;
  login: (username: string, password: string) => AuthUser | null;
  logout: () => void;
  hydrated: boolean; // false sebelum localStorage selesai dibaca (hindari redirect salah)
}

const AuthContext = createContext<AuthContextType | null>(null);

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

  const value: AuthContextType = {
      user,
      login: (username, password) => {
        // ponytail: mock lookup lokal — ganti POST /api/login saat backend ada.
        const found = MOCK_USERS.find(
          (u) => u.username === username.trim() && u.password === password
        );
        if (!found) return null;
        const { password: _pw, ...rest } = found;
        setUser(rest);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
        return rest;
      },
      logout: () => {
        setUser(null);
        window.localStorage.removeItem(STORAGE_KEY);
      },
      hydrated,
  };

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
