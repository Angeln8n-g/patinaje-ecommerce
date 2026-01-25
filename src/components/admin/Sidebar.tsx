"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Package, Users, Settings, LogOut, ShoppingCart, Map, Truck, Tags, Megaphone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Pedidos",
    href: "/admin/orders",
    icon: ShoppingCart,
  },
  {
    title: "Mapa Envíos",
    href: "/admin/map",
    icon: Map,
  },
  {
    title: "Productos",
    href: "/admin/products",
    icon: Package,
  },
  {
    title: "Categorías",
    href: "/admin/categories",
    icon: Tags,
  },
  {
    title: "Banners",
    href: "/admin/banners",
    icon: Megaphone,
  },
  {
    title: "Usuarios",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Repartidores",
    href: "/admin/deliveries",
    icon: Truck,
  },
  {
    title: "Configuración",
    href: "/admin/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-card px-3 py-4">
      <div className="mb-8 px-4 flex items-center gap-2">
        <span className="text-xl font-bold">Admin Panel</span>
      </div>
      
      <div className="flex-1 space-y-1">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
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

      <div className="mt-auto border-t pt-4">
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );
}
