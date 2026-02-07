"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { submitDeliveryRating } from "@/lib/skating-store/rating-actions";
import { cn } from "@/lib/utils";

interface DeliveryRatingDialogProps {
  orderId: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  onRatingSubmitted?: () => void;
}

export function DeliveryRatingDialog({ 
  orderId, 
  isOpen: controlledOpen, 
  onOpenChange: controlledOnOpenChange,
  trigger,
  onRatingSubmitted 
}: DeliveryRatingDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const onOpenChange = controlledOnOpenChange || setInternalOpen;

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Por favor selecciona una puntuación");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitDeliveryRating(orderId, rating, comment);
      toast.success("¡Gracias por tu valoración!");
      onOpenChange(false);
      if (onRatingSubmitted) onRatingSubmitted();
    } catch (error) {
      toast.error("Error al enviar la valoración");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Valorar Entrega</DialogTitle>
          <DialogDescription>
            ¿Qué tal fue el servicio del repartidor? Tu opinión nos ayuda a mejorar.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="focus:outline-none transition-transform hover:scale-110"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
              >
                <Star
                  className={cn(
                    "h-10 w-10 transition-colors",
                    (hoverRating || rating) >= star
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground/30"
                  )}
                />
              </button>
            ))}
          </div>
          
          <div className="w-full space-y-2">
            <label className="text-sm font-medium">Comentario (opcional)</label>
            <Textarea
              placeholder="El repartidor fue muy amable y puntual..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || rating === 0}>
            {isSubmitting ? "Enviando..." : "Enviar Valoración"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
