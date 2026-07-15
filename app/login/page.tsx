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
    <main
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{ background: "var(--color-paper)" }}
    >
      <div className="w-full max-w-xs space-y-8">
        {/* Wordmark */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ background: "var(--color-freight)" }}
            />
            <span
              className="font-display font-semibold text-xl tracking-tight"
              style={{ color: "var(--color-ink)" }}
            >
              Moving Out
            </span>
          </div>
          <p className="text-sm pl-5" style={{ color: "var(--color-pencil)" }}>
            Your box inventory & storage map
          </p>
        </div>

        {/* Auth */}
        <div
          className="rounded-xl p-6 space-y-4"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)" }}
        >
          {isTest ? (
            <form onSubmit={handleTestLogin} className="space-y-3">
              <input
                name="email"
                type="email"
                defaultValue="test@example.com"
                data-testid="test-email-input"
                className="w-full rounded-lg px-3 py-2.5 text-sm"
                style={{
                  border: "1px solid var(--color-kraft)",
                  background: "var(--color-paper)",
                  color: "var(--color-ink)",
                }}
              />
              <button
                type="submit"
                data-testid="test-login-btn"
                className="w-full rounded-lg py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ background: "var(--color-ink)" }}
              >
                Sign in (test)
              </button>
            </form>
          ) : (
            <button
              onClick={() => signIn("google", { callbackUrl: "/" })}
              className="flex w-full items-center justify-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors"
              style={{
                border: "1px solid var(--color-kraft)",
                color: "var(--color-ink)",
              }}
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
