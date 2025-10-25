"use client";

import { createAuthClient } from "better-auth/react";

import { PUBLIC_AUTH_ENABLED } from "../config/auth";

const disabledClient = {
  async getSession() {
    return { data: null };
  },
  async signOut() {
    return { data: null };
  },
  signIn: {
    email: async () => ({ data: null }),
  },
} satisfies Partial<ReturnType<typeof createAuthClient>>;

export const betterAuthClient =
  PUBLIC_AUTH_ENABLED
    ? createAuthClient({
        basePath: "/api/better-auth",
      })
    : (disabledClient as ReturnType<typeof createAuthClient>);

export const isBetterAuthClientEnabled = PUBLIC_AUTH_ENABLED;

export type BetterAuthClient = typeof betterAuthClient;
