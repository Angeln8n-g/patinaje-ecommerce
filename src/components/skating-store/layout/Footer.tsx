import { Facebook, Instagram, Twitter } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto px-4 py-10">
        <div className="flex flex-col gap-8">
          {/* Links Section */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
            <Link 
              href="/skating-store/privacidad" 
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Política de privacidad
            </Link>
            <Link 
              href="/skating-store/politica-reembolso" 
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Política de reembolso
            </Link>
            <Link 
              href="/skating-store/politica-envio" 
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Política de envío
            </Link>
            <Link 
              href="/skating-store/terminos-condiciones" 
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Términos y condiciones
            </Link>
          </div>

          {/* Bottom Section */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
              Built for Angel Santana. © 2026 RD Patina Store. All rights reserved.
            </p>
            <div className="flex items-center space-x-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Facebook className="h-5 w-5" />
                <span className="sr-only">Facebook</span>
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Instagram className="h-5 w-5" />
                <span className="sr-only">Instagram</span>
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="h-5 w-5" />
                <span className="sr-only">Twitter</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
