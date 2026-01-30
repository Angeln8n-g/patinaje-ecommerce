"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle, QrCode, Loader2, Banknote } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getOrderById } from "@/lib/skating-store/supabase-queries";
import { Order } from "@/types/skating-store";
import { QRCodeSVG } from "qrcode.react";
import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(!!orderId);

  useEffect(() => {
    if (orderId) {
      getOrderById(orderId).then((data) => {
        setOrder(data);
        setLoading(false);
      });
    }
  }, [orderId]);

  return (
    <>
      <div className="rounded-full bg-primary/20 p-6 mb-8 animate-in zoom-in duration-500">
        <CheckCircle className="w-20 h-20 text-primary" />
      </div>
      
      <h1 className="text-4xl font-bold mb-6">¡Pedido realizado con éxito!</h1>
      
      {loading ? (
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-10" />
      ) : order?.payment_method === 'cash' ? (
        <div className="bg-muted/30 p-8 rounded-2xl mb-10 max-w-md w-full border border-primary/20 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center justify-center gap-2 mb-4 text-primary">
            <Banknote className="h-6 w-6" />
            <h2 className="text-xl font-bold uppercase tracking-tight">Pago en Efectivo</h2>
          </div>
          
          <p className="text-sm text-muted-foreground mb-6">
            Muestra este código QR al repartidor cuando recibas tu pedido para confirmar el pago.
          </p>
          
          <div className="bg-white p-4 rounded-xl inline-block shadow-inner mb-6">
            <QRCodeSVG 
              value={JSON.stringify({ orderId: order.id, qrToken: order.qr_token })} 
              size={200}
              level="H"
              includeMargin={false}
            />
          </div>
          
          <div className="text-xs text-muted-foreground bg-primary/5 p-3 rounded-lg border border-primary/10">
            <p className="font-semibold text-primary mb-1">ID del Pedido</p>
            <p className="font-mono">{order.id}</p>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground text-lg mb-10 max-w-lg leading-relaxed">
          Gracias por tu compra. Hemos recibido tu pedido correctamente y estamos procesándolo.
          Te enviaremos un correo de confirmación en breve.
        </p>
      )}
      
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center">
        {orderId && (
          <Link href={`/skating-store/tracking/${orderId}`} className="w-full">
            <Button size="lg" className="w-full font-bold text-base h-14 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
              Seguir mi Pedido
            </Button>
          </Link>
        )}
        <Link href="/skating-store/catalogo" className="w-full">
          <Button variant="outline" size="lg" className="w-full font-bold text-base h-14 rounded-xl">
            Seguir Comprando
          </Button>
        </Link>
      </div>
    </>
  );
}

export default function OrderSuccessPage() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-[60vh] py-12 text-center">
      <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-primary" />}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
