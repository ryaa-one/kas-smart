// POST /api/auth/login — UC-01. Body: {username, password}.
// Respons: 200 {ok,data:{user}} + Set-Cookie sesi httpOnly; 401 invalid; 403 inactive.
// Pesan error tidak membedakan "user tidak ada" vs "password salah" (anti-enumeration);
// akun nonaktif dibedakan karena UI perlu menampilkannya (sesuai mock).
import { prisma } from "@/lib/prisma";
import {
  fail,
  hashlessUser,
  ok,
  sessionCookieHeader,
  createSessionToken,
  SESSION_MAX_AGE,
  verifyPassword,
} from "@/lib/api-auth";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "invalid_json");
  }
  const { username, password } = (body ?? {}) as Record<string, unknown>;
  if (typeof username !== "string" || !username.trim())
    return fail(400, "username_required");
  if (typeof password !== "string" || !password)
    return fail(400, "password_required");

  const user = await prisma.user.findUnique({
    where: { username: username.trim() },
  });
  if (!user) return fail(401, "invalid");

  const valid = await verifyPassword(password, user.password);
  if (!valid) return fail(401, "invalid");

  if (user.status !== "aktif") return fail(403, "inactive");

  await prisma.activityLog.create({
    data: { user_id: user.id, action: "login", description: "Login ke sistem" },
  });

  const token = createSessionToken({
    id: user.id,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  });
  return ok({ user: hashlessUser(user) }, 200, [sessionCookieHeader(token)]);
}
