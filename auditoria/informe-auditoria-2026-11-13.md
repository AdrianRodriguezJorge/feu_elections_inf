# Informe de auditoría: Elecciones FEU (Facultad de Ingeniería Informática, CUJAE)

**Fecha:** 13-11-2026 · **Commit auditado:** `7143665` (rama `main`, árbol limpio)
**Alcance:** código completo, BD, ejecución local y recorrido en el navegador (escritorio, 375 px, 755 px, claro/oscuro).
**Entorno de prueba:** PostgreSQL 16 local (servicio Windows). Todas las pruebas que escriben datos se hicieron en una BD aparte, `feu_audit`, porque los triggers WORM impiden borrar boletas. La BD `feu` no se tocó.

---

## 1. Resumen ejecutivo

**El sistema no está en condiciones de usarse en una elección real.** El dominio puro (`src/domain/*`) está bien hecho y tiene 101 tests en verde. La capa que lo expone (API, sesión, persistencia y UI) no aplica esas reglas y contradice varias garantías que el handout da por cumplidas.

Lo comprobé en vivo, sin credenciales reales:

| # | Lo que promete el handout | Lo que ocurre (verificado) |
|---|---|---|
| 1 | MFA TOTP obligatorio para autoridades | Cualquiera inicia sesión como ADMIN con `Adrian` / `Admin1234!` y el TOTP que entrega `GET /api/auth/totp/current`. La UI de login ni siquiera pide el TOTP, porque un bug la hace entrar directamente. |
| 2 | Solo la Comisión/Admin abre y cierra | **Ninguna ruta API comprueba la sesión.** Un `curl` anónimo abre, cierra o pone cualquier estado (`SET_STATUS: FINALIZADA`). |
| 3 | Un voto por elector autenticado | `POST /api/voto/emitir` acepta `voterCi` y `role` del body. Voté de forma anónima en nombre de otra persona. |
| 4 | Voto secreto (INV-04, Art. 58) | **Roto por tres vías:** (a) el `GET /api/eleccion/estado` anónimo devuelve CI, nombre y `receiptHash` de cada elector, y `GET /api/voto/comprobante` devuelve el contenido de la boleta; (b) la tabla WORM `audit_events` guarda `actorCi` junto al `receiptHash` de cada voto; (c) `participations.castAt` y `ballots.castAt` son idénticos al milisegundo. |
| 5 | Sin quórum (>85 %) no se proclama | Con 26,67 % la UI proclama presidente y electos, permite designar VP y el acta dice "NO CUMPLIDO" y a la vez "da por válidos los presentes resultados". |
| 6 | Prohibido desempatar por orden alfabético (Art. 40) | Con empate a 0 votos declara "Electos" a los primeros por orden de boleta, que es alfabético. |
| 7 | Cadena WORM verificable | La verificación da **"Contenido manipulado en el evento 13"** sin manipulación alguna, tras una vacante. Es un bug de serialización. |
| 8 | Sin botón "Reiniciar urnas" | El botón no está, pero la acción `REINICIAR` sigue en el backend y es accesible sin sesión. Además "Abrir votación" reaparece tras cerrar. |
| 9 | Autoridades leídas de BD, sin nombres mock | El acta en pantalla sigue firmada por Elena García, Frank Hernández y Giselle López. |
| 10 | Persistencia ACID en PostgreSQL | La fuente de verdad es un singleton en memoria. Tras reiniciar se pierden la composición, el VP y la sucesión. En Vercel (varias instancias) el estado diverge entre peticiones. |

Además, el primer login **creó tres cuentas privilegiadas nuevas en la BD**: un ADMIN con CI 02091978927, un COMMISSION y un OBSERVER, todas con contraseña igual a su CI. **Si el código desplegado en Vercel ha recibido algún login, esas cuentas existen en producción: revísalo ya.**

**Lo que está bien:** dominio puro y testeado (cuota N = C−2, validación de boleta, quórum estricto, detección de empates, CI cubano); TypeScript estricto sin errores; ESLint limpio; boleta clara y responsive en móvil; flujo de anulación en dos pasos bien redactado; buena intención de diseño (WORM, snapshot hasheado, urna desacoplada).

**Estado de la build:** `vitest` 101/101 ✅ · `tsc --noEmit` 0 errores ✅ · ESLint 0 avisos ✅ · `npm audit --omit=dev`: 6 vulnerabilidades (5 altas: postcss vía next, zod, deepmerge-ts vía prisma) ⚠️ · Arranque `next dev` OK, con `/favicon.ico` → **500** por conflicto `app/favicon.ico` frente a `public/favicon.ico`.

---

## 2. Revisión crítica de las decisiones existentes

Formato: **qué se hizo → por qué es mejorable → alternativa y su respaldo → costo/impacto → cuándo.**

### 2.1 Arquitectura

**A1. Singleton en memoria como fuente de verdad (`src/server/election-store.ts`)**
- *Qué:* el estado completo (padrón, boletas, auditoría, estado) se carga una vez en memoria y las rutas leen de ahí; Postgres es un espejo.
- *Problema:* Vercel ejecuta funciones serverless en varias instancias efímeras. Cada una tiene su propia copia, así que "cerrar" en una instancia no cierra en otra. La secuencia de auditoría y el `prevHash` se calculan en memoria y colisionan entre instancias. Si Postgres falla, cae en silencio a datos demo en memoria (`:147-151`) y la elección seguiría "funcionando" sin persistir.
- *Alternativa:* handlers sin estado y la BD como única fuente de verdad. Cada operación es una transacción que lee y escribe en Postgres (`SELECT … FOR UPDATE` sobre el proceso para serializar transiciones; las secuencias las genera la BD). Es la recomendación de Next.js para Route Handlers/Server Actions en serverless y el patrón *repository/service* estándar.
- *Costo:* alto (≈4-6 días): reescribir `election-store` y `db-postgres` como servicios. *Impacto:* elimina toda una clase de bugs de consistencia. **Ahora: bloqueante.**

**A2. Sesión casera: cookie con JSON plano sin firmar (`app/api/auth/login/route.ts:184`)**
- *Problema:* cualquier cliente puede escribir `feu_session={"role":"ADMIN"}` (verificado: `GET /api/auth/login` lo acepta). No hay `middleware.ts` ni autorización por ruta. `hasPermission` y `canTransition` existen y están testeados, pero **no se usan en ningún sitio**.
- *Alternativa:* Auth.js (Credentials provider), que es lo que fija `docs/migracion-web/09` como stack; o `iron-session`/`jose` con cookie firmada y cifrada. Más un guard `requireRole()` en cada handler que use `hasPermission`. Respaldo: OWASP ASVS V3 (gestión de sesiones) y la documentación de autenticación de Next.js.
- *Costo:* medio (≈2 días). **Ahora: bloqueante.**

**A3. La máquina de estados existe pero se ignora**
- `src/domain/states.ts` define 15 estados con roles (CONVOCADO→LISTO→ABIERTA, solo ADMIN abre, no se reabre). La API salta de CONVOCADO a ABIERTA, permite `SET_STATUS` arbitrario y deja reabrir tras CERRADA.
- *Alternativa:* un único servicio `transition(processId, to, actor)` que llame a `canTransition`, escriba auditoría y aplique efectos en la misma transacción. Revisa también si los 15 estados son necesarios en v1; el handout describe 5. Recomiendo dejar los usados (CONVOCADO, ABIERTA, CERRADA, ESCRUTADA, SIN_QUORUM, EMPATE, PROCLAMADA, FINALIZADA) y documentar el resto como futuros.
- *Costo:* bajo (≈1 día) una vez hecho A1. **Ahora.**

**A4. SPA de una sola página con pestañas en estado React (`app/page.tsx`)**
- *Problema:* no hay URLs (`/votar`, `/admin`…), así que no se puede enlazar ni proteger con middleware, y el control por rol es solo de cliente. Hay componentes de 700-800 líneas (`ResultsPanel` 822, `VoterBallot` 724). `AuthModal` y `PublicReceiptVerifier` son código muerto.
- *Alternativa:* segmentos del App Router con layouts por rol y comprobación de sesión en el servidor (Server Components), que es la convención de Next 13+. Componentes de UI pequeños; plan 09 preveía shadcn/ui.
- *Costo:* medio (≈3 días). **Después de seguridad, antes del UAT.**

**A5. Fallbacks silenciosos a datos demo**
- `brigadas`, `comision`, `reglamento`, `padron/*` y `db-postgres.loadAll` devuelven valores inventados si falla la BD ("11" como brigada, `seats || 9`, estado `|| "ABIERTA"`, comisión Liz/Revisor hardcodeada).
- *Alternativa:* **fallar cerrado** (HTTP 503 y mensaje claro). En un sistema electoral un dato inventado es peor que un error. Respaldo: OWASP "fail securely".
- *Costo:* bajo. **Ahora**, junto con A1.

**A6. Despliegue: `prisma db push` y auto-seed dentro de `npm run build`**
- *Problema:* la build modifica la BD de producción; `db push` puede aplicar cambios destructivos sin migración versionada, y Prisma lo documenta como herramienta de prototipado. `prisma/seed.ts` **borra todo, incluso desactivando los triggers WORM** (`:61-70, :131-156`): ejecutarlo contra producción vaciaría las urnas, lo mismo que se quería evitar al quitar "Reiniciar urnas". Los triggers solo existen si se ejecutó el seed y `db push` no los recrea.
- *Alternativa:* `prisma migrate` con migraciones versionadas que incluyan triggers y CHECKs, `prisma migrate deploy` como paso de release (no en la build), y seed solo para desarrollo, con una guarda `NODE_ENV !== 'production'`. Para producción, un script de bootstrap **no destructivo**.
- *Costo:* bajo-medio (≈1 día). **Ahora.**

**A7. WORM con triggers creados por el seed con superusuario**
- *Problema:* protege `ballots` y `audit_events`, pero **no `ballot_selections`** (donde está el voto: se puede cambiar el presidente de una boleta con un `UPDATE`) ni `participations`. `TRUNCATE` no dispara triggers de fila. La app se conecta como `postgres`, que puede borrar los triggers.
- *Alternativa:* triggers también en `ballot_selections` y `participations`; un rol de aplicación con solo `INSERT/SELECT` en esas tablas (`REVOKE UPDATE, DELETE, TRUNCATE`), y DDL solo desde el rol de migraciones. Es el principio de mínimo privilegio de la documentación de PostgreSQL (GRANT/REVOKE).
- *Costo:* bajo. **Ahora.**

**A8. Tests solo de dominio**
- Bien hecho y por eso el dominio es lo más fiable. Pero ningún test cubre rutas, sesión ni integración, y todos los fallos graves de este informe están ahí.
- *Alternativa:* tests de route handlers contra una BD de test (vitest + BD efímera) y unos pocos e2e con Playwright para votar, cerrar, escrutar y comprobar acceso por rol. **Junto con las correcciones.**

### 2.2 Lógica de negocio y diseño del voto

**L1. Contraseña = Carnet de Identidad** *(directiva del usuario: la cuestiono expresamente)*
- El CI no es un secreto: está impreso en documentos y en listados de brigada, y aquí además lo expone la API. Con CI como contraseña, cualquiera que conozca el CI de un compañero vota por él.
- *Alternativa sin correo, que respeta tu restricción:* la Comisión genera un **código de activación de un solo uso** por elector (impreso o entregado en persona). El elector lo usa una vez junto con su CI para fijar un PIN o contraseña. Respaldo: NIST SP 800-63B §5.1 (los secretos memorizados no pueden ser información conocida públicamente).
- *Costo:* medio (≈2 días, más el proceso de entrega). *Decisión tuya; recomiendo hacerlo antes de una elección real.*

**L2. TOTP con secreto compartido y endpoint público**
- Un secreto único para todas las autoridades, hardcodeado en tres archivos, y un endpoint que entrega el código vigente equivalen a no tener MFA. El login acepta además las contraseñas genéricas `Admin1234!`, `Comision1234!`, `Votante1234!` y `Observador1234!` **para cualquier usuario** (`login/route.ts:117-121`).
- *Alternativa:* un secreto por usuario, generado al activar la cuenta, con QR estándar `otpauth://` (por ejemplo con `otplib`) para Google Authenticator o Aegis. Eliminar el endpoint y las contraseñas genéricas. Para QA, un seed de test con secretos conocidos, nunca expuestos por HTTP. Respaldo: RFC 6238 y OWASP MFA Cheat Sheet.

**L3. Comprobante que revela el contenido del voto**
- Mostrar al elector qué votó a partir del comprobante permite **demostrarle a un tercero cómo votó**, y con eso la compra de votos y la coacción. La literatura de voto electrónico llama a esta propiedad *receipt-freeness*.
- *Alternativa:* que el comprobante verifique **inclusión** ("tu boleta está en la urna y se contó"), no contenido. Recomiendo además retirar la consulta de contenido del observador.
- *Costo:* bajo.

**L4. Escrutinio sin quórum y desempate a cero**
- `tally.ts:117` (`lastElected.memberVotes > 0`) deja sin detectar el empate en el corte cuando hay 0 votos, y se resuelve por orden de boleta, lo que viola el Art. 40.
- Si `quorumMet === false`, el proceso pasa a `ESCRUTADA` en lugar de `SIN_QUORUM`, y la UI y el acta proclaman igualmente.
- Un empate tampoco cambia el estado a `EMPATE` y no existe la creación de la segunda vuelta (el `RUNOFF` del handout no existe en el código).
- *Alternativa:* el escrutinio debe decidir el estado de salida (`SIN_QUORUM` / `EMPATE` / `PROCLAMADA`) y la UI debe derivar de ese estado.

**L5. Padrón y configuración mutables durante la votación**
- La importación del padrón se aceptó con la votación ABIERTA (cambia el denominador del quórum). `POST /api/eleccion/config` acepta un quórum del 10 % y un margen de escaños distinto de 2, responde "éxito" y **no tiene efecto** (variable en memoria que nadie lee).
- Que quórum y margen sean editables contradice el Art. 38/59 y el propio handout ("nunca se hardcodea N", pero tampoco debe ser configurable). *Alternativa:* fijarlos por nivel (Facultad: >85 %, C−2) y eliminar el formulario.

**L6. Reglas de vacantes eludibles**
- Los porcentajes del Consejo son opcionales: si no se envían, se dan por cumplidos (`vacancies.ts:216-217`). La UI envía `90/100` hardcodeados (`ResultsPanel.tsx:159-160`).
- *Alternativa:* campos obligatorios capturados del acta del Consejo.

### 2.3 Modelo de datos

| Decisión | Problema | Alternativa | Cuándo |
|---|---|---|---|
| `User.email` obligatorio y único | El producto prohíbe el correo, así que se inventan correos `<ci>@estudiantes…` | `email String?` | Con la migración inicial |
| `Candidate` separado de `Membership` | Duplica persona y CI; un candidato podría no estar en el padrón | `Candidate.membershipId` (FK), datos personales solo en `Membership` | Medio plazo |
| Estados como `String` (`Candidacy.status`, `Result.status`, `ProcessCandidate.status`, `CommissionSeat.role`, `VacancyEvent.status`) | Sin integridad: ya hay `"SECRETARIO"` en BD frente a "Revisor/2do miembro" en el handout | Enums de Prisma | Con migraciones |
| Resultados triplicados (`ProcessCandidate.memberVotes/elected`, `ResultCandidate`, `Result.composition` JSON) | Solo se usa el JSON; las otras dos quedan a cero o vacías | Una sola representación normalizada (`ResultCandidate`) + hash | Medio plazo |
| `ballots.castAt` + `sequence` | Correlación temporal con `participations` (rompe el secreto) | Sin `castAt` en boleta (o truncado a la jornada); orden por `id` aleatorio; sin `sequence` correlativa | **Ahora** |
| Tablas sin uso: `acts`, `claims`, `import_batches`, `import_errors`, `vice_president_designations`, `vacancy_events`, `result_candidates`, `commissions.members` | Modelo "futuro" que confunde y aparenta funcionalidad | Escribirlas de verdad (VP y vacantes deberían persistirse ahí) o quitarlas hasta v2 | Con A1 |
| `prisma/checks.sql` | Usa nombres snake_case (`candidates_count`, `ballot_id`…) que **no existen**: el esquema no tiene `@map` por campo. Fallaría y nunca se aplicó (verificado) | Pasarlo a una migración con nombres reales | Ahora |

### 2.4 Stack y frontend

- **Next 15 + React 19 + Prisma + Tailwind 4:** buena elección, convencional y bien soportada. Mantener.
- **`zod` instalado y sin usar en ningún archivo:** los bodies se castean con `as` sin validar. *Alternativa:* un esquema Zod por endpoint (convención de Next/tRPC y OWASP "validate all input"). Bajo costo, **ahora**.
- **Acta PDF generada en el cliente (`jspdf`)** con datos del navegador y un "sello" literal falso (`"candidacy-hash-verified-sha256"`, `ResultsPanel.tsx:254`). Un acta oficial debe generarse en el servidor desde el resultado persistido y su hash.
- **Rate limiter en memoria** con clave por `x-forwarded-for` (falsificable): no funciona entre instancias. *Alternativa:* límite en BD o Upstash, y la IP que da la plataforma.
- **`receiptHash` con `Math.random()`** (`election-store.ts:326`): no es un CSPRNG. Usar `crypto.randomBytes(32)`. `AUTH_SECRET` y `BALLOT_RECEIPT_KEY` del `.env.example` no se usan en ningún sitio.
- **Node:** `engines: 26.x` en producción frente a Node 24 en local. Alinear ambos en la misma LTS.
- **Paleta:** el handout habla de ámbar/dorado; la UI real es verde CUJAE (`#136D54`) con algunos ámbar. Hay que corregir el documento o el diseño.

---

## 3. Matriz de CRUDs

Leyenda: **BE** = existe en backend · **FE** = existe y está conectado en la UI · **Prob.** = probado en esta auditoría · **Val C/S** = validación cliente / servidor · ✅ sí · ❌ no · ⚠️ parcial o defectuoso.
**Todas las celdas BE carecen de autenticación y autorización** (no se repite en cada fila).

| Entidad | Op. | BE (ruta:línea) | FE (archivo:línea) | Prob. | Val C/S | Nota |
|---|---|---|---|---|---|---|
| **Proceso electoral** | C | ❌ (solo seed) | ❌ | — | — | No se puede crear un proceso desde la app |
| | R detalle | ✅ `api/eleccion/estado/route.ts:8` | ✅ `app/page.tsx:68` | ✅ | — | Filtra CI y comprobantes de todos los electores |
| | U (estado) | ⚠️ `estado/route.ts:36-85` | ✅ `AdminPanel.tsx:147,156` | ✅ | ❌/❌ | Sin máquina de estados; `REINICIAR` y `SET_STATUS` ocultos pero activos; reapertura posible |
| | D/anular | ❌ | ❌ | — | — | |
| **Configuración** | R | ✅ `eleccion/config/route.ts:14` | ❌ (nunca se llama) | ✅ | — | |
| | U | ⚠️ `config/route.ts:25` | ✅ `AdminPanel.tsx:335` | ✅ | ⚠️ min/max HTML / ⚠️ Zod no, dominio sí | **No tiene efecto**; acepta quórum ilegal |
| **Electores (padrón)** | C (import) | ✅ `padron/import/route.ts:48` | ✅ `AdminPanel.tsx:262` | ✅ | ❌ (solo no-vacío) / ✅ CI y brigada | No guarda `brigadeId` (`:120-127`); permitido con votación ABIERTA |
| | Validar | ✅ `padron/validate/route.ts:13` | ❌ | ❌ | — | Endpoint sin UI (no hay preview antes de importar) |
| | Plantilla | ✅ `padron/template/route.ts:6` | ❌ | ❌ | — | Endpoint sin UI |
| | R lista | ⚠️ `padron/import/route.ts:15` (muestra de una Map vacía) | ❌ | ✅ | — | No hay vista de padrón |
| | U / D / habilitar | ❌ | ❌ | — | — | No se puede corregir un error ni marcar no elegible |
| **Candidatos** | C/U/D | ❌ | ❌ | — | — | Solo por seed |
| | Validar snapshot | ✅ `candidatos/snapshot/route.ts:7` | ❌ | ❌ | —/✅ | Endpoint sin UI y sin persistencia |
| | R lista | ✅ (vía estado) | ✅ `AdminPanel.tsx:365`, `VoterBallot.tsx` | ✅ | — | |
| | R detalle (bio) | ✅ (vía estado) | ✅ `BiographyModal.tsx` | ✅ | — | Sanitización por regex (`candidates.ts:74`) |
| **Brigadas** | R | ✅ `brigadas/route.ts:15` | ❌ | ❌ | — | Endpoint sin UI; fallback inventado |
| | C/U/D | ❌ | ❌ | — | — | El plan dice que se crean antes de importar |
| **Usuarios / cuentas** | C (activar) | ⚠️ `auth/activar/route.ts:17` | ❌ | ❌ | — | Sin UI; devuelve un prefijo del hash (`:110`) |
| | C implícito | ⚠️ `login/route.ts:54` y `db-postgres.ts:533-555` | — | ✅ | — | **Crea ADMIN/COMMISSION/OBSERVER por CI hardcodeado** |
| | R/U/D | ❌ | ❌ | — | — | No hay gestión de usuarios ni de roles |
| **Sesión** | C/R/D | ✅ `login/route.ts:75, 204, 224` | ✅ `LoginCard.tsx:62`, `Header.tsx:234` | ✅ | ✅ no-vacío / ⚠️ | Bug MFA en UI (`LoginCard.tsx:73`); cookie falsificable |
| **Comisión** | R | ✅ `comision/route.ts:10` | ❌ (el panel lee `estado.commission`) | ❌ | — | |
| | C (constituir) | ⚠️ `comision/route.ts:57` | ❌ | ❌ | —/✅ dominio | **Valida pero no persiste nada** |
| | U/D | ❌ | ❌ | — | — | |
| **Boleta (voto)** | C | ⚠️ `voto/emitir/route.ts:14` | ✅ `VoterBallot.tsx:164, 207` | ✅ | ✅/✅ | `voterCi` y `role` del body: suplantación verificada |
| | R (comprobante) | ✅ `voto/comprobante/route.ts:11` | ✅ `ReceiptVerifierModal.tsx` | ✅ | ✅ no-vacío | Revela el contenido (receipt-freeness) |
| | U/D | — (WORM, correcto) | — | — | — | Pero `ballot_selections` sí es mutable |
| **Escrutinio / resultado** | C | ⚠️ `escrutinio/route.ts:9` | ✅ `ResultsPanel.tsx:309` | ✅ | — | No idempotente (una fila `results` por ejecución); ignora el quórum |
| | R | ⚠️ (vía estado `tallyResult`) | ⚠️ ignora `tallyResult` del GET (`ResultsPanel.tsx:77-93`) | ✅ | — | Tras recargar hay que "re-escrutar" |
| | Export CSV/PDF | — (cliente) | ✅ `ResultsPanel.tsx:427, 434` | ⚠️ | — | PDF cliente; firmas mock en el acta HTML |
| **VP / composición** | C | ⚠️ `comision/designar-vp/route.ts:8` | ✅ `ResultsPanel.tsx:519` | ✅ | ✅/✅ | Permitido sin quórum; no persiste en `vice_president_designations` |
| | U (vacante, nuevo VP) | ⚠️ `comision/vacante/route.ts:12` | ✅ `ResultsPanel.tsx:662, 695` | ✅ | ⚠️/⚠️ | **Se pierde al reiniciar**; Consejo hardcodeado 90/100 |
| **Auditoría** | R | ✅ `auditoria/route.ts:7` | ❌ | ✅ | — | Endpoint sin UI (el handout promete visor para observador); falso positivo de integridad |
| **Reglamento** | R | ✅ `reglamento/route.ts:5` | ✅ `ReglamentoViewer.tsx:50` | ✅ | — | Solo 50 de 321 artículos sin búsqueda (`take: 50`); no accesible para anónimos |
| **Reclamaciones** | CRUD | ❌ | ❌ | — | — | Diferido, como dice el handout (tabla `claims` sin uso) |

**Resumen:**
- *Endpoints sin interfaz:* config GET, comision GET/POST, auditoria, brigadas, candidatos/snapshot, health, padron GET/template/validate, auth/activar, acciones `REINICIAR`/`SET_STATUS`.
- *Interfaces sin efecto real:* "Guardar Configuración"; "Iniciar Sesión" del Header (inalcanzable, `Header.tsx:244`); el chip "Habilitado para votar", que siempre aparece.
- *CRUDs incompletos:* proceso, padrón, candidatos, brigadas, usuarios y comisión carecen de U/D, y en varios casos también de C. Para una elección real la Comisión no puede corregir el padrón ni los candidatos sin tocar el seed.

---

## 4. Hallazgos por categoría

Severidad: 🔴 crítico · 🟠 alto · 🟡 medio · 🟢 bajo. "Verificado" = reproducido en `feu_audit`.

### 4.1 Seguridad

| # | Sev. | Hallazgo | Archivo:línea | Evidencia | Propuesta |
|---|---|---|---|---|---|
| S1 | 🔴 | Ninguna ruta API exige sesión ni rol | todas las `app/api/**/route.ts`; no hay `middleware.ts` | Verificado: `curl` anónimo `ABRIR` → `{"ok":true,"status":"ABIERTA"}`; `SET_STATUS FINALIZADA` → ok | Sesión firmada + `requireRole()` con `hasPermission`/`canTransition` (A2, A3) |
| S2 | 🔴 | Suplantación de voto: `voterCi`/`role` del body | `api/voto/emitir/route.ts:23,41`; `VoterBallot.tsx:65` | Verificado: voto anónimo como "Katia" → `ok:true`; voto con `role:"COMMISSION"` | Tomar la identidad solo de la sesión del servidor |
| S3 | 🔴 | Ruptura del secreto del voto (API) | `api/eleccion/estado/route.ts:12-18` + `api/voto/comprobante/route.ts` | Verificado: estado → `Katia…|812e02…` → comprobante → `[["Elena Castillo Vargas",true,true],…]` | No exponer el listado de electores ni los comprobantes; el comprobante sin contenido (L3) |
| S4 | 🔴 | Ruptura del secreto del voto (BD WORM) | `election-store.ts:341-351`; `db-postgres.ts:368-381` | Verificado: `audit_events` → `97070710293 \| 812e02…`; `castAt` idéntico en participación y boleta | Auditoría del voto sin `actorCi` ni comprobante; quitar `castAt`/`sequence` correlativos. **Ojo:** por ser WORM, lo ya escrito en producción no se puede borrar sin desactivar triggers; decidir qué hacer con esos datos |
| S5 | 🔴 | MFA anulado: endpoint público del TOTP + secreto compartido | `api/auth/totp/current/route.ts:1-37`; `login/route.ts:17,148`; `LoginCard.tsx:25-41` | Verificado: token devuelto sin sesión; la UI lo consulta cada 5 s | Eliminar el endpoint; secreto por usuario con enrolamiento QR (L2) |
| S6 | 🔴 | Contraseñas genéricas válidas para cualquier usuario | `login/route.ts:117-121` | Verificado: `Adrian` + `Admin1234!` + TOTP público → ADMIN | Eliminar `passwordMatchesLegacy` |
| S7 | 🔴 | Creación automática de cuentas privilegiadas por CI hardcodeado | `login/route.ts:19-70` (`ensureDefaultUsers` en cada login); `db-postgres.ts:533-555` | Verificado: aparecen ADMIN 02091978927, COMMISSION 02031194852 y OBSERVER 02111574920 | Eliminar ambos bloques; **revisar la BD de producción y desactivar esas cuentas** |
| S8 | 🔴 | Cookie de sesión sin firmar | `login/route.ts:184-190, 204-219` | Verificado: cookie `{"role":"ADMIN"}` falsificada → `authenticated:true` | Cookie firmada (Auth.js / iron-session) |
| S9 | 🟠 | Login por subcadena: `"a"` resuelve a un usuario cualquiera y la respuesta revela su CI y rol | `db-postgres.ts:514-519`; `login/route.ts:136-145` | Verificado: `username:"a"` → `{ci:"99091978927",role:"ADMIN"}` | Coincidencia exacta y normalizada; mensaje genérico "credenciales incorrectas" |
| S10 | 🟠 | `ballot_selections` y `participations` sin protección WORM; el rol de la app puede borrar triggers | `prisma/seed.ts:72-125` | Verificado: `UPDATE ballot_selections` aceptado | Triggers adicionales + rol con mínimo privilegio (A7) |
| S11 | 🟠 | `npm run db:seed` vacía todo, urnas incluidas, desactivando WORM | `prisma/seed.ts:61-70,131-156` | Lectura de código | Guarda de entorno; script de producción no destructivo (A6) |
| S12 | 🟠 | Comprobante con `Math.random()` | `election-store.ts:326` | Código | `randomBytes(32)` |
| S13 | 🟡 | Rate-limit en memoria con clave `x-forwarded-for` falsificable | `rate-limiter.ts`; `login/route.ts:81` | Código | Almacén compartido + IP de la plataforma |
| S14 | 🟡 | `activar` devuelve un prefijo del hash de la contraseña | `auth/activar/route.ts:110` | Código | No devolver nada derivado del hash |
| S15 | 🟡 | 6 vulnerabilidades npm (5 altas) | `package.json` | `npm audit` | Actualizar next/postcss, zod 3.25→parche y prisma; probar después |
| S16 | 🟢 | Bodies sin validación de esquema (`zod` sin uso) | todas las rutas | grep | Zod por endpoint |

### 4.2 Lógica de negocio

| # | Sev. | Hallazgo | Archivo:línea | Evidencia | Propuesta |
|---|---|---|---|---|---|
| L-1 | 🔴 | Se proclama sin quórum (estado `ESCRUTADA`, nunca `SIN_QUORUM`) | `election-store.ts:430-433`; `ResultsPanel.tsx` (bloque presidente y acta) | Verificado: 26,67 % → "PRESIDENTE ELECTO… Elena Castillo Vargas"; acta "NO CUMPLIDO… da por válidos" | El escrutinio fija `SIN_QUORUM`; la UI no muestra electos ni acta de proclamación |
| L-2 | 🔴 | Empate a 0 votos resuelto por orden alfabético (Art. 40) | `src/domain/tally.ts:117` | Verificado: 6 candidatos con 0 votos "Electo" frente a 2 "No electo" | Quitar `> 0` y añadir test; con 0 votos en el corte se va a desempate/segunda vuelta |
| L-3 | 🔴 | Estado en memoria divergente o perdido (VP, sucesión, comprobantes) tras reiniciar o con varias instancias | `db-postgres.ts:275, 282`; `election-store.ts` | Verificado: tras reiniciar, `composition:null`, vacantes → "No existe composición" | A1; persistir en `vice_president_designations` y `vacancy_events` |
| L-4 | 🟠 | Falso positivo de manipulación en la cadena de auditoría | `src/domain/audit.ts:47` + `election-store.ts:475` | Verificado: `chainIntegrity: {valid:false, brokenSequence:13}` | Omitir claves `undefined` en la serialización canónica (RFC 8785 no las admite); test de ida y vuelta por JSONB |
| L-5 | 🟠 | Reapertura tras cerrar y transiciones arbitrarias | `AdminPanel.tsx:147`; `estado/route.ts:41-85` | Verificado: "Abrir Votación" visible en CERRADA | `canTransition` (A3) |
| L-6 | 🟠 | Padrón modificable con votación abierta | `padron/import/route.ts:48` | Verificado: 13→15 electores en ABIERTA | Rechazar si el estado ≠ CONVOCADO/BORRADOR |
| L-7 | 🟠 | Importación pierde la brigada (luego se rellena "11") | `padron/import/route.ts:120-127`; `db-postgres.ts:169` | Verificado: `brigadeId` nulo; observador muestra "Brigada 11 Total: 4" | Mapear `brigadeCode`→`brigadeId`; rechazar brigadas desconocidas |
| L-8 | 🟠 | `REINICIAR` vacía la memoria pero no la BD (WORM) → estado incoherente | `estado/route.ts:59-76` | Código | Eliminar la acción (coherente con tu directiva) |
| L-9 | 🟡 | Escrutinio no idempotente en BD (una fila `results` y un evento por ejecución); re-escrutable en PROCLAMADA | `election-store.ts:410,445`; `escrutinio/route.ts:11` | Verificado: `results = 2` | Escrutar una sola vez, en CERRADA; los recálculos posteriores solo verifican |
| L-10 | 🟡 | Configuración que no se aplica y acepta valores ilegales | `eleccion/config/route.ts:9,37` | Verificado: 10 % aceptado, summary sigue en 85 | Eliminar el formulario o fijar valores por nivel (L5) |
| L-11 | 🟡 | Vacantes: requisitos del Consejo opcionales y UI con 90/100 fijos | `vacancies.ts:216-217`; `ResultsPanel.tsx:159-160` | Código | Campos obligatorios |
| L-12 | 🟡 | Sin flujo de empate ni de segunda vuelta (`EMPATE`/`SEGUNDA_VUELTA` nunca se asignan) | `escrutinio/route.ts` | grep | Implementar o documentar como fuera de v1 |
| L-13 | 🟡 | Auditoría con actor `"COMMISSION"` literal y no la persona real | `election-store.ts:436, 469` | Código | Actor desde la sesión |
| L-14 | 🟢 | `checks.sql` con nombres de columna inexistentes | `prisma/checks.sql:15-48` | `pg_constraint` sin esos CHECK | Pasarlo a una migración |

### 4.3 Funcionalidades incompletas, código muerto y mocks

| # | Sev. | Elemento | Ubicación |
|---|---|---|---|
| I1 | 🟠 | Firmas mock Elena García / Frank Hernández / Giselle López en el acta HTML (el PDF sí usa Liz/Revisor) | `ResultsPanel.tsx:805-816` |
| I2 | 🟠 | "Sello criptográfico" literal falso | `ResultsPanel.tsx:254`; `pdfActa.ts:199` |
| I3 | 🟠 | Datos demo duplicados en tres sitios con personas distintas (store en memoria, login, seed); CI de "Adrián Rodríguez Jorge" como candidato y ADMIN | `election-store.ts:73-102`; `login/route.ts:19-52`; `seed.ts` |
| I4 | 🟡 | Resumen inicial falso: ABIERTA, 9 escaños, 11 candidatos | `app/page.tsx:33-46` |
| I5 | 🟡 | Componentes muertos: `AuthModal`, `PublicReceiptVerifier`; pestañas `LOGIN`/`VERIFICAR`; props `onOpenAuth`/`onSelectVoter` | `Header.tsx:18-24, 83-89, 244-256`; `page.tsx:172` |
| I6 | 🟡 | `recordAudit` y `hashPayload` (servidor) sin uso; `AUTH_SECRET` y `BALLOT_RECEIPT_KEY` sin uso | `src/server/audit.ts`; `.env.example` |
| I7 | 🟡 | Requisitos del handout no implementados: visor de auditoría para observador; acceso anónimo a reglamento y verificador; segunda vuelta; "RUNOFF"; designación de VP con acta | — |
| I8 | 🟡 | Textos fijos: ">85 %", "11 candidatos → 9 puestos" (hay 10/8), "321 artículos" (se ven 50) | `AdminPanel.tsx:313,331`; `VoterBallot.tsx:693`; `ReglamentoViewer.tsx:92` |
| I9 | 🟢 | `/api/health` dice `phase: "F2"` | `health/route.ts:16` |
| I10 | 🟢 | Conflicto de favicon → 500 | `app/favicon.ico` frente a `public/favicon.ico` |
| I11 | 🟢 | Fase 8 entera pendiente (carga, Docker, runbook, UAT), como indica el handout | — |

### 4.4 UI/UX (*design-critique*)

**Impresión general:** limpia, institucional y legible; la boleta es lo mejor resuelto. El mayor problema es que **la UI afirma garantías que el sistema no cumple** y muestra acciones que el usuario no debería poder hacer, lo que contradice tu propio principio de "no mostrar lo que no se puede hacer".

| # | Sev. | Hallazgo | Evidencia / ubicación | Propuesta |
|---|---|---|---|---|
| U1 | 🔴 | El login de autoridades nunca pide TOTP y entra sin sesión (la UI cree que sí la hay) | `LoginCard.tsx:73` (el servidor responde 200 con `ok:false`, `login/route.ts:136`); verificado: panel visible con `authenticated:false` | Comprobar `data.ok`/`data.requireTotp`; el servidor debe responder 401 |
| U2 | 🟠 | Emisión del voto sin paso de revisión y confirmación | Verificado: un clic en "Depositar Voto Válido" registra el voto | Pantalla de resumen ("Vas a votar por: …; Presidente: …") con "Confirmar voto" / "Volver" (patrón estándar de voto electrónico) |
| U3 | 🟠 | Acciones irreversibles sin confirmación (cerrar votación, escrutar, designar VP, vacante) | `AdminPanel.tsx:156`; `ResultsPanel.tsx:309,519,662` | Diálogo con consecuencia explícita |
| U4 | 🟠 | Controles de escrutinio, VP y vacantes visibles para VOTER/OBSERVER | `ResultsPanel.tsx` no recibe el rol | Ocultar por rol (y proteger en el servidor) |
| U5 | 🟠 | Scroll horizontal en anchos de tableta: la navegación de ADMIN/COMMISSION no se ajusta | Verificado a 755 px: `scrollWidth 1174`; `Header.tsx:197` | Menú colapsable o pestañas con iconos bajo `lg`; probar de 768 a 1280 |
| U6 | 🟡 | Mensajes de estado engañosos: "La votación aún no ha comenzado" en CERRADA/ESCRUTADA; "anulada" con estilo verde de éxito | `VoterBallot.tsx:235-248` | Pantallas por estado: "Votación cerrada", "Resultados publicados"; anulada en tono neutro |
| U7 | 🟡 | Cabecera móvil de unos 170 px; título y afluencia truncados | Captura a 375 px | Cabecera compacta con logo y estado; navegación inferior o menú |
| U8 | 🟡 | Encabezado "APELLIDOS Y NOMBRES" pero se muestra "Nombre Apellidos" | Boleta escritorio | Mostrar "Castillo Vargas, Elena", coherente con el orden alfabético por apellido (Art. 60) |
| U9 | 🟡 | `alert()` nativos para errores | `AdminPanel.tsx:62,92`; `ResultsPanel.tsx:118,145,183`; `ObserverPanel.tsx:206` | Mensajes inline o toast con `role="alert"` |
| U10 | 🟢 | Afluencia en vivo visible para votantes durante la votación | Header "Sufragio: 3 de 13" | Decisión de la Comisión; suele ocultarse para no influir |

**Lo que funciona bien:** boleta con contador "0/8" y estado del presidente siempre visible; la regla "presidente ⇒ miembro" se aplica automáticamente al marcar y desmarcar; tarjetas móviles con barra inferior fija; diálogo de anulación muy claro; reglamento con filtros temáticos.

### 4.5 Accesibilidad, WCAG 2.1 AA (*accessibility-review*)

**Resumen:** 13 problemas (4 graves, 6 importantes, 3 menores). *Contraste:* mi escaneo automático no fue fiable por los colores `oklch()`, así que no lo uso como evidencia. Por tokens, el texto principal (gray-600/700/900 y verde-700 sobre blanco) debería cumplir 4,5:1. Antes del UAT hay que pasar axe/Lighthouse.

| # | Sev. | Problema | Criterio | Ubicación | Corrección |
|---|---|---|---|---|---|
| A1 | 🔴 | Los modales no reciben el foco, no lo atrapan y no cierran con Escape (verificado en el de anulación) | 2.1.2, 2.4.3 | `VoterBallot.tsx:677`, `BiographyModal.tsx:15`, `ReceiptVerifierModal.tsx:56` | `<dialog>` nativo con `showModal()`, o Radix Dialog |
| A2 | 🔴 | Checkboxes y radios de la boleta sin nombre accesible (el lector dice "casilla, no marcada" sin el candidato) | 4.1.2, 1.3.1 | `VoterBallot.tsx:512-528` | `aria-label="Miembro: Elena Castillo Vargas"` o `<label>` asociada |
| A3 | 🔴 | Etiquetas sin `htmlFor`/`id`; inputs sin label (TOTP, hash, búsqueda) | 3.3.2, 1.3.1 | `LoginCard.tsx:163,185,246`; `ResultsPanel.tsx:607-683`; `ObserverPanel.tsx:196`; `ReglamentoViewer.tsx:105` | Asociar label e input |
| A4 | 🔴 | Errores no anunciados (sin `role="alert"`/`aria-live`) ni vinculados al campo | 3.3.1, 4.1.3 | mensajes de LoginCard y VoterBallot | `aria-live="assertive"` + `aria-describedby` |
| A5 | 🟠 | Objetivos táctiles < 44 px: pestañas 28 px de alto, cerrar sesión 29×29, "Propuestas" 71×25, "Marcar miembro/presidente" 37 px, enlace del comprobante 16 px | 2.5.5 (AAA; recomendado en móvil) | medido a 375 px | Mínimo `min-h-11` |
| A6 | 🟠 | Texto de 9-10 px (badges de rol, páginas, TOTP) | 1.4.4 / legibilidad | `Header.tsx:227`, `LoginCard.tsx:215,237`, `text-[10px]` en varios | Mínimo 12 px, recomendado 14 px |
| A7 | 🟠 | Foco poco visible: `focus:outline-hidden` y sin `focus-visible` en botones | 2.4.7 | `AdminPanel.tsx:248`; `ObserverPanel.tsx:201` | Anillo `focus-visible:ring-2` con token |
| A8 | 🟠 | Pestañas sin `aria-current`/`role="tab"` | 4.1.2 | `Header.tsx:199` | `aria-current="page"` |
| A9 | 🟠 | Botones móviles de marcar sin `aria-pressed` | 4.1.2 | `VoterBallot.tsx:586-618` | `aria-pressed` |
| A10 | 🟠 | Spinners sin `role="status"` | 4.1.3 | varios | `role="status"` + texto oculto |
| A11 | 🟡 | `AuthModal` sin `role="dialog"` (es código muerto: eliminar) | 4.1.2 | `AuthModal.tsx:134` | — |
| A12 | 🟢 | Enums crudos leídos por el lector ("Proceso CERRADA") | 3.1 | `Header.tsx:182` | Etiquetas legibles |
| A13 | 🟢 | Sin `prefers-reduced-motion` en animaciones | 2.3.3 | `globals.css` | Media query |

**Prioridad:** A2 y A1 (un elector con lector de pantalla hoy no puede votar con seguridad), luego A3/A4, luego tamaños.

### 4.6 Sistema de diseño (*design-system*)

**Puntuación orientativa: 45/100.**

| Categoría | Definido | Valores hardcodeados o problemas |
|---|---|---|
| Color | `globals.css:8-37`: `feu-green` 50/100/300/500/700/900, `cujae-green`, `feu-carmesi` | `#136D54` unas 25 veces aunque existe `cujae-green-500`; `#8F1639` hardcodeado (Footer:9, LoginCard:143); **clases sin token que no generan estilo:** `feu-green-200`, `-400`, `-800` (Bio, Admin, Observer, Results, Reglamento); hovers distintos (`#0f5441` frente a `#0C4B39`); se mezclan emerald, amber, blue, indigo, purple y sky en estados (Header:47-73) |
| Semánticos | ❌ No hay `--color-success/warning/danger/surface/text-muted` | Cada componente elige su paleta; "anulada" sale en verde |
| Tipografía | ❌ Sin `next/font`; fuente del sistema | Escala ad hoc: `text-[9px]`, `[10px]`, `[11px]`, `xs`… |
| Radios / sombras | ❌ | `lg`, `xl` y `2xl` mezclados en tarjetas equivalentes |
| Modo oscuro | ❌ `color-scheme: light` fijo (verificado con `prefers-color-scheme: dark`) | — |
| Componentes | ❌ Sin primitivas (Button, Input, Card, Dialog, Badge); el plan preveía shadcn/ui | Botones reimplementados en cada archivo |

**Acciones:** (1) tokens semánticos en `@theme` (Tailwind 4) con variantes claro/oscuro; (2) primitivas Button/Input/Dialog/Badge con estados y foco (shadcn/ui o Radix, como decía el plan); (3) sustituir hex sueltos y clases inexistentes; (4) escala tipográfica fija (12/14/16/20/24/32).

### 4.7 Copy (*ux-copy*)

| Problema | Ejemplo actual | Propuesta |
|---|---|---|
| Jerga técnica para votantes | "Comprobante criptográfico oficial (SHA-256)", "MFA TOTP", "Merge por CI", "Urna Ciega desacoplada" | "Tu código de comprobante", "Código de verificación", "Importar electores (se omiten carnés repetidos)", "Tu voto es secreto" |
| **Afirmaciones falsas sobre el secreto** | "Ninguna tabla del sistema asocia la identidad del elector con la boleta" (Observer); "completamente desvinculada de tu identidad" | Retirarlas hasta que sea cierto; después, explicarlo sin absolutos |
| Tú/usted mezclados | "Por favor ingrese…" (login) frente a "Debes seleccionar…" (boleta) | Elegir uno: recomiendo **tú**, por coherencia con la FEU y con la mayoría de pantallas |
| Enums crudos | "Proceso CERRADA", "FINALIZADA" | "Votación cerrada", "Resultados publicados" |
| Mensajes de éxito sin efecto | "Configuración actualizada exitosamente" | Eliminar el formulario (L-10) |
| Acta contradictoria | "Requisito de validez: NO CUMPLIDO… la Comisión firma y da por válidos los presentes resultados" | Plantilla distinta para "Elección no válida por falta de participación (Art. 38)" |
| Errores genéricos | "Error de conexión con el servidor electoral." | "No pudimos registrar tu voto. Tu voto **no** se ha contado. Revisa tu conexión e inténtalo de nuevo." |
| CTA ambiguo | "Anular boleta conscientemente" | "Anular mi boleta" (el diálogo ya explica la consecuencia) |
| Etiquetas de género fijas | "PRESIDENTA", "SECRETARIA" para Revisor | Usar el cargo almacenado y neutro: "Presidencia", "Secretaría", "Miembro revisor" |

### 4.8 Dirección estética (*frontend-design*)

**Asunto:** una herramienta institucional de votación para unos 1 500 estudiantes de Informática, usada sobre todo en móvil Android durante una jornada. **Su trabajo principal es transmitir confianza y que no haya errores al votar**, no lucirse.

**Propuesta: "papeleta impresa".** Que la pantalla recuerde a una boleta oficial en papel, no a un panel SaaS:
- **Color (4-5 valores):** papel `#FBFAF6`, tinta `#1D2421`, verde CUJAE `#136D54` (acción primaria y foco), carmesí FEU `#8F1639` (solo el sello FEU, como ya decidiste), ámbar Informática `#B7791F` (solo avisos). Eliminar emerald, indigo, purple y sky.
- **Tipografía:** **Public Sans** (de origen gubernamental, muy legible en Android, con tildes y ñ correctas) para la interfaz, y **Source Serif 4** solo para el reglamento y el acta, que son textos legales. Escala 14/16/20/28 y nada por debajo de 12 px.
- **Layout de la boleta:** tabla con reglas finas como un formulario oficial, número de casilla grande, apellidos primero y marcas de 44 px. Un solo momento de énfasis: el **sello de "Voto registrado"** al confirmar, el único elemento con presencia visual.
- **Qué evitar:** tarjetas redondeadas idénticas con sombra en todas partes, etiquetas en MAYÚSCULAS sobre cada bloque, y "→" en los botones (ya aparece en "Iniciar Sesión →").
- **Modo oscuro:** opcional para votantes; prioridad baja frente a todo lo anterior.

Coste: unos 3-4 días, después de A4 (rutas) y del sistema de tokens; no tiene sentido rediseñar componentes que se van a reescribir.

---

## 5. Plan de trabajo priorizado

Estimaciones para una persona que conoce el código, en días de trabajo efectivo.

| Fase | Contenido | Hallazgos | Esfuerzo |
|---|---|---|---|
| **0. Contención inmediata** (antes de cualquier otra cosa) | Revisar la BD de producción por cuentas creadas por `ensureDefaultUsers` y desactivarlas; retirar el despliegue público o protegerlo (por ejemplo, Vercel Password Protection) hasta terminar la fase 1; rotar cualquier secreto | S5-S7 | 0,5 d |
| **1. Seguridad y secreto del voto** | Sesión firmada (Auth.js) + middleware + `requireRole` en todas las rutas; identidad del voto desde la sesión; eliminar `totp/current`, contraseñas genéricas, auto-creación de usuarios y `REINICIAR`/`SET_STATUS`; quitar CI y comprobantes de la API; auditoría del voto sin identidad; quitar `castAt`/`sequence` correlativos; `randomBytes`; Zod en los bodies; búsqueda exacta en login | S1-S9, S12, S16, L-8 | 4-5 d |
| **2. Persistencia y lógica** | Eliminar el singleton: servicios con BD como fuente de verdad y transacciones; máquina de estados aplicada; escrutinio único que fija SIN_QUORUM/EMPATE/PROCLAMADA; corregir el empate a 0; persistir VP y vacantes; corregir la serialización canónica; padrón congelado y con brigada; eliminar el formulario de config; fallar cerrado | A1, A3, A5, L-1…L-13 | 5-6 d |
| **3. BD y despliegue** | `prisma migrate` con triggers (incluido `ballot_selections`/`participations`) y CHECKs; rol de app con mínimo privilegio; seed solo en desarrollo; `email` opcional; enums; quitar tablas sin uso o escribirlas; alinear versión de Node; `npm audit` | A6, A7, S10, S11, S15, 2.3 | 2-3 d |
| **4. Tests** | Tests de rutas con BD efímera (auth, voto, transiciones, escrutinio) + e2e Playwright de la jornada completa | A8 | 2-3 d |
| **5. UX funcional y accesibilidad** | Revisión y confirmación del voto; confirmaciones en acciones de la Comisión; controles por rol; pantallas por estado; arreglar el bug de MFA en la UI (queda resuelto con la fase 1); modales accesibles; labels y ARIA; tamaños táctiles; overflow en tableta; acta en el servidor sin firmas mock; copy | U1-U9, A1-A10, I1, I2, 4.7 | 3-4 d |
| **6. CRUDs que faltan para operar** | Gestión del padrón (listar/editar/habilitar), candidatos (alta/edición antes de LISTO), brigadas, constitución de la Comisión persistida, visor de auditoría para observadores | Matriz §3 | 4-5 d |
| **7. Arquitectura de frontend y diseño** | Rutas por rol en el App Router, primitivas de UI, tokens semánticos, dirección estética "papeleta", eliminar código muerto | A4, 4.6, 4.8, I4-I6 | 4-6 d |
| **8. Fase 8 original** | Pruebas de carga, Docker + runbook, simulacro UAT | I11 | 3-4 d |

**Total aproximado: 28-37 días.** Las fases 0-2 (≈10 días) son el mínimo para que el sistema garantice lo que el handout ya dice que garantiza. **No recomiendo hacer el UAT (8.3) antes de cerrar las fases 1, 2 y 4.**

---

## Anexo: cómo reproducir y limpiar

- BD de pruebas: `feu_audit` (creada en esta auditoría; contiene 4 boletas de prueba). Para borrarla: `DROP DATABASE feu_audit;` desde psql.
- `.claude/launch.json` (nuevo): configuración `feu-audit` que lanza `next dev -p 3005` contra `feu_audit` mediante un script en el scratchpad de la sesión. Puedes borrarlo sin problema.
- No se modificó ningún archivo de código del repositorio.
