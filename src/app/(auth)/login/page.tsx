// src/app/(auth)/login/page.tsx
import { headers } from "next/headers";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const headersList = await headers();
  const userAgent = headersList.get("user-agent") || "";

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <LoginForm userAgent={userAgent} />
      </div>
    </div>
  );
}
