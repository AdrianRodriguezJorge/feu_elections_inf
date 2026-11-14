# HANDOUT DE CONTINUIDAD — ELECCIONES FEU
## Facultad de Ingeniería Informática · Universidad Tecnológica de La Habana «José Antonio Echeverría» (CUJAE)

---

## 1. Resumen Ejecutivo y Propósito del Sistema

El presente proyecto es una plataforma web full-stack diseñada y construida para gestionar, ejecutar y auditar de forma digital y segura la elección del **Secretariado de la Facultad de Ingeniería Informática** de la Federación Estudiantil Universitaria (FEU) en la CUJAE, dando estricto cumplimiento al Reglamento General de la FEU de 2019 (*ABC de la FEU 2019*, `ABC-FEU-2019.pdf`).

### 1.1. Alcance Operativo v1
- **Ámbito estricto de aplicación:** Nivel **Facultad** (Facultad de Ingeniería Informática).
- **Extensibilidad multi-nivel:** El modelo de base de datos contempla estructuras jerárquicas superiores e inferiores (brigada, filial, residencia, sede, centro y nacional), pero su interfaz y flujos operativos **no se implementan en v1** y quedan documentados como ampliación futura.
- **Repositorio oficial:** [GitHub: AdrianRodriguezJorge/feu_elections_inf](https://github.com/AdrianRodriguezJorge/feu_elections_inf) (rama `main`).
- **Despliegue activo:** Vercel (conectado a base de datos PostgreSQL mediante Prisma ORM con triggers nativos WORM).
- **Pipeline CI/CD:** Sincronización automática de esquema con `prisma db push` y sembrado automático condicional desatendido (`node scripts/auto-migrate.mjs`).

---

## 2. Contexto del Negocio y Ciclo de Vida Electoral

El proceso electoral digitalizado reproduce con exactitud las etapas institucionales establecidas por el marco regulatorio de la FEU:

```mermaid
flowchart TD
    A["CONVOCADO<br/>(Proceso creado, candidaturas congeladas, comisión constituida)"] -->|"▶ Abrir Votación<br/>(Acción formal Comisión/Admin)"| B["ABIERTA<br/>(Electores emiten su voto secreto e individual)"]
    B -->|"⏹ Cerrar Votación<br/>(Conclusión de la jornada electoral)"| C["CERRADA<br/>(Urnas precintadas, sin recepción de nuevos votos)"]
    C -->|"⚙ Ejecutar Escrutinio<br/>(Cálculo determinista e idempotente)"| D{"Verificación de Participación<br/>(¿Turnout > 85 %? Art. 38)"}
    D -- "No (≤ 85 %)" --> E["NO VÁLIDA / REPETICIÓN<br/>(Proceso nulo por falta de participación)"|
    D -- "Sí (> 85 %)" --> F{"Verificación de Empates<br/>(¿Empate en corte o presidencia?)"}
    F -- "Persiste tras votos presidente" --> G["RUNOFF<br/>(Segunda Vuelta como proceso hijo, Art. 40)"]
    F -- "Sin empates en corte" --> H["ESCRUTADO / PROCLAMADO<br/>(N miembros electos y Presidente electo)"]
    H --> I["Designación de Vicepresidente<br/>(Por la Comisión entre los electos, Art. 67)"]
    I --> J["Emisión de Acta Oficial<br/>(PDF descargable con firmas y hash SHA-256)"]
    J --> K["Gestión Post-electoral de Vacantes<br/>(Sucesión inmutable en caso de renuncia, Arts. 99-102)"]
```

### 2.1. Estados del Proceso Electoral
1. **`CONVOCADO` (Estado Inicial Obligatorio):**
   - El proceso se crea con la membresía (listado de electores) y las candidaturas oficiales congeladas mediante un snapshot inmutable hasheado con SHA-256.
   - La Comisión Electoral queda formalmente constituida (Art. 47).
   - **Regla estricta:** La votación **nunca arranca abierta automáticamente**. Los electores autenticados ven una pantalla institucional de espera informando que el proceso está convocado y aún no ha comenzado la recepción de boletas.
2. **`ABIERTA`:**
   - Habilitada exclusivamente mediante la acción explícita `"▶ Abrir Votación"` ejecutada por un miembro de la Comisión Electoral o el Administrador.
   - Los electores registrados y habilitados acceden a su boleta oficial y emiten su voto.
3. **`CERRADA`:**
   - La Comisión Electoral cierra la recepción de boletas al cumplirse el horario de la votación o al registrarse la participación unánime de los electores.
   - Las urnas quedan bloqueadas; ningún elector puede emitir votos adicionales.
4. **`ESCRUTADO`:**
   - La Comisión ejecuta el algoritmo de cómputo oficial.
   - Se valida el quórum de participación estricto (`> 85 %`).
   - Se determina la lista de los $N$ miembros electos y se proclama al Presidente.
   - Se genera el hash criptográfico del escrutinio y se habilita la descarga del Acta Oficial en PDF.
5. **`RUNOFF` (Segunda Vuelta):**
   - Si persiste un empate en el puesto $N$ o en la presidencia tras aplicar la regla de desempate por votos directos de presidente, se convoca a una segunda vuelta con los candidatos empatados como proceso hijo vinculado.

---

## 3. Restricciones Establecidas por la Ley (Reglamento General FEU 2019)

El sistema implementa y valida de forma pura en código las normas del *ABC de la FEU (2019)*:

| Artículo | Regla Estatutaria | Implementación Técnica en la Plataforma |
|---|---|---|
| **Art. 38** | **Participación mínima requerida (> 85 %):** En nivel Facultad se exige la participación de más del 85 % de la membresía habilitada para validar la elección. *(Nota: El umbral del 80 % aplica exclusivamente a la Universidad, no a la Facultad).* | `src/domain/quorum.ts` y `tally.ts`. Si la participación no supera estrictamente el 85.0 %, el escrutinio arroja `quorumMet: false` y prohíbe la proclamación de resultados. |
| **Art. 40** | **Prohibición de desempates arbitrarios:** Queda terminantemente prohibido desempatar por orden alfabético, timestamp, ID o azar. | En caso de empate en el corte o en presidencia, se evalúan primero los votos a presidente recibidos. Si el empate continúa, el sistema genera el estado `RUNOFF` para celebrar segunda vuelta. |
| **Art. 47** | **Comisión Electoral Constituida:** La Comisión Electoral de la Facultad vela por la transparencia y legalidad del proceso. | Modelada en base de datos (`prisma.commission` y `CommissionSeat`), vinculando dinámicamente a sus miembros y firmantes oficiales en las actas. |
| **Art. 58** | **Voto Secreto:** El voto es directo y secreto cuando la estructura electoral cuenta con más de 100 electores. | Asumido por defecto en v1. Urna ciega desacoplada (`INV-04`). |
| **Art. 59** | **Cálculo dinámico de escaños ($N = C - 2$):** La cantidad de miembros a elegir en el Secretariado es exactamente la cantidad de candidatos menos dos. Mínimo 5 candidatos ($N \ge 3$). | `src/domain/seats.ts`. El sistema **nunca hardcodea $N$** ni constantes fijas (ni 9, ni 11, ni 5). $N$ se deriva dinámicamente de la lista de candidatos cargada. |
| **Art. 60** | **Estructura oficial de la boleta:** Boleta organizada en 4 columnas: Nombre, Brigada, Voto a Miembro y Voto a Presidente. | Componente `VoterBallot.tsx` con diseño responsive adaptativo en escritorio y tarjetas optimizadas para dispositivos móviles Android. |
| **Art. 61** | **Límite de votos a miembros:** Cada elector puede votar por **hasta $N$ candidatos** a miembros del Secretariado. No hay voto en blanco. | Validación reactiva en cliente y servidor (`src/domain/ballot.ts`). Si el elector marca 0 candidatos, no se emite voto en blanco; se ofrece el flujo de anulación voluntaria en 2 pasos (`ANULADA_POR_ELECTOR`). |
| **Art. 63** | **Elección del Presidente:** El voto a Presidente es obligatorio y debe seleccionarse **únicamente entre los candidatos que el elector marcó como miembros**. | El control radial de presidente está condicionado por checkbox de miembro. Si se desmarca a un miembro, se retira automáticamente la marca de presidencia. |
| **Art. 66** | **Inmutabilidad y retención legal ($\ge 1$ año):** Toda la documentación y boletas deben conservarse íntegras durante al menos un año. | Triggers nativos PL/pgSQL WORM (`fn_prevent_ballot_mutation`, `fn_prevent_audit_mutation`) que abortan cualquier `UPDATE` o `DELETE` sobre las tablas `ballots` y `audit_events`. |
| **Art. 67** | **Designación del Vicepresidente:** Se realiza con posterioridad al escrutinio por la Comisión Electoral de entre los $N$ miembros proclamados electos. | Endpoint `POST /api/comision/designar-vp` y panel administrativo. El sistema sugiere al siguiente candidato más votado, pero permite designar a cualquiera de los electos. |
| **Arts. 99–102** | **Sucesión y Vacantes Presidenciales:** Ante renuncia o separación del presidente, asume el vicepresidente o la comisión designa a otro miembro electo. | `src/domain/vacancies.ts` y `/api/comision/vacante`. Genera una nueva versión inmutable de la composición del Secretariado. |

### 3.1. Invariantes del Sistema (`INV-01` a `INV-18`)
- **`INV-01`:** Prohibido el voto en blanco. Cero marcas requiere confirmación explícita de anulación (`ANULADA_POR_ELECTOR`).
- **`INV-02`:** Las boletas anuladas cuentan para la participación requerida (`> 85 %`) y el total de boletas emitidas, pero aportan cero votos a los candidatos. Las abstenciones no cuentan para participación ni votos.
- **`INV-04` (Urna Ciega):** La tabla `participations` almacena exclusivamente que el usuario ha participado para evitar el doble voto. La tabla `ballots` contiene el voto emitido y su comprobante criptográfico (`receipt_hash`), sin almacenar jamás `user_id` ni `membership_id`.
- **`INV-07`:** Unicidad del voto garantizada por restricción `@@unique([processId, membershipId])`.
- **`INV-17`:** Inmutabilidad de la candidatura mediante hash SHA-256 sobre el snapshot normalizado en orden alfabético determinista.

---

## 4. Restricciones Establecidas por el Usuario (Directivas de Producto y UX)

Durante el diseño e implementación del sistema se establecieron pautas operativas y visuales no negociables:

1. **Autenticación sin correo electrónico:**
   - Los electores inician sesión únicamente con su **Nombre registrado** (búsqueda flexible por nombre o apellidos) y su **Carnet de Identidad** (11 dígitos numéricos) como contraseña provisional.
   - En ninguna pantalla de login, validación o activación se solicita, muestra ni exige correo electrónico.
2. **Segundo factor MFA TOTP obligatorio para autoridades:**
   - Las cuentas con rol `ADMIN` y `COMMISSION` tienen MFA TOTP obligatorio.
   - Para agilizar pruebas y auditorías, el sistema incluye el endpoint `/api/auth/totp/current` que entrega el código OTP activo bajo clave compartida en entornos de prueba.
3. **Inicio strictly en `CONVOCADO`:**
   - La base de datos y los seeds inicializan el proceso en estado `CONVOCADO`.
   - Queda prohibido que el sistema inicie en `ABIERTA` de forma desatendida.
4. **Prohibición de botones destructivos:**
   - Se eliminó completamente de la interfaz el botón *"Reiniciar Urnas"*. Una vez abierta la votación o emitidas las boletas, la base de datos y la UI no permiten reseteos casuales o borrado de votos.
5. **Autoridades Electorales Reales y Dinámicas:**
   - En el panel de administración, el visor de la Comisión Electoral (Art. 47) y las firmas del Acta Oficial en PDF, las autoridades mostradas son leídas dinámicamente desde la base de datos (`Liz` como Presidente de la Comisión y `Revisor` como 2do Miembro/Revisor), habiéndose erradicado cualquier nombre mockeado estático (`Elena`, `Frank`, `Giselle`).
6. **Higiene Institucional y Principio «No mostrar al usuario lo que no puede hacer»:**
   - **Cero emojis:** Todos los emojis visuales fueron erradicados y reemplazados por iconos formales SVG de la biblioteca `lucide-react`.
   - **Identidad cromática:** Paleta institucional basada en el color ámbar/dorado de la Facultad de Ingeniería Informática (`amber-100/80`, `border-amber-300`, `text-amber-900`) con contraste accesible WCAG AA, reservando el color rojo carmesí (`#8F1639`) exclusivamente para las siglas `FEU`.
   - **Footer en una sola línea:** Frase de créditos institucionales compacta con badge estilizado.
   - **Pantalla de login sin scroll:** Contenedor adaptado a `h-[100dvh]` que elimina el scroll vertical en navegadores de escritorio y móviles.
   - **Eliminación de leyendas redundantes:** Se retiró el texto explicativo redundante *"Contraseña provisional: Carnet de Identidad"* del formulario de login.
   - **Segregación estricta de vistas por rol:**
     - Visitante anónimo: formulario de login, visor del reglamento y modal de verificación criptográfica de comprobantes.
     - Votante (`VOTER`): boleta electoral (o pantalla de espera institucional si no está en `ABIERTA`) y reglamento.
     - Observador (`OBSERVER`): panel de afluencia en tiempo real, verificación de urna ciega y visor de auditoría.
     - Comisión / Administrador (`COMMISSION` / `ADMIN`): consola de apertura, cierre, escrutinio, designación de VP, vacantes y descarga del Acta Oficial.

---

## 5. Arquitectura Técnica y Estado del Desarrollo

### 5.1. Fases Completadas (F0 a F7)
- [x] **F0 · Cierre de decisiones y marco legal:** 34 reglas RGF analizadas, decisiones congeladas y matriz de trazabilidad legal.
- [x] **F1 · Scaffold y dominio puro:** Next.js 15.5, React 19, Tailwind CSS 4, dominio desacoplado de frameworks (`seats.ts`, `ballot.ts`, `quorum.ts`, `tally.ts`, `states.ts`).
- [x] **F2 · Membresía, validación CI y Comisión:** Validación matemática del Carnet de Identidad cubano (siglo XX y XXI, fecha real, dígito verificador, `ci.ts`), importación de listados (`padron.ts`), constitución de la comisión (`commission.ts`) y control de acceso (`permissions.ts`).
- [x] **F3 · Candidaturas y configuración dinámica:** Snapshot de candidaturas con SHA-256 (`candidates.ts`), biografías en Markdown sanitizadas, configuración general sin constantes hardcodeadas (`config.ts`).
- [x] **F4 · Boleta electoral y emisión:** Boleta oficial de 4 columnas, verificación de comprobante inmutable (`ReceiptVerifierModal`), urna ciega desacoplada (`INV-04`), anulación voluntaria en 2 pasos.
- [x] **F5 · Escrutinio y proclamación:** Algoritmo determinista de escrutinio, validación de participación requerida `> 85 %`, desempates, designación de VP post-cierre y exportación CSV.
- [x] **F6 · Módulo Reglamento, Vacantes, Observadores y PDF:**
  - Módulo interactivo de Reglamento con citas literales y número de página (`ReglamentoViewer.tsx`, `/api/reglamento`).
  - Panel de sucesión y vacantes presidenciales (`vacancies.ts`, `/api/comision/vacante`).
  - Generador de Acta Oficial descargable en PDF profesional usando `jspdf` con sellos de las autoridades y hash SHA-256 (`src/utils/pdfActa.ts`).
  - Panel de Observación electoral independiente (`ObserverPanel.tsx`).
- [x] **F7 · Persistencia Relacional PostgreSQL, Triggers WORM y Seguridad:**
  - Persistencia relacional ACID con Prisma ORM 6.19.3 sobre PostgreSQL 16.
  - Blindaje WORM con triggers nativos PL/pgSQL que abortan cualquier intento de modificación o borrado de boletas o eventos de auditoría.
  - Serialización canónica RFC 8785 en la cadena de bloques de auditoría para garantizar reproducibilidad matemática del hash SHA-256.
  - Rate limiting con ventana deslizante (`rate-limiter.ts`) protegiendo login y emisión de votos (HTTP 429).
  - Modal interactivo de autenticación (`AuthModal.tsx`) con soporte TOTP y credenciales por CI.

### 5.2. Pipeline de Despliegue en Vercel
- **Node.js:** Versión 26 (`"engines": { "node": "26.x" }` en `package.json`).
- **Comando de construcción:** `"build": "prisma generate && node scripts/auto-migrate.mjs && next build"`.
- **Comportamiento de auto-migración:** Sincroniza el esquema con la base de datos configurada en `DATABASE_URL`. Si detecta cero usuarios, ejecuta automáticamente el sembrado inicial (`prisma/seed.ts`).

---

## 6. Credenciales y Fixtures de Prueba del Sistema

Datos precargados por defecto en el sembrado (`prisma/seed.ts`) para auditorías, pruebas funcionales y desarrollo:

| Rol | Nombre de Usuario (Login) | Carnet de Identidad (Contraseña) | Brigada | MFA TOTP | Responsabilidad / Función |
|---|---|---|---|---|---|
| **`ADMIN`** | `Adrian` | `99091978927` | 41 | Requerido (`/api/auth/totp/current`) | Administrador general de la plataforma. Configuración y control global. |
| **`COMMISSION`** | `Liz` | `06091668099` | 41 | Requerido (`/api/auth/totp/current`) | **Presidente de la Comisión Electoral de Facultad.** Apertura, cierre y firma de actas. |
| **`COMMISSION`** | `Revisor` | `11111111111` | 41 | Requerido (`/api/auth/totp/current`) | **2do Miembro / Revisor de la Comisión.** Escrutinio, supervisión y firma de actas. |
| **`VOTER`** | `Carlos Mendoza Ramos` | `98021411223` | 41 | No | Elector base / Candidato CAN-01. |
| **`VOTER`** | `Beatriz Navarro Pino` | `98052122334` | 41 | No | Elector base / Candidata CAN-02. |
| **`VOTER`** | `Daniel Gómez Herrera` | `98081533445` | 22 | No | Elector base / Candidato CAN-03. |
| **`VOTER`** | `Elena Castillo Vargas` | `98110344556` | 22 | No | Elector base / Candidata CAN-04. |
| **`VOTER`** | `Fernando Iglesias Morales` | `99031255667` | 12 | No | Elector base / Candidato CAN-05. |
| **`VOTER`** | `Gabriela Ortega Serrano` | `99062566778` | 12 | No | Elector base / Candidata CAN-06. |
| **`VOTER`** | `Héctor Paredes Fuentes` | `99090877889` | 11 | No | Elector base / Candidato CAN-07. |
| **`VOTER`** | `Isabel Romero Cruz` | `99101988990` | 11 | No | Elector base / Candidata CAN-08. |
| **`VOTER`** | `Javier Soto Delgado` | `99120499001` | 32 | No | Elector base / Candidato CAN-09. |
| **`VOTER`** | `Katia Molina Reyes` | `97070710293` | 32 | No | Elector base / Candidata CAN-10. |

> [!NOTE]
> Para obtener el código TOTP activo de las cuentas oficiales durante pruebas manuales o inspección de QA, se puede consultar el endpoint interno `GET /api/auth/totp/current` o emplear la clave compartida de pruebas `0123456789abcdef0123456789abcdef01234567`.

---

## 7. Oportunidades de Mejora y Formalización Institucional Futura

Para elevar aún más el estándar de rigor, auditoría y formalidad institucional de cara a eventos electorales de alta envergadura, se recomiendan los siguientes puntos de evolución:

1. **Firma Digital Criptográfica de las Actas (Infraestructura de Clave Pública / PKI):**
   - Actualmente el PDF oficial incluye un hash SHA-256 del resultado y los sellos textuales de las autoridades.
   - *Mejora recomendada:* Incorporar pares de claves asimétricas (ECDSA o RSA) para los miembros de la Comisión Electoral, de modo que el acta PDF contenga una firma criptográfica verificable con clave pública que garantice el no repudio institucional.
2. **Respaldos Automatizados Snapshot en Puntos de Control Críticos:**
   - Implementar un mecanismo de respaldo automático en caliente de la base de datos PostgreSQL (`pg_dump` cifrado y enviado a almacenamiento frío) antes de eventos de estado irreversibles:
     - Justo antes de cambiar a `ABIERTA`.
     - Justo antes de cambiar a `CERRADA`.
     - Inmediatamente después de ejecutar el escrutinio.
3. **Página Pública Autónoma de Auditoría de la Cadena de Bloques:**
   - Crear una ruta `/auditoria-publica` sin autenticación requerida donde cualquier estudiante u observador pueda validar en su propio navegador la integridad matemática de toda la cadena de eventos de auditoría (RFC 8785 / SHA-256), verificando eslabón por eslabón sin ver datos privados.
4. **Comprobante de Voto Descargable en Ticket / Código QR:**
   - Actualmente el votante puede copiar su comprobante al portapapeles.
   - *Mejora recomendada:* Permitir la descarga de una imagen miniatura o PDF ligero tipo ticket electoral que incluya un código QR con el enlace directo al verificador de boletas: `/verificar?hash=<receipt_hash>`.
5. **Módulo Formal de Impugnaciones y Reclamaciones (Arts. 103–106):**
   - En v1 el registro de reclamaciones fue diferido a solicitud del usuario. Para versiones futuras, implementar una ventana reglamentaria (24 a 48 horas tras el escrutinio preliminar) donde los electores puedan presentar inconformidades con adjuntos antes del acta de cierre definitivo.
6. **Optimización de Carga Masiva para el Padrón Completo de Facultad:**
   - La Facultad de Ingeniería Informática cuenta con más de 1 500 estudiantes. Optimizar el parser de importación masiva (`importPadronIncremental`) mediante inserciones por lotes (`prisma.user.createMany`) para procesar el listado completo en menos de 2 segundos.

---

## 8. Tareas Pendientes (Roadmap · Fase 8)

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

---

## 9. Directrices para la Siguiente IA

- **Idioma de trabajo:** Español.
- **Reglas del entorno Windows:**
  - Siempre ejecutar comandos mediante `cmd.exe /c "<comando>"`.
  - Usar siempre rutas con barras diagonales `/` en lugar de barras invertidas `\`.
  - Encapsular la instrucción completa entre comillas.
  - En Python forzar salida sin buffering (`python -u`).
  - No ejecutar comandos interactivos o que esperen confirmación del usuario.
- **Integridad de las decisiones de diseño:**
  - No reintroducir emojis en la interfaz visual.
  - No reintroducir botones destructivos como "Reiniciar Urnas".
  - Mantener la paleta ámbar/oro de la Facultad y rojo carmesí para la FEU.
  - Mantener el inicio de procesos estrictamente en `CONVOCADO`.
  - Preservar la separación estricta de la Urna Ciega (`INV-04`).

---

## 10. PROMPT PARA LA SIGUIENTE IA

```
Continúa el proyecto del sistema web para la elección del Secretariado de la Facultad de Ingeniería Informática (FEU - CUJAE). Tu fuente de verdad operativa es este documento docs/handout-continuidad.md, junto con docs/migracion-web/08-marco-legal-feu.md, docs/migracion-web/09-plan-implementacion-facultad.md, docs/migracion-web/10-acta-f0-y-matriz-trazabilidad.md y el reglamento ABC-FEU-2019.pdf.

Estado actual del proyecto:
- Fases F0 a F7 completas y verificadas: 101 tests en verde, 0 errores de tipo, build Next.js 15.5 compilando limpio en Vercel con Node 26.
- Base de datos relacional PostgreSQL con Prisma ORM 6.19.3 y triggers nativos PL/pgSQL WORM.
- El repositorio está sincronizado en GitHub (rama main): https://github.com/AdrianRodriguezJorge/feu_elections_inf.

Reglas clave del negocio e invariantes:
- N = Candidatos − 2 (demo: 10 candidatos → 8 puestos; o 11 candidatos → 9 puestos). Mínimo 5 candidatos (N ≥ 3).
- Prohibición de voto en blanco: 0 marcas requiere confirmación explícita de anulación (ANULADA_POR_ELECTOR).
- Quórum estricto > 85 % de participación requerida sobre la membresía total habilitada (Art. 38).
- Urna ciega (INV-04): las boletas emitidas no contienen membershipId ni voterId.
- Desempates estrictos: por votos a presidente o llamado a Segunda Vuelta (RUNOFF). Prohibido desempatar por azar o alfabético (Art. 40).
- Proceso inicia en CONVOCADO; se abre manualmente por la Comisión/Admin. No hay botón de reiniciar urnas.
- Autoridades de la Comisión en BD: Liz (Presidente, CI: 06091668099) y Revisor (2do Miembro/Revisor, CI: 11111111111).
- Admin: Adrian (CI: 99091978927).
- Sin correos en la UI. Autenticación por Nombre y Carnet de Identidad. Cero emojis en la interfaz.

Tareas inmediatas del roadmap:
- Fase 8: Pruebas de estrés y concurrencia (8.1), contenedor Docker y Runbook de contingencias (8.2), y ensayo general UAT con la Comisión Electoral (8.3).
```
