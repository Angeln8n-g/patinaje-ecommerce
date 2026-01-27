"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image"; // Import Image
import { CartIcon } from "./CartIcon";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { getProfile } from "@/lib/skating-store/supabase-queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, LogOut, LayoutDashboard, Search, Heart, MapPin, Bell, Trash2, Settings } from "lucide-react"; // Import Trash2
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area"; // Import ScrollArea for favorites list

export function Navbar() {
  const { user, isAdmin, signOut } = useAuth();
  const { favorites, removeFavorite } = useFavorites(); // Get removeFavorite
  const [address, setAddress] = React.useState("Dirección no configurada");

  const handleCartClick = () => {
    const event = new CustomEvent('open-cart');
    window.dispatchEvent(event);
  };

  React.useEffect(() => {
    if (user) {
      getProfile(user.id).then((profile) => {
        if (profile?.address_street) {
          setAddress(`${profile.address_street}, ${profile.address_city}`);
        } else {
          setAddress("Configura tu dirección de envío");
        }
      });
    }
  }, [user]);

  return (
    <div className="border-b bg-background sticky top-0 z-50">
      {/* Top Bar for Address - Desktop only - Matches Design */}
      <div className={`bg-secondary/30 text-xs py-3 px-4 border-b hidden md:block transition-all duration-300 ${!user ? 'h-0 py-0 border-none overflow-hidden' : ''}`}>
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/skating-store/perfil" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
               <span className="font-bold text-xs text-primary-foreground">DA</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Delivery address</span>
              <span className="font-bold text-sm text-foreground truncate max-w-[300px]">{address}</span>
            </div>
          </Link>
          <div className="flex items-center gap-6 text-muted-foreground font-medium">
             <Link href="/skating-store/sobre-nosotros" className="hover:text-primary transition-colors">
               Sobre Nosotros
             </Link>
             <Link href="/skating-store/contacto" className="hover:text-primary transition-colors">
               Contacto
             </Link>
          </div>
        </div>
      </div>

      <div className="flex h-20 items-center px-4 container mx-auto gap-8">
        {/* Logo */}
        <Link href="/skating-store" className="flex items-center space-x-2 shrink-0">
          <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center">
            <span className="font-bold text-lg text-primary-foreground">S</span>
          </div>
          <span className="text-xl font-bold hidden sm:inline-block">Skating Store</span>
        </Link>

        {/* Search Bar */}
        <div className="flex-1 max-w-xl relative hidden md:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search the entire shop" 
            className="pl-12 rounded-2xl bg-secondary border-none h-12 focus-visible:ring-primary shadow-sm"
          />
        </div>

        {/* Navigation Actions */}
        <div className="ml-auto flex items-center space-x-2 sm:space-x-4">
          <Link href="/skating-store" className="flex flex-col items-center gap-1 group">
             <div className="h-8 w-8 flex items-center justify-center text-primary">
               <LayoutDashboard className="h-6 w-6" /> 
             </div>
             <span className="text-[10px] font-bold">Home</span>
          </Link>

          <Link href="/skating-store/catalogo" className="flex flex-col items-center gap-1 group opacity-60 hover:opacity-100 transition-opacity">
             <div className="h-8 w-8 flex items-center justify-center">
               <Search className="h-6 w-6" /> 
             </div>
             <span className="text-[10px] font-bold">Catalog</span>
          </Link>

          <div className="flex flex-col items-center gap-1 group opacity-60 hover:opacity-100 transition-opacity cursor-pointer" onClick={handleCartClick}>
             <div className="h-8 w-8 flex items-center justify-center relative">
               <CartIcon className="hover:bg-transparent" /> 
             </div>
             <span className="text-[10px] font-bold">Cart</span>
          </div>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex flex-col items-center gap-1 group opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
                   <div className="h-8 w-8 flex items-center justify-center">
                     <User className="h-6 w-6" /> 
                   </div>
                   <span className="text-[10px] font-bold">Profile</span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none truncate">{user.email}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {isAdmin ? 'Administrador' : 'Usuario'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/skating-store/perfil">
                    <User className="mr-2 h-4 w-4" />
                    Mi Perfil
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Panel Admin
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login" className="flex flex-col items-center gap-1 group opacity-60 hover:opacity-100 transition-opacity">
               <div className="h-8 w-8 flex items-center justify-center">
                 <User className="h-6 w-6" /> 
               </div>
               <span className="text-[10px] font-bold">Log In</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
