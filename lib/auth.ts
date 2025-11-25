// @lib/auth.ts
import { getServerSession } from './auth-server';

/**
 * Client-side shim for code that imports `auth`.
 * Note: in browser code, prefer calling client supabase helpers directly.
 */
export const auth = {
  // For server code importing auth.getSession: keep compatible API
  getServerSession: (req?: any) => getServerSession(req)
};