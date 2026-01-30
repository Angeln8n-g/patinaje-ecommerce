"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Package, History, User } from "lucide-react";

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

export function DeliveryNavbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t px-6 py-2 flex items-center justify-around md:hidden">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link 
            key={item.href} 
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
              isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
            )}
          >
            <item.icon className={cn("h-6 w-6", isActive && "fill-current")} />
            <span className="text-[10px] font-medium">{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
