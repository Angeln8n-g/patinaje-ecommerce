import { Navbar } from "@/components/skating-store/layout/Navbar";
import { Footer } from "@/components/skating-store/layout/Footer";
import { SkatingCartProvider } from "@/contexts/SkatingCartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import { CartDrawer } from "@/components/skating-store/cart/CartDrawer";

export default function SkatingStoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <SkatingCartProvider>
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1 container mx-auto px-4 py-8">
            {children}
          </main>
          <Footer />
          <Toaster />
          <CartDrawer />
        </div>
      </SkatingCartProvider>
    </AuthProvider>
  );
}
