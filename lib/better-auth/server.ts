import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { Pool } from "pg";
import { sendVerificationEmail } from "../email/resend";

const globalForBetterAuth = globalThis as typeof globalThis & {
  _betterAuthPool?: Pool;
  _betterAuthWarned?: boolean;
  _betterAuthInstance?: ReturnType<typeof betterAuth>;
};

const databaseUrl = process.env.DATABASE_URL;
const secret = process.env.BETTER_AUTH_SECRET;
const baseURL = process.env.BETTER_AUTH_URL;

let pool: Pool | undefined;
if (databaseUrl) {
  if (!globalForBetterAuth._betterAuthPool) {
    globalForBetterAuth._betterAuthPool = new Pool({ connectionString: databaseUrl });
  }
  pool = globalForBetterAuth._betterAuthPool;
} else if (!globalForBetterAuth._betterAuthWarned) {
  console.warn('[better-auth] DATABASE_URL is not set. Falling back to in-memory adapter; sessions will reset on restart.');
}

if (!globalForBetterAuth._betterAuthWarned) {
  if (!secret && process.env.NODE_ENV === 'production') {
    console.warn('[better-auth] BETTER_AUTH_SECRET is not set. Define it in env for production.');
  }
  if (!baseURL && process.env.NODE_ENV === 'production') {
    console.warn('[better-auth] BETTER_AUTH_URL is not set. Define it to generate correct links.');
  }
  globalForBetterAuth._betterAuthWarned = true;
}

if (!globalForBetterAuth._betterAuthInstance) {
  globalForBetterAuth._betterAuthInstance = betterAuth({
    basePath: '/api/better-auth',
    ...(baseURL ? { baseURL } : {}),
    ...(secret ? { secret } : {}),
    ...(pool ? { database: pool } : {}),
    emailVerification: {
      sendOnSignUp: true,
      async sendVerificationEmail({ user, url }) {
        const email = user.email;
        if (!email) {
          console.warn('[better-auth] unable to deliver verification email because user is missing an email address');
          return;
        }
        await sendVerificationEmail({
          email,
          name: user.name ?? null,
          verificationUrl: url,
        });
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
    },
    user: {
      additionalFields: {
        role: {
          type: 'string',
          required: false,
          input: false,
          defaultValue: 'user',
        },
      },
    },
    plugins: [nextCookies()],
  });
}

const instance = globalForBetterAuth._betterAuthInstance;

if (!instance) {
  throw new Error('Failed to initialize Better Auth instance.');
}

export const betterAuthServer = instance;

export type BetterAuthSession = (typeof betterAuthServer)["$Infer"]["Session"];
