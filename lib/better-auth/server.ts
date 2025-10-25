import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { Pool } from "pg";
import { sendVerificationEmail } from "../email/resend";
import { SERVER_AUTH_ENABLED } from "../config/auth";

const globalForBetterAuth = globalThis as typeof globalThis & {
  _betterAuthPool?: Pool;
  _betterAuthWarned?: boolean;
  _betterAuthInstance?: ReturnType<typeof betterAuth>;
};

const databaseUrl = process.env.DATABASE_URL;
const secret = process.env.BETTER_AUTH_SECRET;
const baseURL = process.env.BETTER_AUTH_URL;

type BetterAuthInstance = ReturnType<typeof betterAuth>;

let pool: Pool | undefined;

if (!SERVER_AUTH_ENABLED) {
  if (!globalForBetterAuth._betterAuthWarned) {
    console.warn(
      '[better-auth] Authentication is disabled. Set NEXT_PUBLIC_ENABLE_AUTH to "true" and provide BETTER_AUTH_* variables to re-enable.',
    );
    globalForBetterAuth._betterAuthWarned = true;
  }
} else {
  if (databaseUrl) {
    if (!globalForBetterAuth._betterAuthPool) {
      globalForBetterAuth._betterAuthPool = new Pool({ connectionString: databaseUrl });
    }
    pool = globalForBetterAuth._betterAuthPool;
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
}

const instance: BetterAuthInstance | undefined = globalForBetterAuth._betterAuthInstance;

export const betterAuthServer = instance ?? null;
export const isBetterAuthEnabled = Boolean(instance);
export type BetterAuthSession = BetterAuthInstance["$Infer"]["Session"];
