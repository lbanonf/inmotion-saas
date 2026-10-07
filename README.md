# In Motion · Reservas online

Plataforma de reservas de citas con panel de administración. Los clientes eligen servicio, profesional y horario disponible desde la página pública. El equipo del negocio aprueba, rechaza o registra citas y configura su catálogo, horarios y marca desde `/admin`.

Está pensada como **SaaS de marca blanca**: el contenido de cada negocio vive en la base de datos, cada instalación se identifica con `NEXT_PUBLIC_TENANT_ID` y el acceso a datos está detrás de interfaces, así que se puede cambiar Firebase por otro backend sin tocar la UI.

## Funcionalidades

**Página pública**
- Reserva en 4 pasos: servicio, profesional, fecha/hora disponible y datos.
- Disponibilidad en tiempo real (respeta horario del negocio, horario propio de cada profesional, antelación mínima y citas ya tomadas).
- Botón de WhatsApp para avisar la reserva, enlaces a Instagram y WhatsApp del negocio.
- Catálogo de productos en `/productos` con consulta por WhatsApp.
- Marca configurable: nombre, colores, textos y fondo (claro u oscuro).

**Panel `/admin`**
- **Resumen**: citas de hoy, próximos 7 días, pendientes, ingresos aprobados del mes y la carga de cada profesional hoy.
- **Agenda**: vista Día (una columna por profesional, línea de tiempo, hora actual, fuera de horario) y vista Semana (ocupación % por persona y día). Tocar un espacio libre permite agendar una cita o bloquear el horario (almuerzo, ausencia, vacaciones, también por rango de fechas).
- **Citas**: filtros, búsqueda, aprobar/rechazar/cancelar/reactivar, nueva cita manual y mensaje de confirmación por WhatsApp prellenado.
- **Clientes**: historial generado desde las reservas (visitas, próximas citas, total gastado).
- **Servicios** y **Productos**: CRUD, precios, stock, categorías e importación desde CSV/Excel.
- **Equipo**: matriz de horarios semanales de todo el equipo, servicios que atiende cada uno y horario propio editable.
- **Asistente**: personalidad del bot, preguntas frecuentes, chat de prueba y "conocimiento del bot" (prompt generado con los datos del negocio).
- **Configuración**: marca, contacto, reglas de reserva, horario por defecto y carga de datos de ejemplo.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4
- Firebase: Firestore (datos) y Authentication (admins)
- Vitest para pruebas

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # completa las credenciales web de Firebase
npm run dev
```

- Página de reservas: http://localhost:3000
- Panel de administración: http://localhost:3000/admin

### Primer uso

1. En la consola de Firebase, **Authentication → Sign-in method → habilita "Correo electrónico/contraseña"**.
2. En **Authentication → Users**, crea el usuario administrador. El panel no permite registrarse: solo iniciar sesión.
3. Publica las reglas de seguridad: `firebase deploy --only firestore:rules`.
4. Entra a `/admin`, inicia sesión y pulsa **Crear negocio**. Puedes partir de una plantilla (`config/templates.ts`) y editarlo todo después. Quien crea el negocio queda como administrador.

Para agregar más administradores, añade su correo (en minúsculas) al arreglo `adminEmails` del documento `tenants/{tenantId}` desde la consola de Firebase y crea su usuario en Authentication. También se puede usar su UID en `adminUids`.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build y servidor de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | Verificación de tipos |
| `npm test` | Pruebas unitarias (disponibilidad, fechas) |
| `npm run test:rules` | Pruebas de `firestore.rules` contra el emulador (requiere Java) |
| `npm run emulators` | Emuladores locales de Firestore y Auth |
| `npm run seed -- --admin-email correo@x.com` | Carga o actualiza (por nombre, sin duplicar) un negocio desde `config/templates.ts`. `--demo` agrega citas y bloqueos de ejemplo |

## Variables de entorno

| Variable | Descripción |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_*` | Credenciales de la app web de Firebase |
| `NEXT_PUBLIC_TENANT_ID` | Negocio que sirve esta instalación (`tenants/{id}`). Por defecto `in-motion-san-isidro` |
| `NEXT_PUBLIC_DATA_PROVIDER` | Backend de datos registrado en `lib/data/index.ts`. Por defecto `firebase` |
| `NEXT_PUBLIC_APP_NAME` / `NEXT_PUBLIC_APP_DESCRIPTION` | Metadatos del sitio (título de la pestaña, SEO) |
| `NEXT_PUBLIC_USE_FIREBASE_EMULATORS` | `true` para usar los emuladores locales en lugar del proyecto real |

### Desarrollo local con emuladores

Permite probar todo (incluido el login del admin) sin tocar producción. Requiere Java (`brew install openjdk@21`).

```bash
npm run emulators
# en otra terminal: crea un usuario en el emulador (http://127.0.0.1:4000/auth) y carga datos
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true SEED_EMAIL=test@test.com SEED_PASSWORD=123456 npm run seed
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true npm run dev
```

## Arquitectura

```
app/
  page.tsx                 Página pública de reservas
  admin/page.tsx           Panel de administración
components/
  booking-landing.tsx      Flujo de reserva en 4 pasos
  admin/                   Login, alta del negocio y secciones del panel
config/
  app.ts                   Configuración de la instalación (lee variables de entorno)
  templates.ts             Plantillas para dar de alta un negocio
lib/
  domain/                  Modelo y reglas de negocio, sin dependencias de backend
    types.ts               Tenant, Service, Professional, Appointment…
    availability.ts        Cálculo de horarios libres y bloques de agenda
    time.ts                Fechas, zonas horarias y formatos
    defaults.ts            Valores por defecto y normalización
  data/
    repository.ts          Contratos: BookingRepository, AdminRepository, AuthProvider
    index.ts               Registro y selección del proveedor de datos
    firebase/              Implementación con Firestore y Firebase Auth
firestore.rules            Reglas de seguridad
tests/                     Pruebas de reglas (emulador)
```

La UI solo importa `getDataProvider()` y los tipos de `lib/domain`. Nunca importa Firebase directamente.

### Modelo de datos (Firestore)

```
tenants/{tenantId}                     profile, settings, adminUids        lectura pública
tenants/{tenantId}/services/{id}       nombre, duración, precio, activo    lectura pública
tenants/{tenantId}/professionals/{id}  nombre, rol, serviceIds, activo     lectura pública
tenants/{tenantId}/appointments/{id}   cita + datos del cliente            solo admins (crear: público, validado)
tenants/{tenantId}/slotLocks/{key}     bloque de agenda ocupado            lectura pública, sin datos personales
tenants/{tenantId}/products/{id}       productos, precio, stock            lectura pública
tenants/{tenantId}/faqs/{id}           preguntas frecuentes del asistente  lectura pública
tenants/{tenantId}/timeBlocks/{id}     horarios bloqueados del equipo      solo admins (ocupan slotLocks)
```

**Disponibilidad y doble reserva.** La agenda se divide en bloques de `slotIntervalMinutes`. Cada cita ocupa los bloques que cubre su duración. Por cada bloque se crea un documento `slotLocks/{profesional}_{fecha}_{HHmm}` en la misma transacción que la cita. Si dos personas reservan el mismo horario, la segunda transacción falla. La página pública escucha los bloqueos en tiempo real para mostrar solo horarios libres sin exponer datos de otros clientes. Al rechazar o cancelar una cita, sus bloques se liberan.

**Reglas de seguridad.** El público solo puede crear citas `pending`, con precio, duración y nombres iguales a los del catálogo, y solo junto con sus bloqueos. Los datos personales solo los leen los admins del negocio. `adminUids` no se puede modificar desde la app.

### Migrar a otro backend

1. Implementa `BookingRepository`, `AdminRepository` y `AuthProvider` (`lib/data/repository.ts`) en `lib/data/<proveedor>/`. Supabase y una API REST propia son opciones posibles.
2. Regístralo en `providers` dentro de `lib/data/index.ts`.
3. Define `NEXT_PUBLIC_DATA_PROVIDER=<proveedor>`.

La lógica de disponibilidad (`lib/domain/availability.ts`) es pura y se reutiliza tal cual. El backend solo debe garantizar que un bloque de agenda no se ocupe dos veces, por ejemplo con una restricción única sobre `(professional_id, date, time)`.

### Nueva marca o negocio

Despliega la misma app con otro `NEXT_PUBLIC_TENANT_ID` (y, si quieres, otro `NEXT_PUBLIC_APP_NAME`). Luego entra a `/admin` y crea el negocio. Marca, colores, servicios, equipo, horarios, moneda, zona horaria e idioma se configuran desde el panel.

## Bot / asistente (siguiente fase)

La base ya está en el panel (**Asistente**): personalidad, respuestas frecuentes aprobadas por el dueño y un prompt de sistema que se arma solo con servicios, precios, horarios, equipo y productos (`lib/domain/assistant.ts`). El chat de prueba usa coincidencia por palabras clave; el siguiente paso es:

1. Endpoint (`app/api/assistant/route.ts` o Cloud Function) que reciba mensajes y llame a un LLM con `buildAssistantPrompt()` como instrucciones de sistema.
2. Conectar canales: WhatsApp Business Cloud API e Instagram Messaging (webhooks de Meta).
3. Herramientas para el bot: consultar disponibilidad y crear reservas con el mismo repositorio que usa la web.
4. Bandeja de conversaciones en el admin con traspaso a humano y aprendizaje: respuestas que corrige el dueño se guardan como nuevas FAQs.

## Próximas mejoras sugeridas

- **Notificaciones**: confirmación y recordatorio por correo o WhatsApp al aprobar una cita (Cloud Functions + Resend/Twilio).
- **Protección anti-spam**: Firebase App Check y límite de reservas por correo o teléfono.
- **Cancelación por el cliente**: enlace con token para cancelar o reprogramar.
- **Excepciones de horario**: feriados, vacaciones y horarios distintos por profesional.
- **Multi-tenant por dominio**: resolver el tenant por subdominio en lugar de una variable por despliegue (ver la guía `multi-tenant` de Next.js).
- **Roles**: un subdocumento `members` con roles (dueño o recepción) en lugar de `adminUids`.
- **Fotos**: imágenes de productos, equipo y portada (Firebase Storage).
- **Pagos/adelantos**: reservar con adelanto vía Mercado Pago o Izipay.
- **Datos heredados**: la cita de prueba en la colección raíz `appointments`, del MVP anterior, ya no se usa y puede borrarse desde la consola.
