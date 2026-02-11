import Image from "next/image";
import { getStaticContent } from "@/lib/skating-store/content-queries";

export const dynamic = 'force-dynamic';

export default async function AboutPage() {
  const content = await getStaticContent("about-us");
  const data = content?.data || {};

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-4xl font-bold mb-8 text-center">{data.title || "Sobre Nosotros"}</h1>
      
      <div className="grid md:grid-cols-2 gap-8 items-center mb-12">
        <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
          <Image 
            src={data.image_url || "https://placehold.co/800x600/png?text=Skate+Shop+Team"} 
            alt="Nuestro equipo" 
            fill 
            className="object-cover"
          />
        </div>
        <div>
          <h2 className="text-2xl font-semibold mb-4">{data.history_title || "Nuestra Historia"}</h2>
          <div className="text-muted-foreground mb-4 whitespace-pre-line">
            {data.history_content || "Información no disponible."}
          </div>
        </div>
      </div>

      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 text-center">{data.mission_title || "Nuestra Misión"}</h2>
        <p className="text-lg text-center text-muted-foreground max-w-2xl mx-auto whitespace-pre-line">
          {data.mission_content || "Información no disponible."}
        </p>
      </div>
    </div>
  );
}
