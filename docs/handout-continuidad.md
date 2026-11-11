# HANDOUT DE CONTINUIDAD — Elecciones FEU, Facultad de Ingeniería Informática

## 1. Resumen ejecutivo

Sistema web para elegir el **Secretariado de la Facultad de Ingeniería Informática** (FEU). Alcance v1: solo Facultad. El modelo es multi-nivel configurable, pero **sede, filial, residencia, centro y nacional no se implementan** (solo están modelados en datos y documentados como trabajo futuro). No hay código aún; solo documentación vigente en `docs/migracion-web/08-marco-legal-feu.md` y `docs/migracion-web/09-plan-implementacion-facultad.md`. La siguiente IA debe continuar con F0 (cierre de decisiones) y luego F1 (scaffold).

Regla central: `N = cantidad de candidatos − 2`. La demo usa **11 candidatos → 9 puestos**. `N` no se configura por separado; se deriva de la lista cargada. Mínimo 5 candidatos (`N ≥ 3`).

## 2. Objetivo y criterios de éxito

- Objetivo: digitalizar la elección del Secretariado de la Facultad de Ingeniería Informática según el Reglamento de la FEU (2019), `ABC-FEU-2019.pdf`.
- Criterios de éxito:
  - Proceso configurable por datos; sin constantes `9`, `11`, `5`, `85` hardcodeadas en UI o servicios.
  - `N` se deriva de `candidatos.length`; boleta de `N+2` filas.
  - Voto secreto, único, con comprobante verificable (`receipt_hash`).
  - Escrutinio reproducible, idempotente, con empates por votos de presidente y segunda vuelta como proceso hijo.
  - Quórum >85 % sobre membresía habilitada; no se proclama si no se cumple.
  - Acta inmutable con hash; retención ≥1 año.
  - VP designado después del cierre, entre los `N` electos; vacantes con versiones de composición.
  - Módulo «Reglamento» con texto literal de artículos aplicables, fuente y página.
  - Accesibilidad AA (temas verde/amarillo).

## 3. Estado actual del proyecto

- `ABC-FEU-2019.pdf` analizado (114 páginas). Texto extraído temporal en `C:\Users\Adrián Rodríguez\AppData\Local\Temp\opencode\abc-feu-2019.txt`.
- Documentos `01`–`07` eliminados.
- Vigentes: `08` (marco legal y reglas generalizadas), `09` (plan de implementación), `10` (acta F0 + matriz de trazabilidad) y `11` (decisiones técnicas de F1).
- **F0 cerrada técnicamente** (acta, decisiones y matriz RGF → prueba en `10`).
- **F1 cerrada técnicamente y desplegada:** Next.js 15 + Prisma en la raíz, dominio puro (`src/domain/`), build de producción optimizado, y endpoints de salud (`/api/health`) y Reglamento (`/api/reglamento`).
- **F2 completada y verificada:** Dominio puro de Carnet de Identidad (`ci.ts`), validación e importación de padrón con plantilla oficial (`padron.ts`), constitución y actas de la Comisión Electoral (`commission.ts`), matriz de permisos y un voto por miembro (`permissions.ts`), y autenticación/activación/MFA TOTP (`auth.ts`). 77 pruebas unitarias en verde.
- **F3 completada y verificada:** Orden alfabético determinista de candidaturas (`candidates.ts`), biografía en Markdown sanitizada con hash SHA-256 (`INV-17`), snapshot inmutable de boleta, configuración dinámica del proceso sin valores fijos (`config.ts`, umbral >85 %, margen N=C-2), e importación incremental con merge por CI deduplicado (`importPadronIncremental`). Endpoints `/api/eleccion/config`, `/api/candidatos/snapshot` y `/api/padron/import`.
- **F4 completada y desplegada:** Interfaz de boleta oficial de 4 columnas (Art. 60), diseño responsive para escritorio y tarjetas táctiles adaptables para Android, validación reactiva sin citas de artículos al votante, radio button transferible de presidencia condicionado a membresía, anulación voluntaria en 2 pasos (`ANULADA_POR_ELECTOR`), urna ciega desacoplada (`INV-04`), botón de copiado instantáneo de comprobante (`📋 Copiar Comprobante`) y modal de verificación criptográfica de boletas inmutables (`ReceiptVerifierModal`). Endpoint `POST /api/voto/emitir` y `GET /api/voto/comprobante`.
- **F5 completada y desplegada:** Escrutinio oficial auditable (`tally.ts`), cálculo estricto de participación mínima requerida (>85 %, Art. 38), detección de empates en corte o presidencia con llamado a segunda vuelta (Art. 40), designación reglamentaria de Vicepresidente por la Comisión (Art. 67), acta formal imprimible y exportación a CSV. Endpoints `POST /api/escrutinio` y `POST /api/comision/designar-vp`.
- **F6 completada y desplegada (excepto 6.3):** Módulo interactivo «Reglamento» (`/api/reglamento`, `ReglamentoViewer.tsx`), gestión y sucesión de vacantes (`vacancies.ts`, `/api/comision/vacante`), exportación de Acta Oficial a PDF descargable con jspdf (`pdfActa.ts`), y panel de Observación (`ObserverPanel.tsx`).
- **F7 completada y desplegada:** Persistencia relacional ACID conectada a PostgreSQL 16 local con Prisma ORM (`src/server/db-postgres.ts`, `postgresql://postgres:kote020919@localhost:5432/feu`) y separación estricta de urna ciega (`INV-04`), autenticación de electores y oficiales con modal interactivo y MFA TOTP obligatorio (`AuthModal.tsx`, `/api/auth/login`, `/api/auth/totp/current`), blindaje WORM con triggers nativos PL/pgSQL que abortan mutaciones o borrados sobre boletas y auditoría (Art. 66 / RGF-33), serialización canónica RFC 8785 para la cadena de auditoría, y limitador de tasa deslizante (`rate-limiter.ts`).
- **Identidad visual e higiene normativa:** Integración de la tríada institucional oficial (CUJAE, FEU, Facultad de Ingeniería Informática), favicon generado a partir del escudo de la Facultad, erradicación completa de términos no estatutarios («Padrón» reemplazado por «Membresía / Listado de Electores», «Quórum» reemplazado por «Participación requerida >85 %», y eliminación de «CUBA», «orca» y hashes crudos en la interfaz visual).
- **Autenticación real e interfaz de producción:** Acceso de electores mediante Nombre registrado y Carnet de Identidad como contraseña provisional, cero dependencia de correos electrónicos, eliminación de dropdowns de suplantación de electores en la boleta, erradicación de hashes visuales, control estricto de roles (`ADMIN`, `COMMISSION`, `VOTER`, `OBSERVER`), y 101 pruebas unitarias en verde (`npm run test`), 0 errores de ESLint, build de producción Next.js 15 activo en `http://localhost:3000` con PostgreSQL 16.
- **Principio estricto de UX e higiene institucional:** Aplicación del principio «No mostrar al usuario lo que no puede hacer». Eliminación de todas las referencias técnicas internas en la UI (`(INV-04)`, `(INV-06)`, `(RFC 8785)`). Footer consolidado en una sola línea con `FEU` destacado en rojo carmesí. Paleta visual adaptada al color institucional dorado/ámbar de la Facultad de Ingeniería Informática con contraste WCAG AA, reservando el rojo únicamente para las siglas de la FEU. Vistas segregadas herméticamente: visitantes ven portal de login y auditoría pública; votantes ven únicamente su boleta y reglamento; observadores ven panel de observación y auditoría; comisión/admin ven la consola de gestión completa.

## 4. Decisiones tomadas y su justificación

| Decisión | Justificación |
|---|---|
| v1 solo Facultad | Arts. 36–42, 59–68; alcance del cliente |
| `N = candidatos − 2` (demo: 11 → 9) | Art. 59; el sistema no fija `N` |
| Mínimo 5 candidatos (`N ≥ 3`) | Composición requiere presidente + VP + ≥1 miembro |
| No hay voto en blanco; 0 marcas = inválida | Art. 61 («hasta N»); se permite anular en dos pasos |
| Anulada cuenta participación y quórum, no suma votos, consume el voto | Abstención ≠ boleta anulada |
| Hasta `N` marcas de miembro (no exactamente N) | Art. 61 |
| Presidente entre los `N` electos | Art. 63 |
| Empate: votos de presidente; si persiste, nueva votación | Art. 40 (prohibido desempatar por orden) |
| Quórum >85 %; sin 80 % en Facultad | Art. 38 (80 % solo universidad) |
| Validación por brigada y aprobación del Consejo no son requisitos | Decisión del cliente; referencia opcional |
| VP se designa después del cierre, entre los electos, sin plazo de 3 días | Art. 67 (fondo, no plazo) |
| VP recomendado = siguiente más votado; se puede elegir otro electo | Decisión del cliente (Q-L13 = sí) |
| Vacante: asume VP por defecto; se puede elegir otro electo; versiona composición | Arts. 99–102 (Q-L14) |
| Secreto si >100; v1 asume siempre >100 | Art. 37/58; Q-L04/Q-L05 diferidas a fase final |
| Espacios de propuesta (Art. 59) no se implementan en v1 | Q-L03 diferido |
| Boleta de Facultad usa columna Brigada | Art. 60 |
| Retención ≥1 año | Art. 66 |
| Reclamaciones: registro + plazos en v1; resolución completa v1.1 | Arts. 103–108 |
| Stack: Next.js 15 + React 19 + PG 17 + Prisma + Auth.js + Tailwind 4 + shadcn/ui | Decisión de arquitectura |
| Plantilla de importación basada en XLS real (`Carnet de Identidad`, `Nombre`, `1er. Apellido`, `2do. Apellido`, `Brigada`) | Decisión del cliente |
| Biografía `.md` por candidato, legible desde boleta | Decisión del cliente |
| Módulo «Reglamento» con texto literal, fuente y página | Decisión del cliente |

## 5. Restricciones y no-negociables

- Solo documentación (Markdown, español); no modificar código fuente (no existe aún). El código legacy en `Proyecto FEU/` es referencia y **no se modifica ni se porta**.
- No diseñar pantallas ni mockups.
- Sin voto en blanco; sin espacios de propuesta en v1; sin voto público en v1.
- Sin código/UI para otros niveles (sede, filial, residencia, centro, nacional).
- `N` no se configura por separado; se deriva de la lista.
- Ninguna pantalla/servicio puede contener `9`, `11`, `85` o `5` hardcodeados.
- La tabla `ballots` no tiene `membership_id` ni `voter_id`.
- El orden alfabético solo define la boleta, no el resultado.
- Prohibido desempatar por orden alfabético/posición/id.
- ADMIN inicia y cambia estados decisivos; COMMISSION cambia estados intermedios; VOTER solo vota en `ABIERTA`.

## 6. Glosario de términos/entidades clave

| Término | Significado |
|---|---|
| Estructura | Brigada, Facultad, Sede, Filial, Residencia, Centro o Nacional |
| Membresía | Persona habilitada para votar en una estructura |
| ProcesoElectoral | Proceso concreto de una estructura y un año |
| Candidatura | Lista cargada de candidatos |
| Candidato / CandidatoProceso | Dato maestro e instantánea en el proceso |
| Boleta | Voto emitido, sin vínculo al votante |
| SeleccionBoleta | Marca de miembro/presidente |
| Participacion | Prueba de que un miembro votó (única por proceso) |
| Resultado | Escrutinio inmutable y hasheado |
| ComisionElectoral | Comisión con composición, actas y funciones |
| DesignacionVicepresidente | VP designado después del cierre |
| EventoVacante | Dimisión/separación del presidente |
| Importacion / Plantilla | Carga CSV/XLSX y plantilla oficial |
| ReglamentoArticulo | Texto literal de un artículo con fuente |
| EventoAuditoria | Traza append-only |
| N | Puestos del Secretariado (`candidatos − 2`) |
| ANULADA_POR_ELECTOR | Boleta inválida confirmada por el elector |
| RUNOFF | Proceso hijo de segunda vuelta |

## 7. Artefactos y recursos disponibles

| Artefacto | Ubicación | Descripción |
|---|---|---|
| Marco legal | `docs/migracion-web/08-marco-legal-feu.md` | Análisis legal, reglas RGF, modelo de dominio, escalabilidad |
| Plan de implementación | `docs/migracion-web/09-plan-implementacion-facultad.md` | Plan vigente, estados, fases, pruebas, backlog, checklist |
| Acta F0 y trazabilidad | `docs/migracion-web/10-acta-f0-y-matriz-trazabilidad.md` | Decisiones cerradas, alcance congelado, matriz RGF → prueba (34 reglas) |
| Decisiones técnicas F1 | `docs/migracion-web/11-decisiones-tecnicas-f1.md` | Estructura de carpetas, dominio puro, enums, restricciones de base de datos, módulo Reglamento |
| Código de la aplicación | raíz del repositorio | Next.js en la raíz: `app/`, `src/domain/`, `src/server/`, `prisma/`, `tests/`, `scripts/` |
| Handout | `docs/handout-continuidad.md` | Este documento |
| Fuente normativa | `ABC-FEU-2019.pdf` | Reglamento FEU (114 páginas) |
| Texto extraído | `C:\Users\Adrián Rodríguez\AppData\Local\Temp\opencode\abc-feu-2019.txt` | Texto temporal para citas |
| Demo legacy (Java/Swing) | `Proyecto FEU/` | Código del escritorio. **Referencia histórica, no a portar.** Aporta los fixtures: 11 candidatos (`src/auxiliar/DatosTemporales.java`), 5 votantes, 1 admin, brigadas `11`, `12`, `22`, `32`, `41` |
| Extracto legal incompleto | `Proyecto FEU/Información.txt` | Solo Arts. 36–42 y 73–77; sustituido por el PDF |
| Padrón real (XLS) | `! Listado Informática 2026.xls` | Hoja `Estudiantes1`, 29 filas, brigada `41`; columnas base de la plantilla |

## 8. Preguntas abiertas y riesgos

### Diferidas a fase final (no bloquean v1)

| ID | Pregunta | Decisión v1 |
|---|---|---|
| Q-L03 | Espacios de propuesta | No se implementan; boleta no los muestra ni captura |
| Q-L04 | Membresía ≤100 y Art. 58 | Se asume >100; voto siempre secreto |
| Q-L05 | Facultad ≤100, ¿solo presidente? | No aplica mientras >100 |

### Operativas con valor por defecto

| ID | Pregunta | Bloquea | Valor por defecto |
|---|---|---|---|
| Q-L07 | Reclamaciones completas | F6 | Registro y plazo en v1; resolución v1.1 |
| Q-L08 | Retención | F1, F7 | 1 año mínimo |
| Q-L09 | Observadores | F2, F6 | Acreditados por la Comisión |
| Q-L11 | Segunda vuelta | F5 | Toda la membresía, entre empatados |
| Q-L12 | Publicación antes de proclamar | F6 | No; solo después |
| Q-L15 | Plantilla de importación | F2 | CSV + XLSX, ejemplo, validación |
| Q-L16 | Biografía `.md` | F4 | Markdown sanitizado, versión con hash |
| Q-L17 | Módulo Reglamento | F1 | Texto literal, fuente y página |

### Riesgos principales

| ID | Riesgo | Mitigación |
|---|---|---|
| R-01 | Interpretación legal errónea | Acta F0, revisión Comisión, trazabilidad legal |
| R-02 | Conteo/empate/segunda vuelta incorrectos | Propiedades, verificador independiente, escenarios dorados |
| R-03 | VP o sucesión mal registrada | Flujo post-electoral, acta, versiones de composición |

## 9. Lista de tareas por fases para despliegue productivo

> **Instrucción de uso:** Ir marcando (`[x]`) o eliminando los elementos a medida que se completen en el desarrollo para mantener el estado exacto del despliegue.

### Fases Completadas (F0 a F5)
- [x] **F0 · Cierre de decisiones y marco legal:** Acta de decisiones, alcance v1 exclusivo de Facultad, matriz de 34 reglas RGF (`10-acta-f0-y-matriz-trazabilidad.md`).
- [x] **F1 · Scaffold y dominio puro:** Next.js 15.5 + React 19 + Tailwind 4, esquema Prisma, dominio base (`seats.ts`, `ballot.ts`, `quorum.ts`, `tally.ts`, `states.ts`).
- [x] **F2 · Membresía, validaciones y Comisión:** Validador de Carnet de Identidad (`ci.ts`), plantilla e importación CSV con reglas de brigadas 3-45 (`padron.ts`), constitución de la Comisión Electoral (`commission.ts`), permisos y un voto por elector (`permissions.ts`), y autenticación/activación/MFA TOTP (`auth.ts`).
- [x] **F3 · Candidaturas y configuración dinámica:** Orden alfabético determinista (`candidates.ts`), biografía Markdown sanitizada con SHA-256 (`INV-17`), snapshot inmutable, configuración dinámica sin constantes (`config.ts`), e importación incremental con merge por CI deduplicado (`importPadronIncremental`).
- [x] **F4 · Boleta electoral y emisión:** Boleta oficial de 4 columnas (desktop) y tarjetas táctiles adaptables (Android), validación reactiva sin citas legales al elector, botón de copiado de comprobante (`📋 Copiar Comprobante`), urna ciega desacoplada (`INV-04`), anulación voluntaria en 2 pasos y verificación de boletas inmutables por comprobante (`ReceiptVerifierModal`).
- [x] **F5 · Escrutinio y proclamación:** Motor de escrutinio determinista e idempotente (`tally.ts`), cálculo de participación requerida (>85 %, Art. 38), detección de empates en corte o presidencia con llamado a segunda vuelta (Art. 40), designación de Vicepresidente por la Comisión (Art. 67), acta formal imprimible y exportación a CSV.

---

### FASE 6 · Módulo Reglamento, Vacantes, Reclamaciones y Exportaciones
- [x] **6.1 Módulo interactivo «Reglamento» en UI:**
  - Pestaña de navegación para consultar los artículos aplicables del ABC de la FEU (2019).
  - Buscador reactivo por palabra clave y filtro por número de artículo.
  - Citas textuales literales con indicación de página del documento oficial (conectado a `/api/reglamento`).
- [x] **6.2 Flujo post-electoral de Vacantes y Sucesión Presidencial (Arts. 99–102):**
  - Panel administrativo para registrar la dimisión o separación del presidente.
  - Sucesión automática por defecto del Vicepresidente, con opción para la Comisión de designar a otro miembro electo.
  - Generación de nueva versión inmutable de la composición del Secretariado (`src/domain/vacancies.ts` y `/api/comision/vacante`).
- [ ] ~~**6.3 Registro y Seguimiento de Reclamaciones e Impugnaciones (Arts. 103–106):**~~ *(Excluido a solicitud del usuario)*
- [x] **6.4 Exportación de Acta Oficial a PDF descargable:**
  - Generación de archivo PDF oficial descargable con membrete institucional, firmas de la Comisión y hash SHA-256 del resultado electoral mediante `jspdf` (`src/utils/pdfActa.ts`).
- [x] **6.5 Panel de Observadores Electorales (`OBSERVER`):**
  - Vista restringida/pública de sólo lectura con métricas de afluencia en tiempo real, trazabilidad de apertura/cierre y verificación de urna ciega sin acceso a datos privados de los votantes (`ObserverPanel.tsx`).

---

### FASE 7 · Persistencia Relacional (Prisma + PostgreSQL), MFA Operativo y Seguridad
- [x] **7.1 Persistencia relacional en base de datos PostgreSQL:**
  - Persistencia relacional ACID completa en **PostgreSQL 16** mediante **Prisma ORM 6.19.3** (`postgresql://postgres:kote020919@localhost:5432/feu?schema=public`).
  - Sincronización reactiva con `election-store.ts` y rutas de autenticación (`/api/auth/login`, `/api/auth/activar`, `/api/auth/totp/current`, `/api/voto/emitir`, `/api/escrutinio`).
  - Separación estricta en tablas: `participations` (registro de emisión sin boleta ni comprobante) y `ballots` (boletas inmutables con `receipt_hash` sin voter_id ni membership_id) para garantizar la Urna Ciega (`INV-04`).
  - Serialización canónica de JSON (RFC 8785) en la cadena de auditoría WORM para blindar la verificación matemática SHA-256 frente a reorganizaciones de claves JSON del motor PostgreSQL.
  - Blindaje WORM con funciones y triggers nativos PL/pgSQL (`fn_prevent_ballot_mutation`, `fn_prevent_audit_mutation`, `trg_prevent_ballot_update`, `trg_prevent_ballot_delete`, `trg_prevent_audit_update`, `trg_prevent_audit_delete`) que impiden a nivel de motor cualquier modificación o borrado.
  - Verificación E2E completa automatizada en `scripts/test_phase7_flow.py` ejecutándose contra PostgreSQL.
- [x] **7.2 Sistema de autenticación de electores y MFA TOTP activo (Modelo de Producción):**
  - Modal formal e interactivo de autenticación profesional (`AuthModal.tsx`), eliminando pestañas demo y botones de acceso simulado.
  - Credenciales provisionales oficiales: **Usuario = Nombre registrado** (búsqueda flexible por nombre completo o apellidos) y **Contraseña = Carnet de Identidad** (11 dígitos).
  - Eliminación estricta y total de solicitudes de correo electrónico en interfaz, validación y activación.
  - Los 23 estudiantes registrados en el Listado de Electores de la Facultad cuentan con cuenta de usuario activa con su CI como contraseña inicial.
  - Segundo factor de autenticación TOTP obligatorio para roles oficiales (`ADMIN` y `COMMISSION`), con soporte de código activo.
  - Blindaje en la emisión del voto (`VoterBallot.tsx`): eliminación definitiva del `<select id="electorSelect">`. La boleta queda bloqueada a la identidad del usuario autenticado; los visitantes no autenticados disponen de una pantalla institucional para iniciar sesión o auditar boletas por comprobante.
  - Control de acceso por roles (`ADMIN`, `COMMISSION`, `VOTER`, `OBSERVER`) aplicado a nivel de navegación y componentes.
  - Erradicación total de hashes visuales crudos en la interfaz de usuario.
- [x] **7.3 Mecanismo WORM y retención criptográfica (≥1 año, Art. 66):**
  - Triggers SQL a nivel de motor de base de datos (`prevent_ballot_update`, `prevent_ballot_delete`, `prevent_audit_update`, `prevent_audit_delete`) que abortan cualquier intento de mutación o borrado de boletas o auditoría.
  - Cadena inmutable SHA-256 de auditoría (hash-chain append-only) con verificación de integridad matemática vía `/api/auditoria`.
- [x] **7.4 Rate Limiting y endurecimiento:**
  - Limitador de tasa con ventana deslizante (`rate-limiter.ts`) aplicado a `/api/voto/emitir`, `/api/auth/login` y `/api/auth/activar` retornando HTTP 429 con cabecera `Retry-After`.

---

### FASE 8 · Pruebas de Carga, Simulacro y Puesta a Punto para Despliegue
- [ ] **8.1 Suite de pruebas de carga y concurrencia:**
  - Script automatizado de estrés para simular 300 electores concurrentes y 2 000 boletas en ráfaga.
  - Verificación de SLOs: tiempo de emisión de boleta p95 < 800 ms, escrutinio < 10 s.
- [ ] **8.2 Contenedor Docker y Runbook Operativo de Despliegue:**
  - Creación de `Dockerfile` multi-stage optimizado para Next.js 15 y `docker-compose.yml` (App + PostgreSQL).
  - Runbook de contingencia con procedimientos paso a paso para el día de la elección (apertura manual de urnas, cierre anticipado, respaldo en caliente y restauración ante cortes eléctricos o caída de red).
- [ ] **8.3 Simulacro general y aceptación UAT:**
  - Ensayo integral con la Comisión Electoral utilizando datos de prueba antes de importar el listado real de la facultad.
  - Verificación de firmas y exportación del acta de simulacro sin discrepancias.

## 10. Instrucciones de estilo y formato para la siguiente IA

- Idioma: español.
- Formato: Markdown, viñetas y tablas cuando ayuden.
- No inventar datos; usar `[VACÍO]` o `[SUPUESTO: ...]` si falta información.
- Distinguir hechos de inferencias.
- No diseñar pantallas ni mockups; no modificar código fuente (no existe aún).
- Mantener consistencia con `08` y `09`; no hardcodear constantes (`9`, `11`, `5`, `85`).
- Validar tablas (columnas consistentes) y bloques Mermaid (cerrados).
- UTF-8 correcto; evitar caracteres de reemplazo.

## 11. PROMPT PARA LA SIGUIENTE IA

```
Continúa el proyecto de sistema web para elegir el Secretariado de la Facultad de Ingeniería Informática (FEU). Trabaja como desarrollador full-stack y especialista en continuidad de contexto. Tu fuente de verdad son los documentos docs/migracion-web/08-marco-legal-feu.md (marco legal y RGF), docs/migracion-web/09-plan-implementacion-facultad.md (plan vigente) y docs/migracion-web/10-acta-f0-y-matriz-trazabilidad.md (acta F0 y matriz de trazabilidad), más el PDF ABC-FEU-2019.pdf.

Contexto clave:
- Alcance v1: solo Facultad. Modelo multi-nivel configurable, pero otros niveles solo documentados (sin código ni UI).
- Regla central: N = cantidad de candidatos − 2 (demo: 11 → 9). Mínimo 5 candidatos (N ≥ 3).
- Boleta: hasta N miembros + 1 presidente. Sin voto en blanco; 0 marcas es inválida y puede confirmarse como anulada en dos pasos.
- Participación = válidas + anuladas; solo las válidas suman votos; quien no vota no suma.
- Quórum >85 %. Empate por votos de presidente; si persiste, segunda vuelta como proceso hijo.
- Modo secreto (v1 asume >100 miembros). Modo público y Art. 58 diferidos a fase final.
- VP se designa después del cierre, entre los N electos (recomendación + opción de otro electo). Vacante: asume VP por defecto, opción de otro electo, versión de composición.
- Configuración inicial: asistente con cantidad de candidatos, ventana de votación (cierre anticipado permitido) y reglas.
- Datos: formulario o importación CSV/XLSX desde plantilla descargable; brigadas creadas antes de importar; validación previa.
- Candidatos: se escogen de datos importados o creados; biografía .md legible desde la boleta.
- Módulo Reglamento: texto literal de artículos aplicables con fuente y página.
- Stack: Next.js 15 + React 19 + PostgreSQL 17 + Prisma + Auth.js + Tailwind 4 + shadcn/ui.
- No hardcodear 9, 11, 5 ni 85. balls no tiene membership_id ni voter_id.
- Roles: ADMIN (inicio y estados decisivos), COMMISSION (estados intermedios), VOTER (solo vota en ABIERTA), OBSERVER (solo ve).
- Fases: F0 a F8. F0 está cerrada técnicamente; el punto de arranque es F1.
- Matriz de trazabilidad: cada RGF (01–34) tiene prueba asignada (EF-xx, INV-xx, manual o diferida).

Tarea inmediata: [indica aquí la tarea concreta, por ejemplo: "Ejecutar F1: scaffold Next.js, modelo de datos, brigadas y seed" o "Ejecutar F2: identidad, importación con plantilla y Comisión"].

Formato de respuesta: Markdown en español, conciso, con viñetas y tablas. Si creas o modificas documentación, valida tablas y bloques Mermaid.

Criterios de aceptación:
1. Consistencia con los documentos vigentes (08 y 09).
2. Sin invención de datos; marcar [VACÍO] o [SUPUESTO: ...] si falta información.
3. Tablas con columnas consistentes; bloques Mermaid cerrados.
4. UTF-8 correcto.
5. No hardcodear constantes electorales.
6. Respetar la asignación de roles y estados (ADMIN decisivos, COMMISSION intermedios, VOTER solo vota).
```
