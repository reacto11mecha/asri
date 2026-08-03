"use server";

import { redirect } from "next/navigation";
import { auth } from "~/server/better-auth";
import { getSession } from "~/server/better-auth/server";
import { headers } from "next/headers";
import { db } from "~/server/db";
import { user } from "~/server/db/schema";
import { eq } from "drizzle-orm";

// ======================== UPDATE PROFIL ========================
export async function updateProfile(newName: string, newNip: string | null) {
  const session = await getSession();

  if (!session) throw new Error("Anda harus login.");

  // 1. Update nama melalui method bawaan Better Auth
  await auth.api.updateUser({
    body: {
      name: newName,
    },
    headers: await headers(),
  });

  // 2. Update NIP langsung ke tabel user menggunakan Drizzle ORM
  await db
    .update(user)
    .set({ nip: newNip })
    .where(eq(user.id, session.user.id));

  return { success: true };
}

// ======================== CEK APAKAH SUDAH PUNYA PASSWORD ========================
export async function checkHasPassword(): Promise<boolean> {
  const session = await getSession();

  if (!session) throw new Error("Anda harus login.");

  const accounts = await auth.api.listUserAccounts({
    headers: await headers(),
  });

  return accounts.some((acc) => acc.providerId === "credential");
}

// ======================== BUAT PASSWORD BARU (untuk user Google/OAuth) ========================
export async function createPassword(newPassword: string) {
  const session = await getSession();

  if (!session) throw new Error("Anda harus login.");

  await auth.api.setPassword({
    body: {
      newPassword,
    },
    headers: await headers(),
  });

  return { success: true };
}

// ======================== UBAH PASSWORD (jika sudah punya password) ========================
export async function changePassword(
  currentPassword: string,
  newPassword: string,
) {
  const session = await getSession();

  if (!session) throw new Error("Anda harus login.");

  await auth.api.changePassword({
    body: {
      currentPassword,
      newPassword,
    },
    headers: await headers(),
  });

  return { success: true };
}

export async function getSessions() {
  const currentSession = await auth.api.getSession({
    headers: await headers(),
  });
  if (!currentSession) throw new Error("Anda harus login.");

  const sessions = await auth.api.listSessions({
    headers: await headers(),
  });

  return sessions.map((s) => ({
    id: s.id,
    token: s.token,
    ipAddress: s.ipAddress,
    userAgent: s.userAgent,
    createdAt: s.createdAt,
    isCurrent: s.id === currentSession.session.id,
  }));
}

export async function getCurrentUser() {
  const session = await getSession();

  if (!session) throw new Error("Anda harus login.");

  // Ambil NIP langsung dari database karena atribut custom
  const userData = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    columns: { nip: true },
  });

  return {
    name: session.user.name,
    email: session.user.email,
    nip: userData?.nip || null,
  };
}

export async function logoutAction() {
  await auth.api.signOut({
    headers: await headers(),
  });
  redirect("/login");
}

// ======================== CABUT SESI SPESIFIK ========================
export async function revokeSessionAction(token: string) {
  const session = await getSession();
  if (!session) throw new Error("Anda harus login.");

  await auth.api.revokeSession({
    body: { token },
    headers: await headers(),
  });

  return { success: true };
}

// ======================== CABUT SEMUA SESI LAIN ========================
export async function revokeOtherSessionsAction() {
  const session = await getSession();
  if (!session) throw new Error("Anda harus login.");

  await auth.api.revokeOtherSessions({
    headers: await headers(),
  });

  return { success: true };
}
