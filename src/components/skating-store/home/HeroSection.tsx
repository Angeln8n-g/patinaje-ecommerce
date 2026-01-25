import Link from "next/link";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative h-[500px] flex items-center justify-center bg-muted text-center rounded-lg overflow-hidden mb-12">
      <div 
        className="absolute inset-0 bg-cover bg-center z-0 opacity-50"
        style={{ backgroundImage: "url('https://placehold.co/1200x500/png?text=Skate+Park')" }}
      ></div>
      <div className="relative z-10 max-w-2xl px-4">
        <h1 className="text-4xl md:text-6xl font-extrabold mb-4 tracking-tight">
          Domina las Calles
        </h1>
        <p className="text-xl text-foreground/80 mb-8">
          Encuentra el mejor equipo para patinaje urbano y agresivo. Calidad profesional para todos los niveles.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/skating-store/catalogo">
            <Button size="lg" className="text-lg px-8">Ver Catálogo</Button>
          </Link>
          <Link href="/skating-store/sobre-nosotros">
            <Button variant="outline" size="lg" className="text-lg px-8 bg-background/80 backdrop-blur-sm">Conócenos</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
