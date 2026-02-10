"use client";

import { useAuth, AuthProvider } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SellerSidebar } from "@/components/seller/SellerSidebar";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen">
        <SellerSidebar />
        <main className="flex-1 p-8 bg-muted/20">
          <SellerAuthCheck>{children}</SellerAuthCheck>
        </main>
        <Toaster />
      </div>
    </AuthProvider>
  );
}

function SellerAuthCheck({ children }: { children: React.ReactNode }) {
  const { user, isSeller, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
      } else if (!isSeller) {
        router.push("/skating-store");
      }
    }
  }, [user, isSeller, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isSeller) {
    return null;
  }

  return <>{children}</>;
}
