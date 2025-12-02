// @lib/supabase/server.ts  (REPLACE your file contents with this)
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

async function getCookies() {
  if (typeof window !== "undefined") {
    const cookieJar: Record<string, string> = {};
    return {
      get(name: string) {
        return { value: cookieJar[name] };
      },
      set({ name, value }: { name: string; value: string }) {
        cookieJar[name] = value;
      },
    };
  }

  try {
    const { cookies } = require("next/headers");
    return await cookies();
  } catch (error) {
    console.warn(
      "[supabase] Could not access next/headers. Are you using this in a client component?"
    );
    return {
      get(name: string) {
        return undefined;
      },
      set() {},
    };
  }
}

let warnedMissingEnv = false;

const getSupabaseConfig = (useServiceRole: boolean) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error(
      "Supabase URL is not configured. Define NEXT_PUBLIC_SUPABASE_URL in your environment."
    );
  }

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (useServiceRole) {
    if (serviceKey && serviceKey.trim().length > 0) {
      return { url: supabaseUrl, key: serviceKey };
    }

    if (!warnedMissingEnv) {
      console.warn(
        "[supabase] SUPABASE_SERVICE_ROLE_KEY is not configured. Falling back to anon key; some admin operations may fail."
      );
      warnedMissingEnv = true;
    }

    if (!anonKey) {
      throw new Error(
        "Supabase keys are not configured. Define SUPABASE_SERVICE_ROLE_KEY (preferred) or NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
    }

    return { url: supabaseUrl, key: anonKey };
  }

  if (!anonKey) {
    throw new Error(
      "Supabase anon key is not configured. Define NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment."
    );
  }

  return { url: supabaseUrl, key: anonKey };
};

/**
 * createAdminClient: create a Supabase admin client that bypasses RLS completely.
 * Use this for admin operations that need to modify data regardless of RLS policies.
 *
 * SECURITY: This function MUST only be used in server-side code.
 * The service role key grants full database access and bypasses ALL security policies.
 */
export const createAdminClient = () => {
  // SECURITY CHECK: Prevent service role key exposure in client-side code
  if (typeof window !== 'undefined') {
    throw new Error(
      'SECURITY ERROR: createAdminClient() cannot be called from client-side code. ' +
      'This would expose the service role key and grant unauthorized database access. ' +
      'Use createClient() for client-side operations instead.'
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "Supabase URL is not configured. Define NEXT_PUBLIC_SUPABASE_URL in your environment."
    );
  }

  if (!serviceKey) {
    throw new Error(
      "Service role key is not configured. Define SUPABASE_SERVICE_ROLE_KEY in your environment. " +
      "This key should NEVER be exposed to client-side code or committed to version control."
    );
  }

  // Log usage for auditing (in development only)
  if (process.env.NODE_ENV === 'development') {
    const stack = new Error().stack;
    const caller = stack?.split('\n')[2]?.trim();
    console.log('[ADMIN CLIENT] Service role client created from:', caller);
  }

  return createSupabaseClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

/**
 * createClient: create a Supabase server client.
 * - useServiceRole: true => uses service role key
 * - cookieHeaderOrHeaders: optional. If provided, used to read cookies from the current request.
 *
 * Example usage in server route:
 *   const supabase = await createClient(false, request.headers.get('cookie'))
 */
export const createClient = async (
  useServiceRole: boolean = false,
  cookieHeaderOrHeaders?: string | Headers | null
) => {
  // SECURITY CHECK: Warn if service role is used on client-side
  if (useServiceRole && typeof window !== 'undefined') {
    throw new Error(
      'SECURITY ERROR: createClient(true) cannot be called from client-side code. ' +
      'Service role key would be exposed. Use createClient(false) for client operations.'
    );
  }

  // Log service role usage for auditing (in development only)
  if (useServiceRole && process.env.NODE_ENV === 'development') {
    const stack = new Error().stack;
    const caller = stack?.split('\n')[2]?.trim();
    console.log('[SERVICE ROLE] Client created with service role from:', caller);
  }

  // If cookieHeaderOrHeaders given, create a lightweight cookie store that reads from it
  const cookieStore =
    cookieHeaderOrHeaders && typeof cookieHeaderOrHeaders === "string"
      ? {
          get(name: string) {
            const cookiePairs = cookieHeaderOrHeaders!.split(";").map((c) => c.trim());
            for (const pair of cookiePairs) {
              const idx = pair.indexOf("=");
              if (idx > -1) {
                const k = pair.substring(0, idx);
                const v = pair.substring(idx + 1);
                if (k === name) {
                  try {
                    return { value: decodeURIComponent(v) };
                  } catch {
                    return { value: v };
                  }
                }
              }
            }
            return undefined;
          },
          set() {
            // no-op on this read-only store
          },
        }
      : await getCookies();

  const { url: supabaseUrl, key: supabaseKey } = getSupabaseConfig(useServiceRole);

  return createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      get(name: string) {
        // Client-side behavior
        if (typeof window !== "undefined") {
          const value = typeof document !== "undefined"
            ? document.cookie
                .split("; ")
                .find((row) => row.startsWith(`${name}=`))
                ?.split("=")[1]
            : undefined;
          return value || undefined;
        }

        // Server-side cookieStore
        try {
          const val = (cookieStore && typeof cookieStore.get === "function" && cookieStore.get(name)) as
            | { value?: string | undefined }
            | undefined;
          return val?.value ?? undefined;
        } catch (e) {
          return undefined;
        }
      },
      set(name: string, value: string, options: CookieOptions) {
        if (typeof window !== "undefined") {
          let cookieString = `${name}=${encodeURIComponent(value)}`;
          if (options.maxAge) {
            const date = new Date();
            date.setTime(date.getTime() + options.maxAge * 1000);
            cookieString += `; expires=${date.toUTCString()}`;
          }
          if (options.path) cookieString += `; path=${options.path}`;
          if (options.domain) cookieString += `; domain=${options.domain}`;
          if (options.sameSite) cookieString += `; samesite=${options.sameSite}`;
          if (options.secure) cookieString += "; secure";
          if (typeof document !== "undefined") {
            document.cookie = cookieString;
          }
        } else {
          try {
            if (cookieStore && typeof (cookieStore as any).set === "function") {
              (cookieStore as any).set({ name, value, ...options });
            }
          } catch (err) {
            // ignore in SSR contexts where set isn't available
          }
        }
      },
      remove(name: string, options: CookieOptions) {
        if (typeof window !== "undefined") {
          if (typeof document !== "undefined") {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT${
              options.path ? `; path=${options.path}` : ""
            }`;
          }
        } else {
          try {
            if (cookieStore && typeof (cookieStore as any).set === "function") {
              (cookieStore as any).set({ name, value: "", ...options });
            }
          } catch (err) {
            // ignore
          }
        }
      },
    },
  });
};
