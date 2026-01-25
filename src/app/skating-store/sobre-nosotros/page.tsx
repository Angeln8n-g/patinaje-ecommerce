import Image from "next/image";

export default function AboutPage() {
  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-4xl font-bold mb-8 text-center">Sobre Nosotros</h1>
      
      <div className="grid md:grid-cols-2 gap-8 items-center mb-12">
        <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
          <Image 
            src="https://placehold.co/800x600/png?text=Skate+Shop+Team" 
            alt="Nuestro equipo" 
            fill 
            className="object-cover"
          />
        </div>
        <div>
          <h2 className="text-2xl font-semibold mb-4">Nuestra Historia</h2>
          <p className="text-muted-foreground mb-4">
            Fundada en 2026, Skating Store nació de la pasión por el patinaje urbano. 
            Empezamos como un pequeño grupo de amigos patinando en las calles y ahora somos 
            la tienda líder en equipamiento profesional.
          </p>
          <p className="text-muted-foreground">
            Creemos que el patinaje es más que un deporte, es un estilo de vida y una forma de expresión.
          </p>
        </div>
      </div>

      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 text-center">Nuestra Misión</h2>
        <p className="text-lg text-center text-muted-foreground max-w-2xl mx-auto">
          Proporcionar el mejor equipo a patinadores de todos los niveles, fomentando la comunidad 
          y apoyando el crecimiento del deporte en nuestra ciudad.
        </p>
      </div>
    </div>
  );
}
