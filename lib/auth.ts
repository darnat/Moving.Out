import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { seedUserDefaults } from "./seed";

/* Comma-separated allowlist: ALLOWED_EMAILS=a@gmail.com,b@gmail.com
   Falls back to the legacy single-value ALLOWED_EMAIL var. */
const allowedEmails = new Set(
  (process.env.ALLOWED_EMAILS ?? process.env.ALLOWED_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

const testProvider =
  process.env.NODE_ENV !== "production" &&
  process.env.PLAYWRIGHT_TEST === "true"
    ? [
        Credentials({
          id: "test",
          name: "Test",
          credentials: { email: { label: "Email", type: "text" } },
          async authorize(credentials) {
            if (!credentials?.email) return null;
            const email = String(credentials.email).toLowerCase();
            if (!allowedEmails.has(email)) return null;
            const user = await prisma.user.upsert({
              where: { email },
              update: {},
              create: { email, name: "Test User" },
            });
            const hasDefaults = await prisma.storageUnit.findUnique({
              where: { userId: user.id },
            });
            if (!hasDefaults) await seedUserDefaults(user.id);
            return { id: user.id, email: user.email, name: user.name };
          },
        }),
      ]
    : [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  // No Prisma adapter — user creation is handled in the jwt callback below.
  // This avoids compatibility issues between @auth/prisma-adapter and Prisma 7.
  providers: [Google, ...testProvider],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      return allowedEmails.has(user.email.toLowerCase());
    },
    async jwt({ token, account }) {
      // account is only present on the first sign-in
      if (account && token.email) {
        const email = token.email.toLowerCase();
        const dbUser = await prisma.user.upsert({
          where: { email },
          update: {},
          create: { email, name: token.name ?? null },
        });
        token.sub = dbUser.id;
        const hasDefaults = await prisma.storageUnit.findUnique({
          where: { userId: dbUser.id },
        });
        if (!hasDefaults) await seedUserDefaults(dbUser.id);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
