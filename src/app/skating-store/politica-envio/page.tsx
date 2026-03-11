export default function PoliticaEnvioPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Política de Envío</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Última actualización: 7 de marzo de 2026
      </p>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">1. Zonas de Envío</h2>
          <p>
            Realizamos envíos a todo el territorio de la República Dominicana.
            Las zonas de envío y sus tarifas se calculan automáticamente durante
            el proceso de checkout según tu ubicación.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">2. Tiempos de Procesamiento</h2>
          <p>
            Los pedidos se procesan de lunes a viernes, de 9:00 AM a 6:00 PM.
            Los pedidos realizados después de las 3:00 PM o durante fines de semana
            y días festivos se procesarán el siguiente día hábil.
          </p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>Procesamiento del pedido: 1-2 días hábiles</li>
            <li>Preparación y empaque: 1 día hábil</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">3. Tiempos de Entrega</h2>
          <p>Los tiempos de entrega varían según la zona:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Santo Domingo y Distrito Nacional: 2-3 días hábiles</li>
            <li>Santiago y ciudades principales: 3-5 días hábiles</li>
            <li>Otras provincias: 5-7 días hábiles</li>
            <li>Zonas rurales: 7-10 días hábiles</li>
          </ul>
          <p className="mt-2">
            Estos tiempos son estimados y pueden variar por condiciones climáticas,
            días festivos o situaciones fuera de nuestro control.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">4. Costos de Envío</h2>
          <p>
            Los costos de envío se calculan automáticamente según:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Zona de entrega</li>
            <li>Peso y dimensiones del paquete</li>
            <li>Método de envío seleccionado</li>
          </ul>
          <p className="mt-2">
            Ofrecemos envío gratuito en pedidos superiores a RD$3,000 dentro del
            Distrito Nacional y Santo Domingo.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">5. Seguimiento de Pedidos</h2>
          <p>
            Una vez que tu pedido sea enviado, recibirás un correo electrónico con:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Número de seguimiento</li>
            <li>Enlace para rastrear tu pedido en tiempo real</li>
            <li>Fecha estimada de entrega</li>
          </ul>
          <p className="mt-2">
            También puedes rastrear tu pedido desde tu perfil en la sección
            &quot;Mis Pedidos&quot;.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">6. Métodos de Envío</h2>
          <p>Trabajamos con empresas de mensajería confiables:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Envío estándar (2-7 días hábiles según zona)</li>
            <li>Envío express (1-3 días hábiles, disponible en zonas seleccionadas)</li>
            <li>Retiro en tienda (sin costo, disponible previa coordinación)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">7. Recepción del Pedido</h2>
          <p>
            Al recibir tu pedido, te recomendamos:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Verificar que el paquete esté en buenas condiciones</li>
            <li>Revisar que todos los productos estén incluidos</li>
            <li>Reportar cualquier daño o faltante inmediatamente al mensajero</li>
            <li>Firmar el comprobante de entrega solo si todo está correcto</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">8. Problemas con la Entrega</h2>
          <p>
            Si tu pedido no llega en el tiempo estimado o hay algún problema:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Verifica el estado del seguimiento en línea</li>
            <li>Contacta nuestro servicio al cliente con tu número de pedido</li>
            <li>Investigaremos y resolveremos el problema en un plazo de 48 horas</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">9. Direcciones de Entrega</h2>
          <p>
            Es tu responsabilidad proporcionar una dirección de entrega completa y
            correcta. No nos hacemos responsables por retrasos o devoluciones causadas
            por información incorrecta.
          </p>
          <p className="mt-2">
            Si necesitas cambiar la dirección de entrega, contáctanos inmediatamente.
            Solo podemos modificarla si el pedido aún no ha sido enviado.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">10. Paquetes No Reclamados</h2>
          <p>
            Si un paquete es devuelto por no ser reclamado o por dirección incorrecta,
            contactaremos contigo para coordinar un nuevo envío. Los costos adicionales
            de reenvío serán responsabilidad del cliente.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">11. Contacto</h2>
          <p>
            Para consultas sobre envíos, puedes contactarnos a través del formulario
            de contacto en nuestra tienda o enviando un correo electrónico.
          </p>
        </section>
      </div>
    </div>
  );
}
