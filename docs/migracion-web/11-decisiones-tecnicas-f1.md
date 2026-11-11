# 11 - Decisiones técnicas de F1 (plataforma y modelo de organización)

> **Documento de implementación.** Registra las decisiones técnicas tomadas al construir la base del sistema: dónde vive el código, cómo se nombran las cosas, qué garantiza la base de datos y qué queda para fases siguientes.
>
> Documentos relacionados: [`08-marco-legal-feu.md`](08-marco-legal-feu.md) · [`09-plan-implementacion-facultad.md`](09-plan-implementacion-facultad.md) · [`10-acta-f0-y-matriz-trazabilidad.md`](10-acta-f0-y-matriz-trazabilidad.md)

---

## 1. Dónde vive el proyecto

| Ruta | Contenido |
|---|---|
| `C:\Users\Adrián Rodríguez\Videos\feu_elections_inf` | **Raíz del repositorio.** Aquí va la aplicación Next.js (`app/`, `src/`, `prisma/`, `package.json`). |
| `docs/migracion-web/` | Especificación: `08`, `09`, `10`, `11`. |
| `docs/handout-continuidad.md` | Handout de continuidad con prompt para otra IA. |
| `scripts/` | Utilidades de soporte (`extract-regulation.mjs`). |
| `Proyecto FEU/` | Demo Swing legacy. **Referencia histórica**: no se modifica ni se porta. |
| `ABC-FEU-2019.pdf` | Fuente normativa. |
| `! Listado Informática 2026.xls` | Padrón real que originó la plantilla de importación. |

> **Decisión:** la aplicación va en la raíz del repositorio y no en `apps/web` ni en un monorepo. Motivo: un único despliegue, un único `package.json` y ningún espacio de trabajo que instalar. Next.js espera `app/` en la raíz, y los directorios ajenos (`docs/`, `Proyecto FEU/`) no interfieren.

---

## 2. Estructura de carpetas

```
app/                          Rutas de Next.js (App Router)
  layout.tsx                  Layout raíz, lang="es"
  page.tsx                    Portada mínima de F1
  globals.css                 Tailwind 4 + tokens OKLCH verde/amarillo
src/
  domain/                     DOMINIO PURO. Sin Prisma, sin Next, sin I/O.
    types.ts                  Tipos compartidos (ProcessStatus, UserRole, ProcessRules…)
    seats.ts                  DeriveSeats, canOpenProcess, buildProcessRules
    ballot.ts                 validateBallot, readMarks
    quorum.ts                 computeQuorum, quorumExceptionApplies
    tally.ts                  tally, recommendVicePresident, recommendSuccessor
    states.ts                 TRANSITIONS, canTransition, availableTransitions
    index.ts                  Barrel
  server/                     Infraestructura (sí toca base de datos)
    db.ts                     Cliente Prisma singleton
    audit.ts                  recordAudit, hashPayload
prisma/
  schema.prisma               Modelo de datos completo
  seed.ts                     Seed de desarrollo
  regulation.seed.json        Texto literal de los artículos, con página
scripts/
  extract-regulation.mjs      Extrae el Reglamento del texto del PDF
tests/                        Pruebas unitarias y de propiedad (vitest)
```

**Regla de dependencia:** `src/domain` no importa nada de `src/server` ni de `prisma`. El escrutinio y la validación son funciones puras y por eso se prueban sin base de datos. Es la razón de ser de `INV-08` (idempotencia).

---

## 3. Dominio puro: qué decide y por qué

| Módulo | Decide | Regla legal | Pruebas |
|---|---|---|---|
| `seats.ts` | `N = candidatos − 2`; mínimo 5 candidatos (3 puestos) | RGF-08, INV-13 | `tests/seats.test.ts` |
| `ballot.ts` | Valida marcas: `1..N` miembros, 1 presidente ∈ marcados, sin repetidos ni ajenos | RGF-11, Q-L02 | `tests/ballot.test.ts` |
| `quorum.ts` | Participación = válidas + anuladas; quórum > 85 % estricto | RGF-04, INV-16 | `tests/quorum.test.ts` |
| `tally.ts` | Top `N`, presidente entre electos, detección de empates, recomendación de VP y sucesor | RGF-12/13/14/18/31 | `tests/tally.test.ts` |
| `states.ts` | Transiciones permitidas y rol autorizado en cada una | §3.1 de `09` | `tests/states.test.ts` |

### 3.1 Decisiones de diseño del escrutinio

1. **El empate no se resuelve en el código.** `tally` devuelve `tie` con el tipo (`CUT` o `PRESIDENT`) y los implicados. Resolverlo por orden alfabético, por posición o por `id` está **prohibido** por el Art. 40. La balotaje se modela como proceso hijo.
2. **Desempate técnico solo para presentación.** El orden final usa `votos_miembro` y luego `votos_presidente`, y solo como último recurso la posición de boleta. Esa última clave **no decide el corte**: si hay empate real, se devuelve el empate.
3. **`recommendVicePresident` recomienda, no impone.** Devuelve el electo con más votos de miembro que no sea presidente. La Comisión puede elegir a otro (Q-L13). El motivo del cambio se guarda en `reason`.
4. **`recommendSuccessor` sigue la cascada de Q-L14.** Si hay vicepresidente vigente, lo propone; si no, el siguiente electo con más votos. En ambos casos la Comisión puede elegir a otro electo.
5. **Las boletas anuladas no entran al escrutinio.** Se cuentan aparte en `computeQuorum`.

### 3.2 Reglas de la boleta que quedaron fijadas

| Código de error | Significado |
|---|---|
| `MARCA_MIEMBRO_CERO` | 0 marcas: no hay voto en blanco. |
| `MARCA_MIEMBRO_EXCESO` | Más de `N` marcas de miembro. |
| `MARCA_PRESIDENTE_CERO` | No se marcó presidente. |
| `MARCA_PRESIDENTE_MULTIPLE` | Se marcaron 2 o más presidentes. |
| `PRESIDENTE_NO_MIEMBRO` | El presidente no está entre los marcados como miembro. |
| `CANDIDATO_REPETIDO` | El mismo candidato marcado dos veces. |
| `CANDIDATO_FUERA_DE_LISTA` | Marca de un candidato que no está en la lista cargada. |

Los códigos son estables: la UI los usa para resaltar los errores en línea (primer intento) y para el segundo intento, que se registra como `ANULADA_POR_ELECTOR`.

---

## 4. Modelo de datos

### 4.1 Convenciones

- Tablas en **snake_case** (`process_candidates`), campos en `snake_case` en Prisma y mapeados a `camelCase` en TypeScript mediante `@map`.
- Enums en `SCREAMING_SNAKE_CASE`.
- Todo lleva `createdAt` / `updatedAt`.
- Las claves foráneas usan `onDelete: Cascade` en las tablas que dependen del proceso (el proceso es la unidad de vida) y `SetNull` en `import_batches`, que debe sobrevivir al proceso.

### 4.2 Restricciones que la base de datos garantiza

| Restricción | Regla |
|---|---|
| `UNIQUE(process_id, membership_id)` en `participations` | Un voto por miembro (RGF-25, INV-06) |
| `UNIQUE(process_id, receipt_hash)` en `ballots` | Comprobante único por proceso |
| `UNIQUE(process_id, sequence)` en `ballots` | Secuencia monotónica para auditoría |
| `UNIQUE(ballot_id, process_candidate_id)` en `ballot_selections` | Una marca por candidato y boleta |
| `UNIQUE(process_id, ballot_position)` en `process_candidates` | Orden de boleta inmutable (RGF-09, INV-09) |
| `UNIQUE(process_id, candidate_id)` en `process_candidates` | Un candidato, una vez |
| `UNIQUE(structure_id, code)` en `brigades` | Código de brigada único; es la clave de la importación |
| `UNIQUE(document, part, article)` en `regulation_articles` | El PDF reinicia la numeración en cada parte |
| `ballots` **sin** `membership_id` ni `voter_id` | El voto es secreto (RGF-26, INV-07) |
| `CHECK (president => member)` en `ballot_selections` | El presidente debe estar marcado como miembro (Art. 61) |

> Los `CHECK` no se expresan en Prisma: se añaden en la migración SQL. La regla «presidente ⊆ miembro» **también** se valida en el dominio (`validateBallot`), porque la base de datos no es la única barrera.

### 4.3 Enums

| Enum | Valores | Nota |
|---|---|---|
| `StructureType` | `BRIGADA` `FACULTAD` `SEDE` `FILIAL` `RESIDENCIA` `CENTRO` `NACIONAL` | Solo `FACULTAD` se implementa en v1 |
| `ProcessStatus` | 15 estados | Los de `09` §3.1 |
| `UserRole` | `ADMIN` `COMMISSION` `VOTER` `OBSERVER` | `ADMIN` inicia y cambia estados decisivos; `COMMISSION` los intermedios |
| `BallotState` | `VALIDA` `ANULADA_POR_ELECTOR` | Solo `VALIDA` suma votos |
| `Office` | `PRESIDENTE` `VICEPRESIDENTE` `MIEMBRO` `NO_ELECTO` | Composición final |
| `MajorityRule` | `TOP_N` `TOP_N_OVER_50` `FIFTY_PLUS_ONE` | `TOP_N` en Facultad |
| `TieRule` | `PRESIDENT_VOTES_THEN_RUNOFF` | Art. 40 |
| `VacancyType` | `RENUNCIA` `SEPARACION` `INCAPACIDAD` `FALLECIMIENTO` | Arts. 99–102 |

### 4.4 Campos derivados, nunca editados

- `electoral_processes.seats` se calcula como `candidatesCount − 2`. No hay campo `seats` en la configuración del proceso; el dominio lo deriva de la lista.
- `process_candidates.member_votes` y `president_votes` son desnormalizaciones del escrutinio: se recalculan al contar y quedan selladas por el hash del resultado.
- `results.participation` se recalcula desde `validBallots + annulledBallots`.

### 4.5 Ciclo de vida de una composición

`results.composition` guarda la composición como `Json` versionada. Cada vacante genera una **nueva versión** (`vacancy_events.composition_version`) y **no muta** el resultado original (INV-15). El histórico completo queda en `vacancy_events` y `vice_president_designations`.

---

## 5. Módulo Reglamento: texto literal, no paráfrasis

### 5.1 Procedimiento

1. El PDF `ABC-FEU-2019.pdf` se extrae a texto plano (fuera del repositorio, es temporal).
2. `scripts/extract-regulation.mjs` recorre el texto, detecta los marcadores `===== PAGINA N =====` y las cabeceras `Artículo NN:`, y reconstruye el artículo uniendo sus líneas.
3. Detecta la **parte** del documento (`DECLARACION_FINAL`, `ESTATUTOS`, `REGLAMENTO`), porque los tres reinician la numeración.
4. Genera `prisma/regulation.seed.json` con `{parte, artículo, página, texto}`.

```bash
node scripts/extract-regulation.mjs "<ruta>\abc-feu-2019.txt" --part REGLAMENTO
npm run db:seed
```

### 5.2 Resultado actual

- **321 artículos** extraídos del Reglamento, con su página real.
- Ejemplo verificado (Art. 61, página 30):

  > En los votos para miembros, se podrá marcar hasta cuantos miembros deba tener la estructura, mientras que en los de presidente, se deberá marcar por un solo candidato, el cual debe ser uno de los que se marcó como miembro.

### 5.3 Reglas

- El texto **no se reescribe, no se resume y no se corrige**. Si hay un error de redacción en el original, se conserva.
- La numeración y los guiones del original se conservan; solo se colapsan los saltos de línea de la extracción.
- La identidad del documento fuente es su hash. Un cambio en el PDF se detecta comparando `sourceHash`.
- Las reglas del proceso enlazan al artículo que las origina; la UI permite buscar por número y por texto.

> **Llamada de atención:** la primera versión de la semilla usaba paráfrasis redactadas a mano. Se sustituyó por la extracción literal del PDF. **No se debe volver a escribir texto legal a mano en el código.**

---

## 6. Seed de desarrollo

| Elemento | Valor |
|---|---|
| Estructura | Facultad de Ingeniería Informática |
| Brigadas | `11`, `12`, `22`, `32`, `41` (códigos reales del demo legacy y del XLS) |
| Candidatos | 11 (del demo Swing legacy) → **9 puestos** |
| Padrón | 5 votantes ficticios + administrador |
| Comisión | Presidente + vicepresidente + 1 representante por brigada (Art. 47) |
| Proceso | `BORRADOR`, año 2026-2027, quórum 85 %, modo `SECRET` |
| Reglamento | 321 artículos con página |

---

## 7. Estado de cierre de F1

- [x] `npm install` completado y `package-lock.json` generado.
- [x] `prisma generate` ejecutado y cliente tipado.
- [x] Restricciones SQL corregidas en `prisma/checks.sql` (índice único parcial para presidente único por boleta).
- [x] `npm test` en verde (5 suites de pruebas, 45 tests pasando, incluye invariantes y desempate por votos de presidente).
- [x] `npm run typecheck` y `npm run lint` sin errores.
- [x] `npm run build` correcto (producción Next.js 15).
- [x] Endpoints de salud (`/api/health`) y de listado de artículos del Reglamento (`/api/reglamento`).
- [ ] Conexión de base de datos activa para `db:push` y `db:seed` (pendiente sincronizar credenciales / puerto con PostgreSQL local o Docker en F2).

---

## 8. Deuda técnica consciente

| Deuda | Por qué | Plan |
|---|---|---|
| Sin autenticación implementada | Requiere Auth.js + MFA y el modelo de roles ya está | F2 |
| Sin endpoints de negocio | F1 entrega el cimiento, no la API | F2–F5 |
| Sin UI de boleta | F1 entrega el cimiento | F3–F4 |
| `import_batches.process_id` es opcional | El padrón se importa antes de crear el proceso | F2 |
| Resultados sin versión | La versión llega con las vacantes de F5 | F5 |

---

**Siguiente fase:** F2 · Identidad, padrón, roles y Comisión (4 pw).
