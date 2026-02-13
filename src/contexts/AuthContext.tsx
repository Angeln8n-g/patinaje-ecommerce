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
  signOut: () => void;
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
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
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
    setToken(data.token);
    document.cookie = `skating_token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
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

  const signOut = () => {
    removeToken();
    document.cookie = "skating_token=; path=/; max-age=0";
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
