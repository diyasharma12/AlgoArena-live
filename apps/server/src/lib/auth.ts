import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "@repo/db";
import dotenv from "dotenv";

// Ensure env is loaded even if import order changes.
dotenv.config({ path: "../../.env" });

// Local dev on localhost should not use cross-subdomain cookies.
// Those are only needed for real domains in production.
const isProd = process.env.NODE_ENV === "production";

const hasGoogleCreds =
  Boolean(process.env.GOOGLE_CLIENT_ID) && Boolean(process.env.GOOGLE_CLIENT_SECRET);

if (!hasGoogleCreds) {
  console.warn(
    "[Auth] Google OAuth disabled: GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET missing at runtime"
  );
}

export const auth = betterAuth({
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	emailAndPassword: { 
    enabled: true, 
  },
  socialProviders: hasGoogleCreds
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID as string,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        },
      }
    : undefined,
  advanced: {
    crossSubDomainCookies: {
      enabled: isProd,
      domain: isProd
        ? (process.env.NEXT_PUBLIC_COOKIE_DOMAIN ?? ".dsaroundrobin.fun")
        : undefined
    },
    useSecureCookies: isProd,
    defaultCookieAttributes: {
      sameSite: isProd ? 'none': 'lax',
    },
  },
	trustedOrigins: [
    "https://algo-arena-live.vercel.app/",
    "http://localhost:3000",
    process.env.CLIENT_URL,
  ].filter(Boolean) as string[],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            await prisma.leaderboardEntry.create({
              data: {
                userId: user.id,
                rating: 1200,
                wins: 0,
                losses: 0,
                totalMatches: 0,
                winStreak: 0,
                bestWinStreak: 0,
              },
            });
            console.log(`Created leaderboard entry for user ${user.id}`);
          } catch (error) {
            console.error(`Failed to create leaderboard entry for user ${user.id}:`, error);
          }
        },
      },
    },
  },
});