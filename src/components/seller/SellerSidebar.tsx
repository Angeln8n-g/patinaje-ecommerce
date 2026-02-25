"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, ShoppingCart, ClipboardList, LogOut, Store, AlertTriangle, Package, BoxesIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { getActiveSession } from "@/lib/skating-store/pos-actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const navItems = [
  {
    title: "Dashboard",
    href: "/seller",
    icon: LayoutDashboard,
  },
  {
    title: "Punto de Venta",
    href: "/seller/pos",
    icon: ShoppingCart,
  },
  {
    title: "Pedidos",
    href: "/seller/orders",
    icon: ClipboardList,
  },
  {
    title: "Productos Local",
    href: "/seller/products",
    icon: Package,
  },
  {
    title: "Inventario Local",
    href: "/seller/inventory",
    icon: BoxesIcon,
  },
];

export function SellerSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const [hasOpenSession, setHasOpenSession] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // Check for open session periodically
  useEffect(() => {
    const check = () => {
      getActiveSession()
        .then((s) => setHasOpenSession(!!s))
        .catch(() => {});
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, [pathname]);

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    // If on POS page with open session, block navigation away
    if (hasOpenSession && pathname === "/seller/pos" && href !== "/seller/pos") {
      e.preventDefault();
      setPendingHref(href);
      setShowWarning(true);
      return;
    }
  };

  const handleStoreClick = (e: React.MouseEvent) => {
    if (hasOpenSession && pathname === "/seller/pos") {
      e.preventDefault();
      setPendingHref("/skating-store");
      setShowWarning(true);
    }
  };

  const handleSignOutClick = () => {
    if (hasOpenSession) {
      setPendingHref("signout");
      setShowWarning(true);
      return;
    }
    handleSignOut();
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <>
      <div className="flex h-screen w-64 flex-col border-r bg-card px-3 py-4">
        <div className="mb-8 px-4 flex items-center gap-2">
          <span className="text-xl font-bold">Vendedor</span>
          {hasOpenSession && (
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Caja abierta" />
          )}
        </div>

        <div className="flex-1 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.href)}
            >
              <span
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  pathname === item.href ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-auto border-t pt-4 space-y-2">
          <Link href="/skating-store" onClick={handleStoreClick}>
            <Button variant="outline" className="w-full justify-start gap-3">
              <Store className="h-4 w-4" />
              Volver a Tienda
            </Button>
          </Link>

          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
            onClick={handleSignOutClick}
          >
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>
      </div>

      <Dialog open={showWarning} onOpenChange={setShowWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Caja Abierta
            </DialogTitle>
            <DialogDescription>
              Tiene una sesión de caja abierta. Debe cerrar la caja antes de salir del Punto de Venta.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button
              variant="default"
              className="flex-1"
              onClick={() => {
                setShowWarning(false);
                if (pathname !== "/seller/pos") {
                  router.push("/seller/pos");
                }
              }}
            >
              Ir a Cerrar Caja
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowWarning(false)}
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
