# BrokerRace — backend

Esto es el "motor" que falta detrás del diseño que ya tienes en Claude Design: guarda las
empresas y las pujas en una base de datos real, cobra con Stripe, y actualiza el ranking
solo cuando Stripe confirma el pago (nunca antes). Sigue exactamente la especificación que
ya estaba en `PAYMENTS.md` dentro de tu export de Claude Design.

Stack: **Next.js** (corre en Vercel) + **Postgres** (vía `@neondatabase/serverless`, el driver
oficial de Neon — que es hoy el proveedor de Postgres recomendado por Vercel desde que
retiraron su antiguo producto "Vercel Postgres") + **Stripe**.

## 1. Súbelo a GitHub

Crea un repositorio nuevo (en github.com, botón "New") y sube esta carpeta. Si nunca lo has
hecho: puedes arrastrar los archivos directamente en la web de GitHub sin usar la terminal
("uploading an existing file" en la página del repo vacío).

## 2. Despliega en Vercel

1. Entra en [vercel.com](https://vercel.com) y crea una cuenta (puedes usar tu cuenta de GitHub).
2. "Add New" -> "Project" -> importa el repositorio que acabas de subir.
3. Vercel detecta que es un proyecto Next.js automáticamente. Dale a "Deploy" — fallará la
   primera vez porque faltan las variables de entorno (siguiente paso), es normal.

## 3. Base de datos (Neon, vía el Marketplace de Vercel)

Vercel ya no ofrece "Postgres" como producto propio — ahora se conecta a través de su
Marketplace, y el proveedor recomendado es Neon (gratis para empezar). Pasos:

1. Ve a [vercel.com/marketplace/neon](https://vercel.com/marketplace/neon) y pulsa
   **Install**. Elige "Create New Neon Account" y sigue el asistente (región, plan
   gratuito, nombre de la base de datos).
2. Cuando te lo pida, **conecta esa base de datos a tu proyecto** de BrokerRace (marca los
   tres entornos: Development, Preview, Production). Esto inyecta automáticamente la
   variable `DATABASE_URL` en tu proyecto de Vercel — no tienes que copiar ni pegar nada.
3. Entra en el panel de Neon (desde Vercel: **Storage** -> tu base de datos -> **Open in
   Neon**, o directamente en neon.tech) y abre el **SQL Editor**. Pega ahí el contenido
   completo de [`db/schema.sql`](./db/schema.sql) y ejecútalo una vez. Esto crea las
   tablas (`companies`, `bids`, etc.) — no borra nada si lo ejecutas dos veces por error,
   usa `if not exists`.

## 4. Stripe

1. Entra en tu [Stripe Dashboard](https://dashboard.stripe.com). Mientras pruebas, usa el
   interruptor **Test mode** (arriba a la derecha) — así ningún pago es real todavía.
2. **Developers -> API keys** -> copia la "Secret key" (empieza por `sk_test_...`).
3. En Vercel: **Settings -> Environment Variables** de tu proyecto, añade:
   - `STRIPE_SECRET_KEY` = la clave que acabas de copiar
   - `MIN_ENTRY_CENTS` = `100` (de momento, $1 — es lo que ya tienes en el diseño; puedes
     subirlo más adelante cuando decidas el mínimo institucional, ver la sección de precios
     del playbook)
   - `MIN_INCREMENT_CENTS` = `100`
4. Vuelve a desplegar (**Deployments** -> los tres puntos del último -> **Redeploy**). Ahora
   sí debería funcionar.
5. **Developers -> Webhooks -> Add endpoint**. URL: `https://tu-dominio.vercel.app/api/stripe/webhook`.
   Eventos a activar: `checkout.session.completed`, `checkout.session.expired`,
   `charge.refunded`, `charge.dispute.created`.
6. Copia el "Signing secret" de ese webhook (empieza por `whsec_...`) y añádelo en Vercel
   como `STRIPE_WEBHOOK_SECRET`. Redeploy otra vez.

## 5. Cargar las empresas de la demo (opcional, para probar)

Localmente, con Node instalado:

```bash
npm install
cp .env.example .env.local
# pega tu DATABASE_URL real (Vercel -> Storage -> tu base de datos -> pestaña ".env.local",
# o directamente desde el dashboard de Neon -> Connection Details -> "Pooled connection")
npm run seed
```

Esto carga las 30 empresas ficticias que ya usa el modo DEMO del diseño — útil para probar
el flujo de principio a fin sin escribir datos a mano. **No lo ejecutes contra tu base de
datos de producción real una vez hayas lanzado** — un mercado LIVE real debería empezar
vacío (así lo dejó ya el propio diseño con el toggle LIVE/DEMO: los datos de demo son solo
para enseñar cómo se ve, nunca listings reales).

## Endpoints que existen ahora mismo

- `GET /api/leaderboard?category=CRYPTO` — ranking actual (usa `category=GLOBAL` o
  sin parámetro para el global).
- `POST /api/companies` — crea una empresa nueva sin verificar y con $0 de puja
  (`{ name, category, categoryLabel, country, website }`).
- `POST /api/checkout` — crea una sesión de pago de Stripe para pujar
  (`{ companyId, desiredTotalBidCents }`). Devuelve `{ url }`, al que rediriges al usuario.
- `POST /api/stripe/webhook` — lo llama Stripe, no tu frontend. Aquí es donde el pago se
  confirma de verdad y el ranking se actualiza.
- `POST /api/click` — cuenta un clic hacia la web de una empresa (`{ companyId }`). Sin
  protección antifraude todavía — ver el aviso en el propio archivo.

## Lo que falta (a propósito, para no bloquear el lanzamiento)

- **Conectar el diseño de Claude Design a estos endpoints.** Ahora mismo `Outbid
  Platform.dc.html` simula todo con datos falsos en el navegador (el array `SEED`). Hay
  que cambiar esas partes para que llamen a `/api/leaderboard` al cargar la página y a
  `/api/checkout` cuando alguien pulsa el botón de Stripe. Es el siguiente paso lógico —
  dímelo cuando quieras y lo hacemos.
- **Panel de verificación.** Ahora mismo, verificar una empresa (ponerle el badge de
  "Verified Broker", etc.) es un `UPDATE` manual en la base de datos. No hay pantalla de
  administración todavía.
- **Antifraude en los clics** (rate limiting, bots) — necesario antes de usar esos números
  para CPC/CTR de cara al cliente, no solo como referencia interna.
- **Política de reembolsos real.** El webhook ya registra los reembolsos y disputas de
  Stripe (`REFUNDED` / `DISPUTED`), pero deliberadamente NO resta el importe del ranking
  automáticamente — esa es una decisión de negocio que hay que tomar antes de automatizarla.
