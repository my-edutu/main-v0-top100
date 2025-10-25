"use client";

import { useEffect, useState } from "react";

import { betterAuthClient, isBetterAuthClientEnabled } from "@/lib/better-auth/client";

export const useAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isBetterAuthClientEnabled) {
      setIsLoading(false);
      setUser(null);
      return;
    }

    const checkAuthStatus = async () => {
      setIsLoading(true);
      try {
        const session = await betterAuthClient.getSession();
        if (session?.data?.user) {
          setUser(session.data.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Error checking auth status:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const logout = async () => {
    if (!isBetterAuthClientEnabled) {
      setUser(null);
      return;
    }
    try {
      await betterAuthClient.signOut();
      setUser(null);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return { user, isLoading, logout };
};
