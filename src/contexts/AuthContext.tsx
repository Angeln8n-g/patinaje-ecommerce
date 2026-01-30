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
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDelivery, setIsDelivery] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Check active sessions and sets the user
    const checkUser = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Auth session error:", error);
          if (error.message.includes("Refresh Token Not Found")) {
            // Clear everything if the token is invalid
            await supabase.auth.signOut();
            setUser(null);
            setRole(null);
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
      } else if (session?.user) {
        setUser(session.user);
        await checkRole(session.user.id);
      } else {
        setUser(null);
        setRole(null);
        setIsAdmin(false);
        setIsDelivery(false);
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
      } else {
        setRole('USER');
        setIsAdmin(false);
        setIsDelivery(false);
      }
    } catch (error) {
      console.error("Error checking role:", error);
      setRole(null);
      setIsAdmin(false);
      setIsDelivery(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setIsAdmin(false);
    setIsDelivery(false);
  };

  return (
    <AuthContext.Provider value={{ user, role, isAdmin, isDelivery, isLoading, signOut }}>
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
