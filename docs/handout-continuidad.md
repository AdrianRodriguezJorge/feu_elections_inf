# HANDOUT DE CONTINUIDAD — ELECCIONES FEU
## Facultad de Ingeniería Informática · CUJAE

> Última actualización: 14-11-2026, al cerrar la fase F7. Este documento es la fuente de verdad operativa. Si algo del código lo contradice, manda el código; corrija este documento.

---

## 1. Qué es y en qué estado está

Plataforma web para la elección del **Secretariado de la Facultad de Ingeniería Informática** de la FEU (CUJAE), conforme al Reglamento General de la FEU 2019 (*ABC de la FEU*; extractos literales en `prisma/regulation.seed.json`, documentos en `docs/migracion-web/`).

- **Alcance v1:** solo nivel Facultad. El modelo de datos admite otros niveles, pero no tienen interfaz.
- **Repositorio:** https://github.com/AdrianRodriguezJorge/feu_elections_inf (rama `main`).
- **Producción:** Vercel + Prisma Postgres (`db.prisma.io`). **Todavía en pruebas: no hay usuarios reales.**
- **Informe de auditoría de partida:** `auditoria/informe-auditoria-2026-11-13.md` (hallazgos con severidad, archivo y línea). Las fases F1–F7 corrigen la mayor parte; ver §9.

### Fases del plan de corrección

| Fase | Contenido | Estado | Commit |
|---|---|---|---|
| F0 | Contención en producción (la hace el usuario) | Pendiente del usuario, ver §8 | — |
| F1 | Seguridad: Auth.js, autorización por rol, secreto del voto | Hecha | `9c44919` |
| F2 | BD como única fuente de verdad, máquina de estados, escrutinio, empates, quórum | Hecha | `4068276` |
| F3 | Migraciones versionadas, seed limpio, WORM ampliado | Hecha en código; falta reiniciar la BD de producción | `8f833d4` |
| F4 | Tests de integración y e2e en GitHub Actions | Hecha | `827e6ed` |
| F5 | UX funcional, accesibilidad WCAG 2.1 AA, textos en usted | Hecha | `a1b5c1d`, `b3f4030` |
| F7 | Rutas por rol, sistema de diseño "papeleta impresa", componentes partidos | Hecha | ver `git log` |
| **F6** | **CRUDs operativos** (padrón, candidatos, brigadas, comisión, visor de auditoría) | **Pendiente (siguiente)** | — |
| F8 | Pruebas de carga, Docker/runbook, simulacro UAT | Pendiente | — |

El usuario cambió el orden: F7 se hizo antes que F6 para construir los CRUDs sobre las rutas y componentes nuevos.

---

## 2. Stack, arranque local y estructura

**Stack:** Next.js 15 (App Router, `typedRoutes`), React 19, Tailwind 4, TypeScript estricto, Prisma 6.19 sobre PostgreSQL 16, Auth.js v5 (`next-auth@5.0.0-beta.32`), Zod, shadcn/ui sobre Radix (a mano, en `src/components/ui/`), Vitest, Playwright. Node 24.x (`engines`).

**Arranque local** (PostgreSQL instalado como servicio; **el usuario no quiere Docker**):

```bash
npm install
cp .env.example .env     # DATABASE_URL, AUTH_SECRET
npm run db:deploy        # migraciones (esquema + triggers WORM + CHECK)
npm run db:seed          # estado inicial (se niega si hay boletas)
npm run dev
```

**Variables de entorno:** `DATABASE_URL`, `AUTH_SECRET` (obligatoria en producción), `AUTH_MFA_ENABLED` (opcional, ver §6).

**Estructura:**

```
app/                     Rutas (App Router)
  page.tsx               "/" → login, o redirige a la página del rol
  (app)/                 Área autenticada: layout con sesión + proveedor de datos
    votar/ comision/ resultados/ observacion/
  reglamento/ verificar/ Públicas (con sesión, el reglamento se ve dentro del shell)
  api/                   Route handlers (todos con requireSession/requirePermission)
src/domain/              Dominio puro y testeado (sin BD ni Next)
src/server/              election-service (transacciones), accounts, guard, page-guard, acta
src/components/          UI; ballot/, comision/, results/ son piezas de los paneles grandes
src/components/ui/       Button, Input, Label, Dialog, Confirm, Card, Badge, Alert
src/views/               Vistas cliente de cada ruta y pantallas de login/públicas
src/lib/                 routes, status-labels, utils, session-user
prisma/                  schema, migrations/, seed.ts, regulation.seed.json
tests/                   unitarias (tests/*.test.ts), integration/, e2e/
auditoria/               Informe de auditoría y SQL de contención (f0-contencion.sql)
```

---

## 3. Ciclo de vida y reglas de negocio (implementadas)

Estados usados en v1 (`src/domain/states.ts`): `CONVOCADO → ABIERTA → CERRADA → {SIN_QUORUM | EMPATE | PROCLAMADA} → VP_DESIGNADA → FINALIZADA`, más `VACANTE`. No existen BORRADOR, LISTO, IMPUGNADA, ANULADA ni SEGUNDA_VUELTA. No se reabre una votación cerrada y no hay reinicio de urnas.

- **Abrir/cerrar/escrutar/proclamar/VP/vacantes:** los operan **Comisión y Administrador**. El Administrador, además, es el único que ajusta el quórum.
- **Escrutinio:** una sola vez, desde `CERRADA`. El resultado decide el estado de salida: sin quórum → `SIN_QUORUM` (no se proclama, terminal); empate → `EMPATE`; si no → `PROCLAMADA`.
- **N = candidatos − 2** (Art. 59), derivado, nunca editable. Boleta: hasta N miembros y exactamente 1 presidente entre los marcados; no hay voto en blanco (0 marcas → anulación voluntaria en 2 pasos).
- **Quórum:** más del **85 %** (Art. 38). El Administrador puede aplicar una excepción de **80–85 %** con motivo y acta, hasta antes del escrutinio; queda auditada y visible para todos.
- **Empates** (decisión del usuario, se aparta del Art. 40 y se documenta): si los votos a presidente no resuelven el empate (en el corte o en la presidencia), **la Comisión decide entre los empatados con motivo y acta**, que quedan en la auditoría y en el acta. Un empate a 0 votos en el corte también es empate (antes se resolvía por orden alfabético: corregido).
- **VP:** lo designa la Comisión entre los electos (Art. 67). **Vacante presidencial:** asume el VP o la Comisión elige (Arts. 99–102); los porcentajes del Consejo se introducen a mano.
- **Padrón:** solo se importa en `CONVOCADO` (congelado al abrir).
- **Auditoría:** cadena hash (SHA-256, JSON canónico) en `audit_events`, verificable en `GET /api/auditoria`.

---

## 4. Seguridad y secreto del voto (decisiones de arquitectura)

- **Sesión:** Auth.js Credentials + JWT en cookie cifrada (8 h). Toda ruta API exige sesión y permiso (`src/server/guard.ts`); las páginas, rol en el servidor (`src/server/page-guard.ts`). La identidad del voto sale **solo de la sesión**.
- **Cuentas:** nadie tiene contraseña al sembrar. Cada persona **activa su cuenta** con su carnet y elige su contraseña (no puede ser el carnet), solo con el proceso en `CONVOCADO`. Si ya estaba activada se avisa; la Comisión puede **restablecerla** (solo antes de abrir). Login por carnet o nombre completo exacto (nunca subcadena).
- **Urna ciega (INV-04):** `ballots` no guarda identidad, hora exacta (solo el día), secuencia ni id ordenable; el evento de auditoría del voto es `ANONIMO` con detalles vacíos; el comprobante es `randomBytes(32)` y **solo confirma inclusión** (no muestra el contenido: sin *receipt-freeness* no hay voto secreto real).
- **API sin fugas:** el votante recibe solo su ficha; roles de supervisión, la participación agregada por brigada; los carnets de candidatos solo los ven Comisión/Admin.
- **WORM en la BD** (migración `0002_worm_triggers`): `ballots`, `ballot_selections`, `participations` y `audit_events` no admiten UPDATE/DELETE; TRUNCATE solo con la urna vacía. El seed se niega a ejecutarse si hay boletas. **Un solo usuario de BD** (decisión del usuario): quien tenga la cadena de conexión puede, en teoría, quitar los triggers.
- **Fallar cerrado:** si la BD no responde, la API da 503; nunca datos de demostración.

---

## 5. Decisiones y directivas del usuario (no revertir sin preguntar)

1. **Sin correo electrónico** en ninguna pantalla (`users.email` es opcional y no se usa).
2. **Inicio estrictamente en `CONVOCADO`**; sin botón ni acción de reiniciar urnas.
3. **Trato de usted** en todos los textos, sin jerga para votantes (nada de "SHA-256", "MFA TOTP", "urna ciega").
4. **Cero emojis**; iconos `lucide-react`. Carmesí (`feu-carmesi-500`) **solo** para las letras "FEU".
5. **Estética "papeleta impresa"** (F7): papel `#FBFAF6`, tinta oscura, verde CUJAE para acciones (`action`), ámbar para avisos, bordes finos, sin sombras, Public Sans (interfaz) y Source Serif (solo reglamento y acta). Tokens semánticos en `app/globals.css`; no usar paletas sueltas de Tailwind. **Sin modo oscuro** por ahora (tokens preparados).
6. **Afluencia en vivo oculta a los electores** (la ven Comisión, Admin y observadores).
7. **Pantalla de revisión** antes de confirmar el voto.
8. Autoridades: Liz (Presidencia de la Comisión) y Revisor (miembro/revisor), leídas de la BD; nada de nombres inventados.
9. **Flujo de trabajo:** un commit por fase directamente en `main` y push (sin ramas). Al cerrar cada fase: resumen + preguntar las decisiones abiertas de la siguiente **antes** de empezar.
10. **Las pruebas no se ejecutan en el PC del usuario** sino en GitHub Actions (`.github/workflows/ci.yml`); en local solo la verificación rápida (§7).

---

## 6. Pendiente de decisión: TOTP

El segundo factor para ADMIN y COMMISSION está **implementado pero desactivado** (se activa con `AUTH_MFA_ENABLED=true`): hay un secreto TOTP por autoridad en `users.mfa_secret`, pero falta el **enrolamiento** (mostrar un QR `otpauth://` para Google Authenticator/Aegis) y el usuario pidió dejar la decisión para el final porque no la entendía del todo. Hoy las autoridades entran solo con contraseña. En desarrollo local existe `GET /api/auth/totp/current?id=<nombre|carnet>` (404 fuera de `NODE_ENV=development`).

---

## 7. Datos del seed y pruebas

`npm run db:seed` deja: Facultad, brigadas 11/12/22/32/41, **proceso en `CONVOCADO`**, 10 candidatos demo (también electores), 3 autoridades, comisión constituida, 321 artículos del reglamento y el evento génesis de auditoría. **Nadie tiene contraseña** (todos activan su cuenta). Carnets de prueba válidos:

| Rol | Nombre | Carnet |
|---|---|---|
| ADMIN | Adrian | 99091978927 |
| COMMISSION (presidencia) | Liz | 06091668099 |
| COMMISSION (miembro) | Revisor | 04021514560 |
| VOTER / candidatos | Carlos Mendoza Ramos, Beatriz Navarro Pino, Daniel Gómez Herrera, Elena Castillo Vargas, Fernando Iglesias Morales, Gabriela Ortega Serrano, Héctor Paredes Fuentes, Isabel Romero Cruz, Javier Soto Delgado, Katia Molina Reyes | ver `prisma/seed.ts` |

**Pruebas:**
- `npm test` — 103 unitarias del dominio (vitest).
- `npm run test:integration` — API contra servidor y BD desechable (exige `ALLOW_DB_RESET=true` y `APP_URL`; **nunca contra producción**; usa `APP_URL`, no `BASE_URL`, porque Vite reserva esta última).
- `npm run test:e2e` — Playwright (activación, voto con revisión, anulación en móvil, escrutinio sin quórum, rutas por rol, axe WCAG en las pantallas clave).
- **CI:** tipos, lint, unitarias, migraciones + seed en PostgreSQL 16, build, integración y e2e en cada push. Informe y capturas como artefacto `informe-e2e`.

**Entorno del desarrollador:** PostgreSQL 16 como servicio de Windows (`C:\Program Files\PostgreSQL\16\bin`, `psql` fuera del PATH); la BD `feu` es del usuario, **no escribir en ella** (los triggers WORM impiden borrar votos); las pruebas manuales usan una BD aparte (`feu_audit`). Prisma bloquea `migrate reset` si lo lanza un agente de IA: en los tests la BD se reinicia borrando el esquema y aplicando `migrate deploy` + seed.

---

## 8. Pendiente del usuario en producción (Vercel)

Hasta hacerlo, **los builds de Vercel fallan** con `P3005 The database schema is not empty` (la BD de producción se creó con `db push`, sin historial de migraciones). Orden:

1. Añadir **`AUTH_SECRET`** en Vercel (Settings → Environment Variables, entornos Production y Preview). Generarlo con `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Sin ella el login falla.
2. **Reiniciar la BD de producción** (borra todo; solo hay datos de prueba) desde el PC del usuario con la URL de producción, que el agente no maneja: `$env:DATABASE_URL="<url de producción>"; npx prisma migrate reset --force` (aplica migraciones y ejecuta el seed). Si falla en Prisma Postgres, revisar si exige conexión directa o si no admite triggers PL/pgSQL.
3. **Redeploy** del último commit en Vercel.
4. Probar: activar la cuenta de Adrian (carnet 99091978927), elegir contraseña y entrar.
5. (F0) Revisar con `auditoria/f0-contencion.sql` si el código anterior creó cuentas privilegiadas en producción (con el reinicio del paso 2 desaparecen).

---

## 9. Lo que falta (roadmap)

### F6 · CRUDs operativos (siguiente)
Hoy solo se pueden importar electores por CSV; no hay forma de corregir nada sin tocar el seed. Falta (ver matriz de CRUD del informe, §3):
- **Padrón:** listar, buscar, editar, habilitar/inhabilitar (antes de abrir); vista previa de la importación (`POST /api/padron/validate` existe sin interfaz); plantilla CSV (`GET /api/padron/template`, sin interfaz).
- **Candidatos:** alta, edición y baja antes de congelar la candidatura; recalcular N y el snapshot hasheado; biografías.
- **Brigadas:** crear/editar (el plan dice que se crean antes de importar).
- **Comisión Electoral:** constituir y modificar de forma persistida (`POST /api/comision` hoy valida pero no guarda).
- **Visor de auditoría** para observadores (`GET /api/auditoria` existe sin interfaz).
- **Gestión de usuarios/roles** y creación de procesos (hoy solo por seed).
- Fijar el congelamiento: candidatos y padrón no editables al abrir.

### F8 · Despliegue y operación
Pruebas de carga (300 electores concurrentes, p95 de emisión < 800 ms, escrutinio < 10 s); runbook de contingencia (apertura/cierre manual, respaldo y restauración); simulacro UAT con la Comisión antes de cargar el padrón real; actualizar este handout.

### Deuda técnica y mejoras conocidas
- **Dependencias:** `npm audit` marca 5 altas que solo se corrigen subiendo de versión mayor (Next 16, Prisma 7, Zod 4); hacerlo con los tests e2e como red de seguridad.
- **Limitador de intentos en memoria** (por instancia); en Vercel debería ir en BD o almacén compartido.
- **Actualizar acciones de GitHub** (`@v4` usan Node 20) cuando haya versiones nuevas.
- **Roles de BD:** separar usuario de migraciones y de aplicación (el usuario prefirió uno solo).
- Respaldo automático antes de abrir/cerrar/escrutar; firma digital de actas (PKI); página pública de auditoría de la cadena; ticket con QR; módulo de impugnaciones (Arts. 103–106); carga masiva optimizada del padrón (>1 500 estudiantes).
- Segunda vuelta como proceso hijo (hoy la Comisión decide los empates).

---

## 10. Reglas para la siguiente IA

- **Idioma:** español. Estilo del código: comentarios útiles, sin ruido; el dominio se mantiene puro.
- **Antes de tocar nada:** lea este documento y `git log`. Compruebe tipos, lint y tests; si el CI falla, el commit no está terminado.
- **No reintroduzca** emojis, correos, contraseñas derivadas del carnet, botones de reinicio de urnas, comprobantes que muestren el voto, estado en memoria ni datos de demostración como respaldo.
- **No escriba en la BD `feu` del usuario ni en producción.** Use una BD de pruebas local.
- **Decisiones del usuario:** si una tarea requiere una decisión que no esté en §5, pregúntela (con opciones y una recomendación) antes de implementarla.
- **Windows:** Git Bash y PowerShell están disponibles; en Git Bash la conversión de rutas deforma variables con URL (use PowerShell para ellas). Los heredocs muy largos pueden fallar: escriba los archivos con la herramienta de escritura.

---

## 11. Prompt para la siguiente IA

```
Continúa el proyecto de elecciones del Secretariado de la FEU (Facultad de Ingeniería Informática, CUJAE) en https://github.com/AdrianRodriguezJorge/feu_elections_inf. Lee primero docs/handout-continuidad.md (estado, decisiones, directivas del usuario, pendientes) y auditoria/informe-auditoria-2026-11-13.md.

Estado: fases F1–F5 y F7 hechas y subidas; el CI de GitHub es la prueba de que todo funciona. Falta la fase F6 (CRUDs operativos: padrón, candidatos, brigadas, comisión persistida, visor de auditoría para observadores) y la F8 (carga, runbook, UAT). El usuario aún debe reiniciar la BD de producción y añadir AUTH_SECRET en Vercel (handout §8); hasta entonces los builds de Vercel fallan con P3005.

Reglas: un commit por fase directamente en main y push; antes de empezar cada fase pregunta las decisiones abiertas y espera respuesta; trato de usted y estética "papeleta impresa" ya definidos; el voto es secreto (urna ciega, comprobante que solo confirma inclusión); no uses Docker ni escribas en la BD feu del usuario; ejecuta las pruebas en GitHub Actions. Empieza por plantear al usuario las decisiones de F6.
```
