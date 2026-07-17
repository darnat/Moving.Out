"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="ml-auto rounded-xl px-3 py-1.5 text-sm font-medium transition-colors"
      style={{
        border: "1px solid var(--color-kraft)",
        color: "var(--color-pencil)",
      }}
    >
      Sign out
    </button>
  );
}
