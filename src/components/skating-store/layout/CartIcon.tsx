"use client";

import { ShoppingCart } from "lucide-react";
import { useSkatingCart } from "@/contexts/SkatingCartContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CartIconProps {
  className?: string;
  onClick?: () => void;
}

export function CartIcon({ className, onClick }: CartIconProps) {
  const { itemCount } = useSkatingCart();

  return (
    <Button variant="ghost" size="icon" className={cn("relative", className)} onClick={onClick}>
      <ShoppingCart className="h-6 w-6" />
      {itemCount > 0 && (
        <Badge 
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full"
          variant="destructive"
        >
          {itemCount}
        </Badge>
      )}
      <span className="sr-only">Open cart</span>
    </Button>
  );
}
