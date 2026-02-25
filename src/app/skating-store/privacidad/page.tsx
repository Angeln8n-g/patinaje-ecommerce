export default function PrivacidadPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Política de Privacidad</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Última actualización: 24 de febrero de 2026
      </p>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">1. Responsable del Tratamiento</h2>
          <p>
            Hunykho Store (en adelante &quot;nosotros&quot;), operando a través del sitio web
            hunykho.com, es responsable del tratamiento de los datos personales
            recopilados a través de esta plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">2. Datos que Recopilamos</h2>
          <p>Recopilamos los siguientes datos personales:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Nombre y apellido</li>
            <li>Dirección de correo electrónico</li>
            <li>Número de teléfono</li>
            <li>Dirección de envío (calle, ciudad, estado, código postal, país)</li>
            <li>Datos de pedidos y transacciones</li>
            <li>Dirección IP y datos de navegación</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">3. Finalidad del Tratamiento</h2>
          <p>Utilizamos tus datos para:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Procesar y entregar tus pedidos</li>
            <li>Gestionar tu cuenta de usuario</li>
            <li>Enviar notificaciones sobre el estado de tus pedidos</li>
            <li>Enviar comunicaciones sobre promociones (solo si te inscribes voluntariamente)</li>
            <li>Generar comprobantes fiscales cuando sea requerido</li>
            <li>Mejorar nuestros servicios y experiencia de usuario</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">4. Base Legal</h2>
          <p>
            El tratamiento de tus datos se basa en: (a) la ejecución del contrato de
            compraventa al realizar un pedido, (b) tu consentimiento al registrarte
            en la plataforma, y (c) nuestro interés legítimo en prevenir fraudes y
            mejorar nuestros servicios.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">5. Proveedores de Servicios</h2>
          <p>Compartimos datos con los siguientes proveedores para operar el servicio:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Google</strong> — Autenticación OAuth 2.0 (si eliges iniciar sesión con Google)
            </li>
            <li>
              <strong>Resend</strong> — Envío de correos electrónicos transaccionales
            </li>
            <li>
              <strong>Cloudflare</strong> — Almacenamiento de imágenes de productos
            </li>
            <li>
              <strong>DGII</strong> — Facturación fiscal electrónica (cuando se emiten comprobantes)
            </li>
          </ul>
          <p className="mt-2">
            No vendemos ni compartimos tus datos personales con terceros para fines
            publicitarios.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">6. Tus Derechos</h2>
          <p>Tienes derecho a:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Acceso</strong> — Consultar tus datos personales desde tu perfil
            </li>
            <li>
              <strong>Rectificación</strong> — Actualizar tus datos desde la sección de perfil
            </li>
            <li>
              <strong>Eliminación</strong> — Solicitar la eliminación de tu cuenta y datos
              personales desde la sección de perfil. Tus datos serán anonimizados y los
              datos asociados a pedidos se conservarán de forma no identificable por
              obligaciones legales y fiscales
            </li>
            <li>
              <strong>Portabilidad</strong> — Solicitar una copia de tus datos en formato
              legible contactándonos por correo electrónico
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">7. Seguridad</h2>
          <p>
            Implementamos medidas de seguridad técnicas y organizativas para proteger
            tus datos, incluyendo: cifrado de contraseñas, conexiones HTTPS, tokens
            de autenticación seguros, validación y sanitización de datos de entrada,
            y control de acceso basado en roles.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">8. Retención de Datos</h2>
          <p>
            Conservamos tus datos personales mientras mantengas una cuenta activa.
            Los datos de pedidos y transacciones se conservan por el período requerido
            por la legislación fiscal dominicana. Al eliminar tu cuenta, tus datos
            personales son anonimizados de forma irreversible.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">9. Cookies</h2>
          <p>
            Utilizamos una cookie de sesión httpOnly (<code>skating_token</code>) necesaria
            para mantener tu sesión iniciada. Esta cookie no se utiliza para rastreo
            ni publicidad.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">10. Contacto</h2>
          <p>
            Para ejercer tus derechos o realizar consultas sobre esta política,
            puedes contactarnos a través del formulario de contacto en nuestra
            tienda o enviando un correo electrónico.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">11. Modificaciones</h2>
          <p>
            Nos reservamos el derecho de actualizar esta política. Cualquier cambio
            será publicado en esta página con la fecha de actualización correspondiente.
          </p>
        </section>
      </div>
    </div>
  );
}
