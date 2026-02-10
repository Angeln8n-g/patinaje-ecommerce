"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

import { UserRole } from '@/types/skating-store';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAdmin: boolean;
  isDelivery: boolean;
  isSeller: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDelivery, setIsDelivery] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Check active sessions and sets the user
    const checkUser = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Auth session error:", error);
          // Handle specific errors that require clearing session
          if (
            error.message.includes("Refresh Token Not Found") || 
            error.message.includes("Invalid Refresh Token") ||
            error.message.includes("JWT expired")
          ) {
            console.warn("Invalid session detected, clearing...");
            await supabase.auth.signOut();
            setUser(null);
            setRole(null);
            setIsAdmin(false);
            setIsDelivery(false);
            setIsSeller(false);
          }
          return;
        }

        if (session?.user) {
          setUser(session.user);
          await checkRole(session.user.id);
        } else {
          setUser(null);
          setRole(null);
          setIsAdmin(false);
          setIsDelivery(false);
          setIsSeller(false);
        }
      } catch (error) {
        console.error("Error checking auth:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth event:", event);
      
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setRole(null);
        setIsAdmin(false);
        setIsDelivery(false);
        setIsSeller(false);
      } else if (session?.user) {
        setUser(session.user);
        await checkRole(session.user.id);
      } else {
        setUser(null);
        setRole(null);
        setIsAdmin(false);
        setIsDelivery(false);
        setIsSeller(false);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (data) {
        const userRole = data.role as UserRole;
        setRole(userRole);
        setIsAdmin(userRole === 'ADMIN');
        setIsDelivery(userRole === 'DELIVERY');
        setIsSeller(userRole === 'SELLER');
      } else {
        setRole('USER');
        setIsAdmin(false);
        setIsDelivery(false);
        setIsSeller(false);
      }
    } catch (error) {
      console.error("Error checking role:", error);
      setRole(null);
      setIsAdmin(false);
      setIsDelivery(false);
      setIsSeller(false);
    }
  };

  const signOut = async () => {
    // Clear state immediately for instant UI feedback
    setUser(null);
    setRole(null);
    setIsAdmin(false);
    setIsDelivery(false);
    setIsSeller(false);

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
    // Navigation is handled by the caller (Navbar, Sidebar, etc.)
    // onAuthStateChange will also fire SIGNED_OUT to confirm cleanup
  };

  return (
    <AuthContext.Provider value={{ user, role, isAdmin, isDelivery, isSeller, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
