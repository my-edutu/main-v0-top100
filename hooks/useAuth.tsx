"use client";

import { useEffect, useState } from "react";
import { betterAuthClient } from "@/lib/better-auth/client";

export const useAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
    try {
      await betterAuthClient.signOut();
      setUser(null);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return { user, isLoading, logout };
};