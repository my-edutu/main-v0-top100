"use client";

import { useState } from "react";

export const useAuth = () => {
  const [user, setUser] = useState<null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const logout = async () => {
    setUser(null);
  };

  return { user, isLoading, logout };
};
