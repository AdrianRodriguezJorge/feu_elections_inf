# HANDOUT DE CONTINUIDAD — Elecciones FEU, Facultad de Ingeniería Informática

## 1. Resumen ejecutivo

Sistema web para elegir el **Secretariado de la Facultad de Ingeniería Informática** (FEU, Cuba). Alcance v1: solo Facultad. El modelo es multi-nivel configurable, pero **sede, filial, residencia, centro y nacional no se implementan** (solo están modelados en datos y documentados como trabajo futuro). No hay código aún; solo documentación vigente en `docs/migracion-web/08-marco-legal-feu.md` y `docs/migracion-web/09-plan-implementacion-facultad.md`. La siguiente IA debe continuar con F0 (cierre de decisiones) y luego F1 (scaffold).

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
- Vigentes: `08` (marco legal y reglas generalizadas), `09` (plan de implementación) y `10` (acta F0 + matriz de trazabilidad).
- No hay código fuente todavía; solo documentación.
- **F0 cerrada técnicamente** (acta, decisiones y matriz RGF → prueba en `10`). Pendiente solo la firma, que no bloquea.
- Plan: 32 pw en 8 fases (F0–F8), 20–24 semanas con 2 dev + 0,5 QA + 0,25 diseño + 0,2 DevOps.
- **Punto de arranque: F1** (3 pw) — scaffold, modelo de datos, brigadas, auditoría, seed y módulo Reglamento.

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

## 9. Próximos pasos priorizados

1. **F1 — Plataforma y modelo (3 pw):** scaffold Next.js 15 + TypeScript estricto, `structures`, `memberships`, `electoral_processes`, CRUD de brigadas, auditoría append-only, seed de la Facultad (11 candidatos → 9 puestos) y seed del módulo Reglamento. Entregable: staging con migraciones y proceso en `BORRADOR`.
2. **F2 — Identidad, padrón, roles y Comisión (4 pw):** login, MFA para ADMIN/COMMISSION, importación CSV/XLSX con plantilla descargable y validación por fila, roles `ADMIN`/`COMMISSION`/`VOTER`/`OBSERVER`, Comisión constituida con acta.
3. **F3 — Candidatos y configuración (3 pw):** asistente inicial (cantidad de candidatos, ventana, cierre anticipado), candidatos desde datos importados, biografía `.md`, derivación de `N`, snapshot inmutable.
4. **F4 — Boleta y emisión (5 pw):** boleta de 4 columnas y `N+2` filas, validación inline, anulación en dos pasos, biografía legible, comprobante verificable.
5. **F5 — Escrutinio, empates, VP y proclamación (6 pw):** motor idempotente, quórum, segunda vuelta, designación de VP, vacantes, acta.
6. **F6–F8:** reportes, seguridad, carga, piloto y corte.

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
Continúa el proyecto de sistema web para elegir el Secretariado de la Facultad de Ingeniería Informática (FEU, Cuba). Trabaja como desarrollador full-stack y especialista en continuidad de contexto. Tu fuente de verdad son los documentos docs/migracion-web/08-marco-legal-feu.md (marco legal y RGF), docs/migracion-web/09-plan-implementacion-facultad.md (plan vigente) y docs/migracion-web/10-acta-f0-y-matriz-trazabilidad.md (acta F0 y matriz de trazabilidad), más el PDF ABC-FEU-2019.pdf.

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
