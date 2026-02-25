"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiClient, getToken, setToken, removeToken } from "@/lib/api/client";
import { UserRole } from "@/types/skating-store";

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  first_name?: string;
  last_name?: string;
  phone?: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_postal_code?: string;
  address_country?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole | null;
  isAdmin: boolean;
  isDelivery: boolean;
  isSeller: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (credential: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const role = user?.role || null;
  const isAdmin = role === "ADMIN";
  const isDelivery = role === "DELIVERY";
  const isSeller = role === "SELLER";

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    // Try with httpOnly cookie first (credentials: "include" in apiClient),
    // fall back to localStorage token for backward compatibility
    try {
      const token = getToken();
      const profile = await apiClient<AuthUser>("/api/auth/me", { token });
      setUser(profile);
    } catch {
      removeToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthResponse = (data: { user: AuthUser; token: string }) => {
    // Backend now sets httpOnly cookie automatically.
    // Keep localStorage as fallback during migration.
    setToken(data.token);
    setUser(data.user);
  };

  const signIn = async (email: string, password: string): Promise<AuthUser> => {
    const data = await apiClient<{ user: AuthUser; token: string }>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });
    handleAuthResponse(data);
    return data.user;
  };

  const signUp = async (email: string, password: string) => {
    const data = await apiClient<{ user: AuthUser; token: string }>("/api/auth/register", {
      method: "POST",
      body: { email, password },
    });
    handleAuthResponse(data);
  };

  const signInWithGoogle = async (credential: string): Promise<AuthUser> => {
    const data = await apiClient<{ user: AuthUser; token: string }>("/api/auth/google", {
      method: "POST",
      body: { credential },
    });
    handleAuthResponse(data);
    return data.user;
  };

  const signOut = async () => {
    // Clear httpOnly cookie on the server
    try {
      await apiClient("/api/auth/logout", { method: "POST" });
    } catch {
      // Best effort — clear local state regardless
    }
    removeToken();
    setUser(null);
  };

  const refreshUser = async () => {
    await checkAuth();
  };

  return (
    <AuthContext.Provider value={{ user, role, isAdmin, isDelivery, isSeller, isLoading, signIn, signUp, signInWithGoogle, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
