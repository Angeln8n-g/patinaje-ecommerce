"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthProvider } from "@/contexts/AuthContext";

export default function DeliveryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <DeliveryAuthCheck>
        {children}
      </DeliveryAuthCheck>
    </AuthProvider>
  );
}

function DeliveryAuthCheck({ children }: { children: React.ReactNode }) {
  const { user, isDelivery, isLoading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
      } else if (!isDelivery) {
        // If logged in but not delivery, redirect to home or show unauthorized
        router.push("/skating-store");
      }
    }
  }, [user, isDelivery, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isDelivery) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/20 pb-20">
      <header className="bg-background border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <h1 className="font-bold text-lg">Panel de Reparto</h1>
        <Button variant="ghost" size="sm" onClick={() => signOut()}>
          <LogOut className="h-4 w-4 mr-2" />
          Salir
        </Button>
      </header>
      <main className="p-4 max-w-md mx-auto">
        {children}
      </main>
    </div>
  );
}
