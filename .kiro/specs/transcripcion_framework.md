# Entregar Apps de IA con Antigravity (Lo que NADIE Enseña)

---

## APARTADO A
## Radiografía del Proyecto

Antes de auditar nada, necesitas tener claro qué tienes entre manos. Responde a estas preguntas para trazar el mapa de riesgos:

- **01** ¿Cuál es el propósito central de la aplicación y qué necesidad cubre?
- **02** ¿Qué stack técnico se ha usado? Detalla frontend, backend, BBDD y hosting.
- **03** ¿Qué servicios o APIs de terceros consume el sistema?
- **04** ¿Quién interactuará con el producto? (equipo del cliente, sus usuarios finales, público abierto)
- **05** ¿Qué categoría de datos maneja? (identificativos, financieros, clínicos, operativos)
- **06** ¿En qué infraestructura está alojado? (Vercel, Railway, AWS, servidor propio...)
- **07** ¿Implementa algún mecanismo de autenticación? ¿Cuál? (OAuth, JWT, sesiones, API keys)
- **08** ¿Intervienen pagos, suscripciones o datos financieros sensibles?

---

## APARTADO B
## Salud del Ecosistema de Paquetes

### B.1 — Detección de Fallos de Seguridad en Librerías

Pide al usuario que lance estos comandos y te comparta el resultado:

```bash
# JavaScript/Node:
npm audit

# Python:
pip-audit
```

Ante cada problema encontrado:
- [OK] Determinar nivel de gravedad (crítico, alto, medio, bajo)
- [OK] Evaluar si el fallo es aprovechable en el contexto real del proyecto
- [OK] Sugerir vía de actualización o librería sustituta

### B.2 — Librerías Obsoletas

Lanzar:

```bash
# JavaScript/Node:
npm outdated

# Python:
pip list --outdated
```

- [AMAR] Cualquier paquete que lleve 2+ versiones mayores de retraso debe marcarse

### B.3 — Fiabilidad de las Dependencias

Analizar cada dependencia relevante:
- [OK] ¿El proyecto se mantiene activo? Revisar frecuencia de commits, issues pendientes, comunidad de contribuyentes
- [OK] ¿Hay antecedentes de brechas de seguridad en esa librería?
- [OK] ¿Qué alternativa existe si el paquete deja de recibir soporte?
- [OK] ¿Sobran dependencias que podrían eliminarse para aligerar el proyecto?

### B.4 — Revisión de Licencias

Ejecutar:

```bash
# JavaScript/Node:
npx license-checker --summary

# Python:
pip-licenses
```

- [AMAR] Detectar licencias restrictivas (GPL, AGPL) en software destinado a explotación comercial
- [OK] Asegurar compatibilidad de todas las licencias con el modelo de entrega al cliente

---

## APARTADO C
## Blindaje de Seguridad

### C.1 — Identidad y Permisos

- [ROJO] Contraseñas cifradas con algoritmos robustos (bcrypt, scrypt, argon2). Descartados MD5 y SHA-1
- [OK] Rate limiting activo en el flujo de login
- [OK] Tokens de sesión (JWT u otro) configurados con caducidad razonable
- [OK] Cierre de sesión que realmente invalida el token/sesión
- [OK] Credenciales sensibles almacenadas exclusivamente en variables de entorno
- [OK] Sistema de roles y permisos (RBAC) donde el negocio lo requiera
- [OK] Cada endpoint protegido verifica permisos antes de responder
- [OK] MFA habilitado para perfiles de administración

### C.2 — Saneamiento de Datos de Entrada

- [OK] Toda entrada del usuario validada y limpia en el servidor, nunca solo en el cliente
- [OK] Consultas a BBDD siempre parametrizadas (cero concatenación de SQL)
- [OK] Archivos subidos validados por extensión, peso y contenido real
- [OK] Mecanismo anti-XSS implementado
- [OK] Protección contra CSRF en operaciones que alteran estado
- [OK] Schemas de validación definidos para los cuerpos de las peticiones API

### C.3 — Custodia de la Información

- [OK] Comunicaciones cifradas extremo a extremo (HTTPS/TLS)
- [OK] Datos sensibles cifrados en reposo dentro de la BBDD
- [OK] Tratamiento de datos personales alineado con la normativa vigente
- [OK] Backups de BBDD cifrados
- [OK] Política de retención y ciclo de vida de los datos establecida
- [OK] Logs depurados de información innecesariamente sensible
- [OK] Respuestas de error genéricas, sin exponer trazas ni rutas del sistema

### C.4 — Superficie de Exposición de la API

- [OK] Endpoints no públicos debidamente protegidos
- [OK] Límites de peticiones por minuto en los endpoints abiertos
- [OK] Política CORS configurada sin comodines en producción
- [OK] Versionado de la API activo
- [OK] Webhooks entrantes verificados por firma criptográfica
- [OK] Tamaño máximo de payload controlado para prevenir ataques de denegación

### C.5 — Entorno Operativo

- [OK] Secretos gestionados mediante variables de entorno o herramienta dedicado (Doppler, Infisical...)
- [OK] Archivo .env fuera del control de versiones
- [OK] Aislamiento total entre entornos de producción y desarrollo
- [OK] Superficie de red minimizada: solo los puertos y servicios estrictamente necesarios
- [OK] Credenciales de fábrica reemplazadas en todos los servicios
- [OK] Registro de eventos de seguridad activado (intentos de login, denegaciones de acceso)
- [OK] Contenedores ejecutándose sin privilegios de root (si aplica)

---

## APARTADO D
## Comportamiento Bajo Presión

### D.1 — Flujos Principales en Condiciones Normales

Para cada funcionalidad central, verificar que:
- [OK] Produce el resultado esperado en el camino feliz
- [OK] Resiste campos en blanco o sin rellenar
- [OK] Acepta inputs en el límite máximo de longitud
- [OK] Digiere caracteres especiales sin romperse (unicode, emojis, HTML)
- [OK] Funciona con múltiples usuarios actuando a la vez
- [OK] Degrada con elegancia ante pérdida de conexión o timeouts

### D.2 — Situaciones Extremas

- [OK] ¿Qué pasa cuando una API externa alcanza su límite de uso?
- [OK] ¿Cómo reacciona si un servicio de terceros está caído o devuelve basura?
- [OK] ¿Soporta archivos o datasets de tamaño inusualmente grande?
- [OK] ¿Qué ocurre si la BBDD se desconecta en mitad de una transacción?
- [OK] ¿Hay riesgo de condiciones de carrera en flujos multietapa?
- [OK] ¿Doble pulsación en un botón de acción genera duplicados?
- [OK] ¿La app maneja correctamente distintas zonas horarias?
- [OK] ¿Qué sucede si el almacenamiento local del navegador está saturado o deshabilitado?

### D.3 — Tratamiento de Fallos

- [OK] Los errores devuelven códigos HTTP semánticos y coherentes
- [OK] El usuario recibe mensajes claros sin datos técnicos internos
- [OK] Existe un manejador global que atrapa excepciones no controladas
- [OK] Las operaciones interrumpidas se revierten limpiamente
- [OK] Cada error queda registrado con contexto suficiente para depuración
- [OK] Se disparan alertas automáticas cuando un error crítico salta en producción

---

## APARTADO E
## Velocidad y Capacidad

### E.1 — Tiempos de Respuesta

- [OK] Carga completa de cada vista en menos de 3 segundos (conexión estándar)
- [OK] Consultas a BBDD optimizadas: índices correctos, sin problemas N+1
- [OK] Assets (imágenes, fuentes, scripts) comprimidos y servidos de forma eficiente
- [OK] Caché configurado en las capas que lo permitan (CDN, Redis, navegador)
- [OK] Datasets voluminosos servidos con paginación, no de golpe
- [OK] Payloads de respuesta de la API dimensionados con sentido

### E.2 — Preparación para el Crecimiento

- [OK] ¿Cuántos usuarios concurrentes se esperan en los próximos meses?
- [OK] ¿Se han ejecutado pruebas de carga simuladas?
- [OK] ¿Existe algún punto único de fallo que pueda tumbar todo el sistema?
- [OK] ¿El pool de conexiones a BBDD está bien dimensionado?
- [OK] ¿Las tareas pesadas se procesan en segundo plano de forma asíncrona?

Herramientas sugeridas: k6, Locust, Artillery.

---

## APARTADO F
## Normativa y Legalidad

### F.1 — Protección de Datos Personales

**Si el producto atiende a usuarios en la UE (RGPD):**
- [OK] Política de privacidad publicada y fácilmente localizable
- [OK] Consentimiento explícito antes de cualquier tratamiento de datos
- [OK] El usuario puede descargar una copia de sus datos (portabilidad)
- [OK] El usuario puede pedir la eliminación total de sus datos (derecho al olvido)
- [OK] Registro interno del tratamiento de datos
- [OK] Proveedores externos que acceden a datos identificados y documentados

**Si atiende a usuarios en California (CCPA):**
- [OK] Transparencia sobre qué datos se recogen
- [OK] Opción real de rechazar la venta de datos personales
- [OK] Botón o mecanismo claro de "No vender mi información"

**Si opera en sectores regulados:**
- [OK] Datos clínicos: requisitos HIPAA cubiertos
- [OK] Transacciones con tarjeta: alineamiento con PCI-DSS
- [OK] Trazabilidad de acceso a datos mediante registros de auditoría

### F.2 — Inclusividad Digital

- [OK] Nivel AA de las directrices WCAG 2.1 cumplido
- [OK] Imágenes etiquetadas con texto descriptivo alternativo
- [OK] Todo el flujo navegable exclusivamente con teclado
- [OK] Contraste cromático suficiente en toda la interfaz
- [OK] Lectura compatible con tecnologías de asistencia

### F.3 — Cobertura Legal

- [OK] Términos y condiciones de uso redactados y publicados
- [OK] Contrato de tratamiento de datos (DPA) claro con el cliente
- [OK] Cumplimiento de todas las licencias open source utilizadas
- [OK] Titularidad de la propiedad intelectual especificada en el contrato

---

## APARTADO G
## Operaciones y Continuidad

### G.1 — Pipeline de Publicación

- [OK] Flujo CI/CD configurado y funcional
- [OK] Suite de tests ejecutándose automáticamente antes de cada deploy
- [OK] Entorno de pre-producción (staging) que replica fielmente producción
- [OK] Capacidad de revertir un despliegue problemático en minutos
- [OK] Migraciones de BBDD gestionadas con posibilidad de marcha atrás

### G.2 — Vigilancia del Sistema

- [OK] Herramienta de monitorización de la app en funcionamiento
- [OK] Checks de disponibilidad (uptime) programados
- [OK] Alertas inmediatas ante caídas o incrementos bruscos de errores
- [OK] Logging estructurado y consultable
- [OK] Métricas clave de rendimiento siendo tracked continuamente

Opciones recomendadas: Sentry, BetterStack, Datadog, LogRocket, UptimeRobot.

### G.3 — Estrategia de Recuperación

- [OK] Copias de seguridad automáticas de la BBDD activas
- [OK] Proceso de restauración probado y verificado
- [OK] RPO definido: volumen máximo de datos que el negocio puede permitirse perder
- [OK] RTO definido: tiempo máximo aceptable hasta restaurar el servicio
- [OK] Documento de contingencia ante desastres redactado y accesible

---

## APARTADO H
## Kit de Entrega al Cliente

### H.1 — Documentación Imprescindible

- [OK] README con guía de instalación, configuración y puesta en marcha
- [OK] Esquema visual de la arquitectura del sistema
- [OK] Catálogo completo de variables de entorno con su descripción
- [OK] Guía de resolución de incidencias frecuentes
- [OK] Referencia de la API documentada (OpenAPI/Swagger u otra)
- [OK] Runbook con procedimientos de mantenimiento rutinario

### H.2 — Limpieza del Código

- [OK] Código linted y formateado de manera uniforme
- [OK] Lógica compleja acompañada de comentarios aclaratorios
- [OK] Eliminado todo código muerto, comentado o en desuso
- [OK] Nomenclatura de archivos y directorios coherente y descriptiva
- [OK] Arquitectura con responsabilidades claramente diferenciadas

### H.3 — Paquete Final: ¿Está todo?

Confirma cada punto antes de hacer la entrega:
- [OK] Repositorio privado (GitHub/GitLab) con historial de commits ordenado
- [OK] Plantilla .env.example con cada variable documentada
- [OK] Guía de despliegue paso a paso adaptada a la plataforma del cliente
- [OK] Diagrama o documento de arquitectura del sistema
- [OK] Vídeo walkthrough (Loom o similar) recorriendo el código y los flujos clave
- [OK] Informe de testing: qué se probó, qué limitaciones se detectaron
- [OK] Contrato de soporte definido: alcance de bugs vs. SLA, escalado
- [OK] Documento cifrado con credenciales y accesos
- [OK] Inventario de cuentas de servicios externos con plan de traspaso
- [OK] Traspaso de la facturación de los servicios de infraestructura

---

## REFERENCIA
## Caja de Herramientas

Selección de herramientas por área para complementar este framework:

| ÁREA | OPCIONES RECOMENDADAS |
|------|----------------------|
| Escaneo de Vulnerabilidades | npm audit, pip-audit, Snyk, Dependabot |
| Pentesting Ligero | OWASP ZAP, Burp Suite Community, Snyk |
| Carga y Rendimiento | k6, Artillery, Locust, Lighthouse |
| Observabilidad | Sentry, BetterStack, Datadog, LogRocket |
| Disponibilidad | UptimeRobot, BetterStack, Pingdom |
| Gestión de Errores | Sentry, Bugsnag, Rollbar |
| Integración Continua | GitHub Actions, Vercel Deploy, Railway Deploy |
| Secretos | Doppler, Infisical, AWS Secrets Manager |
| Logging | Winston, Pino (Node.js) / Loguru (Python) |
| Docs de API | Swagger/OpenAPI, Postman, Redoc |
| Auditoría de Licencias | license-checker, FOSSA, pip-licenses |
| Accesibilidad | axe DevTools, Lighthouse, WAVE |
| Backups | PlanetScale, Supabase, cron + pg_dump |
