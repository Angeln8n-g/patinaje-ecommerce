"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CartIcon } from "./CartIcon";
import { NotificationBell } from "./NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import { getProfile, getStaticContentClient } from "@/lib/skating-store/supabase-queries";
import { Input } from "@/components/ui/input";
import { User, LogOut, LayoutDashboard, Search, Menu, Mail, Info, Truck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";

export function Navbar() {
  const { user, isAdmin, isDelivery, signOut } = useAuth();
  const [address, setAddress] = React.useState("Dirección no configurada");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [storeTitle, setStoreTitle] = React.useState("Skating Store");
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const router = useRouter();
  const [isClient, setIsClient] = React.useState(false);

  const handleCartClick = () => {
    const event = new CustomEvent('open-cart');
    window.dispatchEvent(event);
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      router.push(`/skating-store/catalogo?search=${encodeURIComponent(searchTerm)}`);
    }
  };

  React.useEffect(() => {
    setIsClient(true);
    
    // Cargar configuración global del sitio (independiente del usuario)
    getStaticContentClient('site-settings').then((settings) => {
      const data = settings?.data || {};
      // @ts-ignore
      if (data.store_title) setStoreTitle(data.store_title as string);
      // @ts-ignore
      if (data.logo_url) setLogoUrl(data.logo_url as string);
    }).catch(err => console.error("Error loading site settings:", err));

  }, []); // Se ejecuta solo al montar el componente

  React.useEffect(() => {
    // Cargar datos específicos del usuario
    if (user) {
      getProfile(user.id).then((profile) => {
        if (profile?.address_street) {
          setAddress(`${profile.address_street}, ${profile.address_city}`);
        } else {
          setAddress("Configura tu dirección de envío");
        }
      });
    } else {
      setAddress("Dirección no configurada");
    }
  }, [user]);

  if (!isClient) {
      // Return a skeleton or minimal structure during SSR to match initial hydration
      return (
        <div className="border-b bg-background sticky top-0 z-50 h-[120px]">
          {/* Optional: Add skeleton loading state here if needed */}
        </div>
      );
  }

  return (
    <div className="border-b bg-background sticky top-0 z-50">
      {/* Top Bar for Address - Desktop only */}
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

      <div className="flex h-20 items-center px-4 container mx-auto gap-4 md:gap-8 justify-between">
        {/* Mobile Menu Trigger */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <div className="p-2 -ml-2 cursor-pointer">
                <Menu className="h-6 w-6" />
              </div>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px]">
              <div className="sr-only">
                <SheetTitle>Menú de navegación</SheetTitle>
                <SheetDescription>
                  Menú principal para navegar por las secciones de la tienda
                </SheetDescription>
              </div>
              <div className="flex flex-col gap-6 mt-6">
                <div className="flex items-center gap-2">
                  {logoUrl ? (
                    <Image src={logoUrl} alt="Logo" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center">
                      <span className="font-bold text-lg text-primary-foreground">S</span>
                    </div>
                  )}
                  <span className="text-xl font-bold">{storeTitle}</span>
                </div>
                
                {user && (
                  <div className="bg-secondary/30 p-4 rounded-lg">
                    <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Dirección de entrega</p>
                    <p className="text-sm">{address}</p>
                  </div>
                )}

                <nav className="flex flex-col gap-4">
                  <Link href="/skating-store" className="flex items-center gap-2 text-lg font-medium">
                    <LayoutDashboard className="h-5 w-5" /> Inicio
                  </Link>
                  <Link href="/skating-store/catalogo" className="flex items-center gap-2 text-lg font-medium">
                    <Search className="h-5 w-5" /> Catálogo
                  </Link>
                  <Link href="/skating-store/sobre-nosotros" className="flex items-center gap-2 text-lg font-medium">
                    <Info className="h-5 w-5" /> Sobre Nosotros
                  </Link>
                  <Link href="/skating-store/contacto" className="flex items-center gap-2 text-lg font-medium">
                    <Mail className="h-5 w-5" /> Contacto
                  </Link>
                  {isDelivery && (
                    <Link href="/delivery" className="flex items-center gap-2 text-lg font-medium text-primary">
                      <Truck className="h-5 w-5" /> Panel de Reparto
                    </Link>
                  )}
                  {isAdmin && (
                    <Link href="/admin" className="flex items-center gap-2 text-lg font-medium text-primary">
                      <LayoutDashboard className="h-5 w-5" /> Panel Admin
                    </Link>
                  )}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Logo - Centered on mobile if desired, or left aligned */}
        <Link href="/skating-store" className="flex items-center space-x-2 shrink-0">
          {logoUrl ? (
            <Image src={logoUrl} alt="Logo" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center">
              <span className="font-bold text-lg text-primary-foreground">S</span>
            </div>
          )}
          <span className="text-xl font-bold inline-block">{storeTitle}</span>
        </Link>

        {/* Search Bar - Hidden on Mobile initially or icon only */}
        <div className="flex-1 max-w-xl relative hidden md:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search the entire shop" 
            className="pl-12 rounded-2xl bg-secondary border-none h-12 focus-visible:ring-primary shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>

        {/* Navigation Actions */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <Link href="/skating-store" className="flex flex-col items-center gap-1 group hidden md:flex">
             <div className="h-8 w-8 flex items-center justify-center text-primary">
               <LayoutDashboard className="h-6 w-6" /> 
             </div>
             <span className="text-[10px] font-bold">Home</span>
          </Link>

          <Link href="/skating-store/catalogo" className="flex flex-col items-center gap-1 group opacity-60 hover:opacity-100 transition-opacity hidden md:flex">
             <div className="h-8 w-8 flex items-center justify-center">
               <Search className="h-6 w-6" /> 
             </div>
             <span className="text-[10px] font-bold">Catalog</span>
          </Link>

          {/* Search Icon Mobile */}
          <div className="md:hidden flex items-center justify-center h-10 w-10" onClick={() => router.push('/skating-store/catalogo')}>
             <Search className="h-6 w-6" />
          </div>

          <div className="flex flex-col items-center gap-1 group opacity-60 hover:opacity-100 transition-opacity cursor-pointer" onClick={handleCartClick}>
             <div className="h-8 w-8 flex items-center justify-center relative">
               <CartIcon className="hover:bg-transparent" /> 
             </div>
             <span className="text-[10px] font-bold hidden md:inline">Cart</span>
          </div>

          <NotificationBell />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex flex-col items-center gap-1 group opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
                   <div className="h-8 w-8 flex items-center justify-center">
                     <User className="h-6 w-6" /> 
                   </div>
                   <span className="text-[10px] font-bold hidden md:inline">Profile</span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none truncate">{user.email}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {isAdmin ? 'Administrador' : isDelivery ? 'Repartidor' : 'Usuario'}
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
                {isDelivery && (
                  <DropdownMenuItem asChild>
                    <Link href="/delivery">
                      <Truck className="mr-2 h-4 w-4" />
                      Panel de Reparto
                    </Link>
                  </DropdownMenuItem>
                )}
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Panel Admin
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={async () => {
                  await signOut();
                  router.push('/skating-store');
                }}>
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
               <span className="text-[10px] font-bold hidden md:inline">Log In</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
