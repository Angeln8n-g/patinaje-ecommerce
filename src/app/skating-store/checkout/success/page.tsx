import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

export default function OrderSuccessPage() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-[60vh] py-12 text-center">
      <div className="rounded-full bg-primary/20 p-6 mb-8 animate-in zoom-in duration-500">
        <CheckCircle className="w-20 h-20 text-primary" />
      </div>
      
      <h1 className="text-4xl font-bold mb-6">¡Pedido realizado con éxito!</h1>
      
      <p className="text-muted-foreground text-lg mb-10 max-w-lg leading-relaxed">
        Gracias por tu compra. Hemos recibido tu pedido correctamente y estamos procesándolo.
        Te enviaremos un correo de confirmación en breve.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm justify-center">
        <Link href="/skating-store/catalogo" className="w-full">
          <Button size="lg" className="w-full font-bold text-base h-14 rounded-xl">
            Seguir Comprando
          </Button>
        </Link>
        <Link href="/skating-store" className="w-full">
          <Button variant="outline" size="lg" className="w-full font-bold text-base h-14 rounded-xl">
            Volver al Inicio
          </Button>
        </Link>
      </div>
    </div>
  );
}
