"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, LogOut, Package, History, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthProvider } from "@/contexts/AuthContext";
import { DeliveryNavbar } from "@/components/delivery/DeliveryNavbar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

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

const navItems = [
  {
    title: "Envíos",
    href: "/delivery",
    icon: Package,
  },
  {
    title: "Historial",
    href: "/delivery/history",
    icon: History,
  },
  {
    title: "Perfil",
    href: "/delivery/profile",
    icon: User,
  },
];

function DeliveryAuthCheck({ children }: { children: React.ReactNode }) {
  const { user, isDelivery, isLoading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
      } else if (!isDelivery) {
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
    <div className="min-h-screen bg-muted/20 pb-20 md:pb-0">
      <header className="bg-background border-b px-6 py-4 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-xl tracking-tight text-primary">Reparto</h1>
          <nav className="hidden md:flex items-center gap-1 ml-8">
            {navItems.map((item) => (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                  pathname === item.href 
                    ? "bg-primary text-primary-foreground shadow-md" 
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            ))}
          </nav>
        </div>
        <Button variant="ghost" size="sm" onClick={() => signOut()} className="hover:text-destructive">
          <LogOut className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Cerrar Sesión</span>
        </Button>
      </header>
      <main className="p-4 md:p-8 max-w-2xl mx-auto">
        {children}
      </main>
      <DeliveryNavbar />
    </div>
  );
}
