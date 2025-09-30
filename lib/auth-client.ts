"use client";
import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient({
  plugins: []
});
// Example usage elsewhere:
// const { data, isPending } = authClient.useSession();
// await authClient.signIn.email({ email, password });
// await authClient.signOut();