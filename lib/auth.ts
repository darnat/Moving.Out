import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { seedUserDefaults } from "./seed";

const testProvider =
  process.env.PLAYWRIGHT_TEST === "true"
    ? [
        Credentials({
          id: "test",
          name: "Test",
          credentials: { email: { label: "Email", type: "text" } },
          async authorize(credentials) {
            if (!credentials?.email) return null;
            const email = String(credentials.email);
            const user = await prisma.user.upsert({
              where: { email },
              update: {},
              create: { email, name: "Test User" },
            });
            const hasDefaults = await prisma.storageUnit.findUnique({
              where: { userId: user.id },
            });
            if (!hasDefaults) await seedUserDefaults(user.id);
            return user;
          },
        }),
      ]
    : [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as never,
  providers: [Google, ...testProvider],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      return user.email === process.env.ALLOWED_EMAIL;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
  },
  events: {
    async createUser({ user }) {
      if (user.id) await seedUserDefaults(user.id);
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
