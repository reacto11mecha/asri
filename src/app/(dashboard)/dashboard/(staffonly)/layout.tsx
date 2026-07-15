import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { eq } from "drizzle-orm";
import { user } from "~/server/db/schema";
import { getSession } from "~/server/better-auth/server";

export default async function ProtectedSuperStaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getSession();

  if (!auth) redirect("/login");

  const currentUser = await db.query.user.findFirst({
    where: eq(user.id, auth.user.id),
    columns: { accountApproved: true },
    with: {
      jabatan: true,
    },
  });

  if (!currentUser) {
    redirect("/login");
  }

  if (!currentUser.accountApproved || !currentUser.jabatan) {
    redirect("/");
  }

  if (!["SUPERADMIN", "STAFFF"].includes(currentUser.jabatan.role)) {
    redirect("/dashboard/aktivitas");
  }

  return <>{children}</>;
}
