"use client";

import { useState, useEffect } from "react";
import { Review } from "@/types/skating-store";
import { getProductReviews, createProductReview, getProfile, hasPurchasedProduct } from "@/lib/skating-store/supabase-queries";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, MessageCircle, User as UserIcon, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface ProductReviewsProps {
  productId: string;
}

export function ProductReviews({ productId }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [canReview, setCanReview] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: "" });
  const supabase = createClient();

  useEffect(() => {
    fetchReviews();
    checkUser();
  }, [productId]);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    if (user) {
      const eligible = await hasPurchasedProduct(user.id, productId);
      setCanReview(eligible);
    }
  }

  async function fetchReviews() {
    setLoading(true);
    try {
      const data = await getProductReviews(productId);
      setReviews(data);
    } catch (error: any) {
      console.error("Error fetching reviews:", error);
      // Si el error es que la tabla no existe, no mostramos error en consola repetidamente
      if (error?.code === 'PGRST205') {
        setReviews([]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      toast.error("Debes iniciar sesión para dejar una reseña");
      return;
    }

    if (!newReview.comment.trim()) {
      toast.error("Por favor escribe un comentario");
      return;
    }

    setSubmitting(true);
    try {
      const profile = await getProfile(user.id);
      const userName = profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() : user.email.split("@")[0];

      const review = await createProductReview({
        product_id: productId,
        user_id: user.id,
        user_name: userName || "Usuario",
        rating: newReview.rating,
        comment: newReview.comment,
      });

      setReviews([review, ...reviews]);
      setNewReview({ rating: 5, comment: "" });
      toast.success("¡Gracias por tu reseña!");
    } catch (error) {
      toast.error("Error al enviar la reseña");
    } finally {
      setSubmitting(false);
    }
  }

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-8 mt-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-primary" />
            Reseñas del Producto
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "h-4 w-4",
                    star <= Number(averageRating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                  )}
                />
              ))}
            </div>
            <span className="font-bold text-sm">{averageRating} de 5</span>
            <span className="text-muted-foreground text-sm">({reviews.length} valoraciones)</span>
          </div>
        </div>
      </div>

      <Separator />

      {!user ? (
        <div className="bg-muted/30 p-6 rounded-xl border text-center">
          <p className="text-muted-foreground mb-4">Debes iniciar sesión para dejar una reseña</p>
          <Button variant="outline" asChild>
            <a href="/login">Iniciar Sesión</a>
          </Button>
        </div>
      ) : !canReview ? (
        <div className="bg-amber-50/50 p-6 rounded-xl border border-amber-100 flex flex-col items-center text-center">
          <ShieldCheck className="h-10 w-10 text-amber-500 mb-3" />
          <h3 className="text-sm">Reseña exclusiva para compradores</h3>
          <p className="text-amber-800/70 text-sm mt-2 max-w-md font-sans not-italic tracking-normal lowercase first-letter:uppercase">
            Solo los usuarios que han comprado y recibido este producto pueden dejar una reseña. 
            ¡Asegúrate de completar tu pedido para compartir tu experiencia!
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmitReview} className="bg-muted/30 p-6 rounded-xl border space-y-4">
          <h3 className="text-sm">Deja tu opinión</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Tu valoración:</span>
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setNewReview({ ...newReview, rating: star })}
                  className="hover:scale-110 transition-transform"
                >
                  <Star
                    className={cn(
                      "h-6 w-6 transition-colors",
                      star <= newReview.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
          <Textarea
            placeholder="Comparte tu experiencia con este producto..."
            value={newReview.comment}
            onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
            className="min-h-[100px] bg-background"
          />
          <Button 
            type="submit" 
            disabled={submitting}
            className="w-full md:w-auto font-black uppercase tracking-widest px-8"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Publicar Reseña
          </Button>
        </form>
      )}

      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : reviews.length > 0 ? (
          reviews.map((review) => (
            <div key={review.id} className="space-y-3 bg-card p-5 rounded-xl border shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-sm leading-none">{review.user_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(review.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        "h-3 w-3",
                        star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20"
                      )}
                    />
                  ))}
                </div>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed italic">
                "{review.comment}"
              </p>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Aún no hay reseñas para este producto.</p>
            <p className="text-sm">¡Sé el primero en compartir tu opinión!</p>
          </div>
        )}
      </div>
    </div>
  );
}