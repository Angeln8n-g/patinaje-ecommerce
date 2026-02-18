"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Bell, BellRing, Loader2 } from "lucide-react";
import { Banner } from "@/types/skating-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface PromoCarouselProps {
  banners: Banner[];
}

export function PromoCarousel({ banners }: PromoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitlistBanner, setWaitlistBanner] = useState<Banner | null>(null);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistName, setWaitlistName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subscribedIds, setSubscribedIds] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.hunykho.com";

  // Helper to validate image URL
  const getValidImageUrl = (url: string) => {
    if (!url) return "https://placehold.co/1200x500/png?text=No+Image";
    if (url.startsWith("/")) return url;
    try {
      new URL(url);
      return url;
    } catch {
      return "https://placehold.co/1200x500/png?text=Invalid+Image";
    }
  };

  // Auto-advance
  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [banners.length]);

  if (!banners || banners.length === 0) {
    return null; // Or return default hero
  }

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const handleWaitlistOpen = (banner: Banner) => {
    setWaitlistBanner(banner);
    if (user) {
      setWaitlistEmail((user as any).email || "");
      setWaitlistName((user as any).first_name || "");
    }
    setWaitlistOpen(true);
  };

  const handleWaitlistSubmit = async () => {
    if (!waitlistBanner || !waitlistEmail) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/promotions/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          banner_id: waitlistBanner.id,
          email: waitlistEmail,
          name: waitlistName || undefined,
        }),
      });
      const data = await res.json();
      if (data.already_subscribed) {
        toast.info("Ya estás inscrito en esta promoción");
      } else if (data.id) {
        toast.success("¡Te avisaremos cuando la promo esté activa!");
      } else {
        toast.error(data.error || "Error al inscribirse");
      }
      setSubscribedIds(prev => new Set(prev).add(waitlistBanner.id));
      setWaitlistOpen(false);
      setWaitlistEmail("");
      setWaitlistName("");
    } catch {
      toast.error("Error al inscribirse en la lista de espera");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to check if URL is a video
  const isVideo = (url: string) => {
    return url.toLowerCase().match(/\.(mp4|webm|ogg)$/);
  };

  return (
    <section className="relative w-full overflow-hidden mb-12 group rounded-[32px] aspect-[16/9] md:aspect-[21/9]">
      {/* Slides */}
      {banners.map((banner, index) => (
        <div
          key={banner.id}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
          {/* Background Media */}
          <div className="absolute inset-0">
            {isVideo(banner.image_url) ? (
              <video
                src={banner.image_url}
                className="w-full h-full object-cover"
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              <Image
                src={getValidImageUrl(banner.image_url)}
                alt={banner.title}
                fill
                className="object-cover object-center scale-105 transition-transform duration-[10s] ease-linear"
                style={{
                  transform: index === currentIndex ? 'scale(1.1)' : 'scale(1)'
                }}
                priority={index === 0}
                unoptimized={banner.image_url.toLowerCase().endsWith('.gif')}
              />
            )}
            {/* Overlay - Gradient for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent md:bg-gradient-to-b md:from-black/40 md:to-black/60" />
          </div>

          {/* Content */}
          <div className="relative z-20 flex flex-col items-center justify-center h-full text-center px-6 max-w-5xl mx-auto text-white">
            {banner.promo_status === "upcoming" && (
              <span className="inline-flex items-center gap-1.5 bg-amber-500/90 text-white text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider backdrop-blur-sm">
                <Bell className="h-3 w-3" /> Próximamente
              </span>
            )}
            <h2 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 tracking-tighter drop-shadow-2xl uppercase italic">
              {banner.title}
            </h2>
            {banner.description && (
              <p className="text-xl md:text-2xl lg:text-3xl mb-10 drop-shadow-md max-w-3xl font-medium leading-tight text-white/90">
                {banner.description}
              </p>
            )}
            <div className="flex items-center gap-4 flex-wrap justify-center">
              {banner.link_url && banner.promo_status !== "upcoming" && (
                <Link href={banner.link_url}>
                  <Button size="lg" className="text-xl px-12 py-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 font-black uppercase tracking-widest border-none glow-primary">
                    Ver Oferta
                  </Button>
                </Link>
              )}
              {banner.promo_status === "upcoming" && !subscribedIds.has(banner.id) && (
                <Button
                  size="lg"
                  onClick={() => handleWaitlistOpen(banner)}
                  className="text-xl px-10 py-8 rounded-full bg-amber-500 hover:bg-amber-600 text-white transition-all duration-300 font-bold uppercase tracking-wider border-none animate-pulse hover:animate-none"
                >
                  <Bell className="mr-2 h-5 w-5" />
                  Avísame
                </Button>
              )}
              {banner.promo_status === "upcoming" && subscribedIds.has(banner.id) && (
                <span className="inline-flex items-center gap-2 text-lg bg-green-500/80 text-white px-8 py-4 rounded-full font-bold backdrop-blur-sm">
                  <BellRing className="h-5 w-5" />
                  ¡Te avisaremos!
                </span>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Controls */}
      {banners.length > 1 && (
        <>
          <div className="absolute inset-y-0 left-0 w-24 z-30 flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-14 w-14 rounded-full bg-black/10 text-white hover:bg-primary hover:text-primary-foreground transition-all duration-300 backdrop-blur-sm opacity-0 group-hover:opacity-100"
              onClick={prevSlide}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
          </div>
          <div className="absolute inset-y-0 right-0 w-24 z-30 flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-14 w-14 rounded-full bg-black/10 text-white hover:bg-primary hover:text-primary-foreground transition-all duration-300 backdrop-blur-sm opacity-0 group-hover:opacity-100"
              onClick={nextSlide}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </div>

          {/* Indicators */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex gap-3">
            {banners.map((_, index) => (
              <button
                key={index}
                className={`h-1.5 transition-all duration-500 rounded-full ${
                  index === currentIndex ? "bg-primary w-12" : "bg-white/30 w-6 hover:bg-white/60"
                }`}
                onClick={() => setCurrentIndex(index)}
              />
            ))}
          </div>
        </>
      )}

      {/* Waitlist Subscription Modal */}
      <Dialog open={waitlistOpen} onOpenChange={setWaitlistOpen}>
        <DialogContent className="max-w-md z-50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-500" />
              Recibir aviso de promoción
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {waitlistBanner && (
              <div className="rounded-lg overflow-hidden border">
                <div className="relative h-32 w-full">
                  <Image
                    src={waitlistBanner.image_url || "https://placehold.co/400x200/png"}
                    alt={waitlistBanner.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-2 left-3 text-white">
                    <p className="font-bold text-sm">{waitlistBanner.title}</p>
                  </div>
                </div>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Déjanos tu correo y te avisaremos cuando esta promoción esté activa.
            </p>
            <div className="space-y-2">
              <Label htmlFor="waitlist-name">Nombre (opcional)</Label>
              <Input
                id="waitlist-name"
                value={waitlistName}
                onChange={(e) => setWaitlistName(e.target.value)}
                placeholder="Tu nombre"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="waitlist-email">Correo electrónico</Label>
              <Input
                id="waitlist-email"
                type="email"
                value={waitlistEmail}
                onChange={(e) => setWaitlistEmail(e.target.value)}
                placeholder="tu@correo.com"
                required
              />
            </div>
            <Button
              className="w-full"
              onClick={handleWaitlistSubmit}
              disabled={!waitlistEmail || isSubmitting}
            >
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Inscribiendo...</>
              ) : (
                <><Bell className="mr-2 h-4 w-4" /> Inscribirme</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
