export default function PoliticaReembolsoPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Política de Reembolso</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Última actualización: 7 de marzo de 2026
      </p>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">1. Derecho de Devolución</h2>
          <p>
            En RD Patina Store, queremos que estés completamente satisfecho con tu compra.
            Si no estás satisfecho con tu pedido, puedes solicitar una devolución dentro
            de los 30 días posteriores a la recepción del producto.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">2. Condiciones para Devoluciones</h2>
          <p>Para que una devolución sea aceptada, el producto debe cumplir con:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Estar en su estado original, sin usar y sin daños</li>
            <li>Incluir todas las etiquetas y empaques originales</li>
            <li>Presentar el comprobante de compra o número de pedido</li>
            <li>No haber sido personalizado o modificado</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">3. Productos No Reembolsables</h2>
          <p>Los siguientes productos no son elegibles para devolución:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Productos en oferta o liquidación (salvo defectos de fábrica)</li>
            <li>Productos personalizados o hechos a medida</li>
            <li>Productos de higiene personal (protectores, cascos usados)</li>
            <li>Tarjetas de regalo o certificados</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">4. Proceso de Devolución</h2>
          <p>Para iniciar una devolución:</p>
          <ol className="list-decimal pl-6 space-y-2">
            <li>Contacta nuestro servicio al cliente a través del formulario de contacto o correo electrónico</li>
            <li>Proporciona tu número de pedido y el motivo de la devolución</li>
            <li>Espera la confirmación y las instrucciones de envío</li>
            <li>Empaca el producto de forma segura con todos sus accesorios</li>
            <li>Envía el paquete a la dirección indicada</li>
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">5. Reembolsos</h2>
          <p>
            Una vez recibido y verificado el producto devuelto, procesaremos tu reembolso
            en un plazo de 5 a 10 días hábiles. El reembolso se realizará mediante el
            mismo método de pago utilizado en la compra original.
          </p>
          <p className="mt-2">
            Los costos de envío originales no son reembolsables, excepto en casos de
            productos defectuosos o errores en el pedido por nuestra parte.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">6. Cambios</h2>
          <p>
            Si deseas cambiar un producto por otro (talla, color, modelo), contacta
            nuestro servicio al cliente. Los cambios están sujetos a disponibilidad
            de inventario.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">7. Productos Defectuosos</h2>
          <p>
            Si recibes un producto defectuoso o dañado, contáctanos inmediatamente.
            Nos haremos cargo de los costos de envío de devolución y te enviaremos
            un reemplazo o reembolso completo, según tu preferencia.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">8. Costos de Envío de Devolución</h2>
          <p>
            Los costos de envío para devoluciones son responsabilidad del cliente,
            excepto en los siguientes casos:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Producto defectuoso o dañado</li>
            <li>Error en el pedido por nuestra parte</li>
            <li>Producto incorrecto enviado</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">9. Contacto</h2>
          <p>
            Para cualquier consulta sobre devoluciones o reembolsos, puedes contactarnos
            a través del formulario de contacto en nuestra tienda o enviando un correo
            electrónico.
          </p>
        </section>
      </div>
    </div>
  );
}
