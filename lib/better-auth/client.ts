"use client";

export const betterAuthClient = {
  async getSession() {
    return { data: null };
  },
  async signOut() {
    return { data: null };
  },
  signIn: {
    email: async () => ({ data: null }),
  },
};

export const isBetterAuthClientEnabled = false;

export type BetterAuthClient = typeof betterAuthClient;
