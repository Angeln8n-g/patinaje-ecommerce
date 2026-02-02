"use client";

import { useSkatingCart } from "@/contexts/SkatingCartContext";
import { CartItem } from "@/components/skating-store/cart/CartItem";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { MapPin, MoreHorizontal, Share2, Check } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function CartPage() {
  const { items, total, itemCount, clearCart } = useSkatingCart();

  if (items.length === 0) {
    return (
      <div className="container py-20 text-center">
        <h1 className="text-3xl font-bold mb-4">Your cart is empty</h1>
        <Link href="/skating-store/catalogo">
          <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">Go to Catalog</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Cart</h1>
        <Button variant="ghost" size="icon" className="rounded-full bg-secondary">
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="grid gap-12 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Address Block */}
          <div className="bg-secondary/30 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                <MapPin className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="font-medium">92 High Street, London</span>
            </div>
            <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Select All Header */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-4">
              <div className="h-6 w-6 rounded-full bg-[#D7F000] flex items-center justify-center text-black">
                <Check className="h-4 w-4" />
              </div>
              <span className="font-bold">Select all</span>
            </div>
            <div className="flex items-center gap-4 text-muted-foreground">
              <Share2 className="h-5 w-5 cursor-pointer hover:text-foreground" />
              {/* Add delete icon if needed for selected items */}
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-2">
            {items.map((item) => (
              <CartItem key={item.product.id} item={item} />
            ))}
          </div>
        </div>
        
        <div className="lg:col-span-1">
          <div className="bg-card sticky top-24 space-y-6">
            <Link href="/skating-store/checkout" className="w-full block">
              <Button className="w-full h-14 text-lg font-bold rounded-2xl bg-[#D7F000] text-black hover:bg-[#CBE600] shadow-sm transition-transform active:scale-95" size="lg">
                Checkout
              </Button>
            </Link>
            
            {/* Simple Bottom Nav mimic if desired, or just summary info */}
            <div className="bg-secondary/30 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery</span>
                <span className="font-medium text-emerald-600">Free</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-xl">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
