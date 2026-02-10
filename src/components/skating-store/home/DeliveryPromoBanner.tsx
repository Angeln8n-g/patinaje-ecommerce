import { PromoTextBanner } from "@/types/skating-store";
import Image from "next/image";

interface DeliveryPromoBannerProps {
  promo?: PromoTextBanner | null;
}

export function DeliveryPromoBanner({ promo }: DeliveryPromoBannerProps) {
  // If no promo is passed or active, don't render (or render default if desired, but user wants to edit it)
  // For now, if no promo, we can render the default static one OR return null. 
  // Let's fallback to the default static content if null, to ensure the UI doesn't break while they configure it,
  // OR use the DB data. 
  
  // If we have DB data, use it.
  const prefix = promo?.prefix_text || "Delivery is";
  const highlight = promo?.highlight_text || "50%";
  const suffix = promo?.suffix_text || "cheaper";
  const bgColor = promo?.bg_color || "#E9F7E8";
  const imageUrl = promo?.image_url;

  // Check for video file extension
  const isVideo = (url?: string) => {
    return url?.toLowerCase().match(/\.(mp4|webm|ogg)$/);
  };

  return (
    <div className="container mx-auto px-4 mt-6 mb-8">
      <div 
        className="rounded-[32px] p-6 md:p-8 flex items-center justify-between relative overflow-hidden h-28 md:h-32 bg-card border border-border"
        style={imageUrl ? { backgroundColor: bgColor } : undefined}
      >
        {/* Background Media (Image/Gif/Video) */}
        {imageUrl && (
          <div className="absolute inset-0 z-0 opacity-100">
             {isVideo(imageUrl) ? (
                <video
                  src={imageUrl}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
             ) : (
                <Image 
                  src={imageUrl} 
                  alt="Promo Background" 
                  fill 
                  className="object-cover"
                  unoptimized={imageUrl.toLowerCase().endsWith('.gif')}
                />
             )}
             {/* Optional overlay if text needs better contrast */}
             {/* <div className="absolute inset-0 bg-black/10"></div> */}
          </div>
        )}

        <div className="flex items-center gap-3 md:gap-4 z-10 relative">
          <span className="font-bold text-xl md:text-2xl text-foreground drop-shadow-sm">{prefix}</span>
          <span className="bg-primary/10 border border-primary/30 text-primary px-3 py-1 md:px-4 md:py-1.5 rounded-full text-lg md:text-xl font-extrabold shadow-sm">
            {highlight}
          </span>
          <span className="text-foreground text-lg md:text-xl font-medium drop-shadow-sm">{suffix}</span>
        </div>
        
        {/* Abstract shapes - Only show if NO image is provided, to keep original design as fallback */}
        {!imageUrl && (
          <div className="absolute right-0 top-0 h-full w-1/3 md:w-1/4 z-0">
             <div className="absolute right-[-20%] top-[-50%] w-[150%] h-[200%] bg-primary/20 rounded-full blur-3xl"></div>
             <div className="absolute right-[10%] bottom-[-20%] w-24 h-24 bg-primary rounded-full opacity-80 mix-blend-multiply"></div>
             <div className="absolute right-[-5%] top-[20%] w-16 h-16 bg-primary/60 rounded-full opacity-60"></div>
          </div>
        )}
      </div>
    </div>
  );
}
