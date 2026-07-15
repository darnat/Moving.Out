"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  const isTest = process.env.NEXT_PUBLIC_PLAYWRIGHT_TEST === "true";

  async function handleTestLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = (e.currentTarget.elements.namedItem("email") as HTMLInputElement).value;
    await signIn("test", { email, callbackUrl: "/" });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm space-y-6 rounded-xl bg-white p-8 shadow">
        <h1 className="text-center text-2xl font-bold text-gray-900">Moving Out</h1>
        <p className="text-center text-sm text-gray-500">Sign in to manage your boxes</p>

        {isTest ? (
          <form onSubmit={handleTestLogin} className="space-y-4">
            <input
              name="email"
              type="email"
              defaultValue="test@example.com"
              data-testid="test-email-input"
              className="w-full rounded border px-3 py-2 text-sm"
            />
            <button
              type="submit"
              data-testid="test-login-btn"
              className="w-full rounded bg-gray-800 px-4 py-2 text-sm text-white"
            >
              Test Login
            </button>
          </form>
        ) : (
          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="flex w-full items-center justify-center gap-2 rounded border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Sign in with Google
          </button>
        )}
      </div>
    </main>
  );
}
