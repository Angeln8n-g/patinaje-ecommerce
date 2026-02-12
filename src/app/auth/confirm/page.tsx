"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthConfirmPage() {
  const router = useRouter();

  useEffect(() => {
    // With JWT auth, email confirmation is automatic on register.
    // Redirect to store after a brief delay.
    const timer = setTimeout(() => router.push("/skating-store"), 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="bg-card p-8 rounded-2xl border shadow-sm max-w-md w-full text-center space-y-6">
        <div className="mx-auto h-20 w-20 bg-emerald-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-black uppercase italic tracking-tighter">¡Cuenta Verificada!</h1>
          <p className="text-muted-foreground mt-2">Tu cuenta ha sido confirmada. Redirigiendo a la tienda...</p>
        </div>
        <Button onClick={() => router.push("/skating-store")} className="w-full font-black uppercase tracking-widest h-12 rounded-full">
          Ir a la Tienda
        </Button>
      </div>
    </div>
  );
}
