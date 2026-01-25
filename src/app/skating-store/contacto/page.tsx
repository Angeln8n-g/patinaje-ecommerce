import { ContactForm } from "@/components/skating-store/contact/ContactForm";
import { Mail, MapPin, Phone } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-4xl font-bold mb-8 text-center">Contáctanos</h1>
      
      <div className="grid md:grid-cols-2 gap-12">
        <div>
          <h2 className="text-2xl font-semibold mb-6">Envíanos un mensaje</h2>
          <ContactForm />
        </div>
        
        <div className="space-y-8">
          <h2 className="text-2xl font-semibold mb-6">Información de Contacto</h2>
          
          <div className="flex items-start gap-4">
            <MapPin className="h-6 w-6 text-primary mt-1" />
            <div>
              <h3 className="font-medium">Dirección</h3>
              <p className="text-muted-foreground">Av. del Patinaje 123<br />Madrid, 28001</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <Phone className="h-6 w-6 text-primary mt-1" />
            <div>
              <h3 className="font-medium">Teléfono</h3>
              <p className="text-muted-foreground">+34 912 345 678</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <Mail className="h-6 w-6 text-primary mt-1" />
            <div>
              <h3 className="font-medium">Email</h3>
              <p className="text-muted-foreground">info@skatingstore.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
