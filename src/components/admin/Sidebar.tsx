"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Package, Users, Settings, LogOut, ShoppingCart, Map, MapPin, Truck, Tags, Megaphone, Store, FileText, Barcode, UserCheck, Receipt, Bell, XCircle, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { getStaticContentClient } from "@/lib/skating-store/supabase-queries";

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
    title: "Cancelaciones",
    href: "/admin/cancellations",
    icon: XCircle,
  },
  {
    title: "Inventario",
    href: "/admin/inventory",
    icon: Barcode,
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
    title: "Promociones",
    href: "/admin/promotions",
    icon: Bell,
  },
  {
    title: "Plantillas de Email",
    href: "/admin/email-templates",
    icon: Mail,
  },
  {
    title: "Páginas",
    href: "/admin/pages",
    icon: FileText,
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
    title: "Vendedores",
    href: "/admin/sellers",
    icon: UserCheck,
  },
  {
    title: "Tiendas",
    href: "/admin/stores",
    icon: Store,
  },
  {
    title: "Zonas de Entrega",
    href: "/admin/delivery-zones",
    icon: MapPin,
  },
  {
    title: "Facturación Fiscal",
    href: "/admin/fiscal",
    icon: Receipt,
  },
  {
    title: "Configuración",
    href: "/admin/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const [fiscalEnabled, setFiscalEnabled] = useState(true);

  useEffect(() => {
    getStaticContentClient('site-settings').then(settings => {
      if (settings?.data && typeof settings.data.fiscal_enabled === 'boolean') {
        setFiscalEnabled(settings.data.fiscal_enabled);
      }
    });
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const filteredNavItems = fiscalEnabled
    ? navItems
    : navItems.filter(item => item.href !== "/admin/fiscal");

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-card px-3 py-4">
      <div className="mb-8 px-4 flex items-center gap-2">
        <span className="text-xl font-bold">Admin Panel</span>
      </div>
      
      <div className="flex-1 space-y-1">
        {filteredNavItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <span
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href)) ? "bg-accent text-accent-foreground" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-auto border-t pt-4 space-y-2">
        <Link href="/skating-store">
          <Button 
            variant="outline" 
            className="w-full justify-start gap-3"
          >
            <Store className="h-4 w-4" />
            Volver a Tienda
          </Button>
        </Link>
        
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );
}
