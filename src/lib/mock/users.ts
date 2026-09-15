// Mock USERS store — ganti API/DB saat backend terhubung. Field mengikuti ERD: USERS.
// Dipakai bersama oleh auth (login) dan halaman CRUD Kasir (Owner).
// Data tersimpan di localStorage agar akun buatan Owner tetap bisa login
// setelah logout (full page reload) — mock sinkron, tanpa API.
// ponytail: password plaintext di localStorage — ganti hash + POST /api/users saat backend ada.

export interface StoreUser {
  id: string;
  username: string; // USERS.username
  name: string; // USERS.name
  phone_number: string; // USERS.phone_number
  email: string; // USERS.email
  password: string; // USERS.password
  role: "Owner" | "Kasir"; // USERS.role (CRUD Kasir selalu "Kasir")
  status: "active" | "inactive"; // USERS.status
}

// Seed awal — dipakai juga untuk render pertama (hindari hydration mismatch).
export const seedUsers: StoreUser[] = [
  {
    id: "U-001",
    username: "admin",
    name: "Musthofa Arya",
    phone_number: "0812-9999-8888",
    email: "musthofa@kas-smart.id",
    password: "admin",
    role: "Owner",
    status: "active",
  },
  {
    id: "U-002",
    username: "user",
    name: "Dina Kasir",
    phone_number: "0813-2222-1111",
    email: "dina@kas-smart.id",
    password: "user",
    role: "Kasir",
    status: "active",
  },
];

const STORAGE_KEY = "kassmart_users";

let cache: StoreUser[] | null = null;

function all(): StoreUser[] {
  if (cache) return cache;
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        cache = JSON.parse(raw) as StoreUser[];
        return cache;
      }
    } catch {
      // data rusak — mulai dari seed
    }
  }
  cache = [...seedUsers];
  return cache;
}

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all()));
  } catch {
    // storage penuh/blocked — mock tetap jalan in-memory
  }
}

export const getUsers = (): StoreUser[] => all();

export type AuthFailReason = "invalid" | "inactive";
export type AuthResult =
  | { ok: true; user: StoreUser }
  | { ok: false; reason: AuthFailReason };

export function authenticate(username: string, password: string): AuthResult {
  const found = all().find((u) => u.username === username.trim());
  if (!found || found.password !== password) return { ok: false, reason: "invalid" };
  if (found.status !== "active") return { ok: false, reason: "inactive" };
  return { ok: true, user: found };
}

export function isUsernameTaken(username: string, excludeId?: string): boolean {
  const u = username.trim().toLowerCase();
  return all().some(
    (x) => x.username.toLowerCase() === u && x.id !== excludeId
  );
}

// M-11 (UC-21): email USERS juga harus unik (excludeId = diri sendiri saat edit).
export function isEmailTaken(email: string, excludeId?: string): boolean {
  const e = email.trim().toLowerCase();
  if (!e) return false; // email kosong = NULL, boleh lebih dari satu
  // KONTRAK-3: USERS.email UNIQUE — email terisi tidak boleh dipakai dua akun.
  return all().some((x) => x.email.trim().toLowerCase() === e && x.id !== excludeId);
}

export function addUser(data: Omit<StoreUser, "id">): StoreUser {
  const users = all();
  const user: StoreUser = { id: `U-${String(users.length + 1).padStart(3, "0")}`, ...data };
  users.push(user);
  persist();
  return user;
}

export function updateUser(id: string, data: Partial<Omit<StoreUser, "id">>): void {
  const users = all();
  const idx = users.findIndex((u) => u.id === id);
  if (idx !== -1) users[idx] = { ...users[idx], ...data };
  persist();
}

// PRD UC-21: TIDAK ada hapus akun kasir — nonaktifkan menggantikan hapus.
// deleteUser() sengaja tidak disediakan; jangan tambahkan lagi.
