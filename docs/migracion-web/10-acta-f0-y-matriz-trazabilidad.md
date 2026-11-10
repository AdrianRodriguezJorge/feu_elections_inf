# 10 - Acta F0 y matriz de trazabilidad legal

> **Documento de cierre de la fase F0.** Registra las decisiones de producto tomadas antes de implementar, la matriz que enlaza cada regla legal (`RGF` de `08`) con su prueba, y el alcance congelado de v1.
>
> **Documentos relacionados:** [`08-marco-legal-feu.md`](08-marco-legal-feu.md) (marco legal y reglas) · [`09-plan-implementacion-facultad.md`](09-plan-implementacion-facultad.md) (plan vigente) · [`../handout-continuidad.md`](../handout-continuidad.md) (continuidad).

---

## 1. Datos de la sesión

| Campo | Valor |
|---|---|
| Fecha | 2026-11-10 |
| Fase | F0 · Cierre de decisiones (2 pw) |
| Alcance de la sesión | Sistema de elección del Secretariado de la Facultad de Ingeniería Informática (v1) |
| Participantes | [VACÍO: nombre y cargo de cada participante] |
| Comisión Electoral | [VACÍO: nombres del presidente, vicepresidente y representantes] |
| Estado del acta | **[PENDIENTE DE FIRMA]** |
| Versión del plan al que aplica | `09-plan-implementacion-facultad.md` v1 |

### 1.1 Firmas

| Rol | Nombre | Firma | Fecha |
|---|---|---|---|
| Cliente / responsable | [VACÍO] | [VACÍO] | [VACÍO] |
| Presidente de la Comisión Electoral | [VACÍO] | [VACÍO] | [VACÍO] |
| Jefe de proyecto / técnico | [VACÍO] | [VACÍO] | [VACÍO] |

> **Nota de honestidad documental:** esta acta recoge las decisiones efectivamente tomadas durante el diseño. Los campos de firma quedan vacíos porque **no se han recogido firmas**. Hasta que se completen, el acta funciona como **registro de decisiones**, no como acta suscrita. Ningún bloque de F0 depende de la firma para empezar a codificar: la regla operativa es que toda pregunta sin valor por defecto usa el valor por defecto documentado en `09` §13.

---

## 2. Decisiones de producto

| ID | Decisión | Base legal | Estado |
|---|---|---|---|
| Q-L01 | Los puestos se derivan de la lista: `N = candidatos − 2`. La demo carga 11 candidatos → 9 puestos. | Art. 59 | **Resuelta** |
| Q-L02 | No existe voto en blanco. 0 marcas es inválida; el elector puede confirmarla como anulada en dos pasos. La anulada cuenta participación y quórum, no suma votos y consume el voto. Abstenerse es no votar. | Art. 61 + decisión de producto | **Resuelta** |
| Q-L03 | Los 2 espacios de propuesta del Art. 59 no se implementan en v1. | Art. 59 | **Diferida** a fase final (B-12) |
| Q-L04 | v1 asume que la Facultad siempre tiene >100 miembros: voto siempre secreto. | Art. 37 | **Diferida** a fase final (B-05) |
| Q-L05 | El caso del Art. 58 (≤100, solo presidente) no aplica mientras el padrón sea >100. | Art. 58 | **Diferida** a fase final (B-05) |
| Q-L06 | El vicepresidente no se elige en la boleta: se designa después del cierre, antes de los resultados finales. Sin plazo de 3 días. | Art. 67 (fondo, no plazo) | **Resuelta** |
| Q-L10 | La validación por brigada y la aprobación del Consejo se registran como referencia opcional; **no bloquean**. | Arts. 39, 42, 55–56 | **Resuelta** |
| Q-L13 | El vicepresidente es **siempre uno de los `N` electos**. Se recomienda el siguiente más votado; la Comisión puede elegir otro electo, con motivo y acta. | Art. 63 + decisión de producto | **Resuelta** |
| Q-L14 | Ante vacante presidencial, asume el vicepresidente por defecto; se puede elegir otro electo. Al ascender el VP, se recomienda el siguiente más voted para completar la composición. | Arts. 99–102 + decisión de producto | **Resuelta** |

### 2.1 Decisiones de producto sin número Q-L

| Tema | Decisión | Estado |
|---|---|---|
| Alcance | v1 solo Facultad. Sede, filial, residencia, centro y nacional: modelo sí, código y UI no. | **Congelada** |
| Candidatura | La lista de candidatos se carga directamente; sin requisitos bloqueantes. | **Congelada** |
| Quórum | >85 % de la membresía habilitada. Sin excepción del 80 % en Facultad. | **Congelada** |
| Empate | Miembro → votos de presidente; presidente → nueva votación. Prohibido desempatar por orden. | **Congelada** |
| Modo de roles | ADMIN inicia y cambia estados decisivos; COMMISSION cambia estados intermedios; VOTER solo vota en `ABIERTA`; OBSERVER solo observa. | **Congelada** |
| Datos | Alta por formulario o importación CSV/XLSX desde plantilla descargable. Las brigadas se crean **antes** de importar. | **Congelada** |
| Candidatos | Se escogen de personas ya importadas o creadas. Biografía `.md` opcional, legible desde la boleta. | **Congelada** |
| Reglamento | Módulo con texto literal de los artículos aplicables, con fuente (documento, artículo, página) y hash del PDF. | **Congelada** |
| Configuración inicial | Asistente con cantidad de candidatos, ventana de votación y reglas. El cierre puede adelantarse, nunca prorrogarse. | **Congelada** |
| Accesibilidad | Temas verde/amarillo, contraste AA, textos `es-CU`, fechas America/Havana. | **Congelada** |

### 2.2 Alcance congelado de v1

**Dentro de v1:** configuración inicial · organización y brigadas · padrón (formulario + CSV/XLSX con plantilla) · identidad y roles · Comisión Electoral · candidatos con biografía `.md` · Snapshot y derivación de `N` · boleta con validación inline y anulación en dos pasos · voto secreto único con comprobante · escrutinio, quórum, empates y segunda vuelta · proclamación y acta · designación de VP y vacantes · módulo Reglamento · reportes, observador y auditoría · reclamaciones (registro y plazos) · theming y accesibilidad.

**Fuera de v1 (documentado, sin código):** espacios de propuesta · voto público ≤100 y Art. 58 · niveles sede/filial/residencia/centro/nacional · resolución completa de reclamaciones · trámite formal de candidatura como condición bloqueante · promoción de vacantes por el Consejo · SSO, app móvil, blockchain · firma digital legal.

---

## 3. Matriz RGF → prueba

Cada regla legal debe tener al menos una prueba. Tipo: **E2E** = escenario dorado `EF-xx` de `09` §8.1 · **PROP** = prueba de propiedad sobre invariante `INV-xx` · **MAN** = verificación manual o de proceso · **DIF** = diferida a fase final.

| RGF | Regla (resumen) | Prueba(s) | Tipo | Fase | Estado |
|---|---|---|---|---|---|
| RGF-01 | Periodicidad por estructura | EF-01 (proceso con año lectivo) | E2E | F1 | Cubierta |
| RGF-02 | Convocatoria a toda la membresía | EF-22 (padrón completo importado) | E2E | F2 | Cubierta |
| RGF-03 | Voto secreto (v1 asume >100) | INV-07 (boleta sin identidad del votante) | PROP | F4 | Cubierta |
| RGF-04 | Quórum >85 % | EF-11 (84 %), EF-12 (86 %) | E2E | F5 | Cubierta |
| RGF-05 | Validación de brigada no bloquea | EF-04 | E2E | F3 | Cubierta |
| RGF-06 | Aprobación del Consejo no bloquea | EF-04 | E2E | F3 | Cubierta |
| RGF-07 | Registro de quórum/votos del Consejo | EF-04 | E2E | F3 | Cubierta |
| RGF-08 | `N = candidatos − 2`; sin espacios de propuesta | EF-01, EF-02, EF-03, INV-13 | E2E + PROP | F3 | Cubierta |
| RGF-09 | Orden alfabético por primer apellido | EF-16 | E2E | F3 | Cubierta |
| RGF-10 | Columnas por nivel (Brigada en Facultad) | EF-05 (columna Brigade en la boleta) | E2E | F4 | Cubierta |
| RGF-11 | Hasta `N` miembros + 1 presidente ∈ marcados | EF-05, EF-06, EF-07, EF-08, EF-09, INV-01, INV-02, INV-03 | E2E + PROP | F4 | Cubierta |
| RGF-12 | Electos = top `N` por votos de miembro | EF-13 | E2E | F5 | Cubierta |
| RGF-13 | Presidente = de los electos, más votos de presidente | EF-13 | E2E | F5 | Cubierta |
| RGF-14 | Empate → votos de presidente → nueva votación | EF-14, EF-15 | E2E | F5 | Cubierta |
| RGF-15 | Sin umbral de 50 % en Facultad | EF-13 (no bloquea por umbral) | E2E | F5 | Cubierta |
| RGF-16 | Conteo por la Comisión, observable | EF-11, EF-12 (con observador presente) | E2E | F6 | Cubierta |
| RGF-17 | Retención ≥1 año, boletas selladas, acta firmada | Checklist de entrega (acta y retención) | MAN | F6, F7 | Cubierta |
| RGF-18 | VP post-cierre, entre los electos, con recomendación | EF-19 | E2E | F5 | Cubierta |
| RGF-19 | Art. 58: Ancillary ≤100, solo presidente | B-05 (fase final) | DIF | Final | Diferida |
| RGF-20 | Reclamaciones: 5 días para presentar, 15 para resolver | Checklist (reclamación registrada con plazo) | E2E | F6 | Cubierta |
| RGF-21 | Separación/vacante: >85 % y 50 %+1 del Consejo | EF-20 (registro de vacante con acta) | E2E | F5 | Cubierta |
| RGF-22 | Comisión Electoral por nivel con roles y actas | Checklist (Comisión constituida con acta) | E2E | F2 | Cubierta |
| RGF-23 | Consejo de Facultad = Secretariado + presidentes de brigada | Seed de desarrollo | MAN | F1 | Cubierta |
| RGF-24 | Brigada de 3–45 miembros | EF-22 (validación de brigadas) | E2E | F2 | Cubierta |
| RGF-25 | Un voto por miembro, sin delegación | EF-10 (doble voto concurrente), INV-06 | E2E + PROP | F4 | Cubierta |
| RGF-26 | Boleta no vinculada al votante | INV-07 | PROP | F4 | Cubierta |
| RGF-27 | Publicación oficial tras la proclamación | EF-12, EF-19 | E2E | F6 | Cubierta |
| RGF-28 | Repetición por empate sin reabrir la original | EF-14, EF-15 (proceso hijo) | E2E | F5 | Cubierta |
| RGF-29 | Multi-nivel sin cambiar el dominio | Revisión de arquitectura (flags por nivel) | MAN | F1 | Cubierta (v1 solo Facultad) |
| RGF-30 | Acta y resultado inmutables y auditados | INV-08, INV-12 | PROP | F5 | Cubierta |
| RGF-31 | Vacante presidencial con sucesión | EF-20, EF-21 | E2E | F5 | Cubierta |
| RGF-32 | Composición final: presidente + VP + (`N`−2) miembros | EF-13, EF-19 | E2E | F5 | Cubierta |
| RGF-33 | Módulo Reglamento con texto literal y fuente | EF-25 | E2E | F1 | Cubierta |
| RGF-34 | Importación con plantilla y brigadas previas | EF-22, EF-23 | E2E | F2 | Cubierta |

**Cobertura:** 34 reglas · 33 cubiertas con prueba en v1 · 1 diferida a fase final (RGF-19, con respaldo en B-05).

**Escenarios dorados usados por la matriz:** EF-01, EF-02, EF-03, EF-04, EF-05, EF-06, EF-07, EF-08, EF-09, EF-10, EF-11, EF-12, EF-13, EF-14, EF-15, EF-16, EF-19, EF-20, EF-21, EF-22, EF-23, EF-25.
**Escenarios dorados nomapped a RGF (verifican requisitos de producto, no legales):** EF-17, EF-18 (anulación en dos pasos), EF-24 (biografía `.md`).

### 3.1 Invariantes cubiertos

| Invariante | Enunciado corto | RGF asociado |
|---|---|---|
| INV-01 | `1 ≤ marcas_miembro ≤ N` | RGF-11 |
| INV-02 | Exactamente 1 presidente | RGF-11 |
| INV-03 | Presidente ∈ miembros marcados | RGF-11 |
| INV-04 | `Σ votos_presidente = boletas válidas` | RGF-13 |
| INV-05 | `Σ votos_miembro ≤ N × boletas válidas` | RGF-11, RGF-12 |
| INV-06 | Un miembro, una participación | RGF-02, RGF-25 |
| INV-07 | La boleta no contiene identidad del votante | RGF-03, RGF-26 |
| INV-08 | Dos escrutinios dan el mismo hash | RGF-30 |
| INV-09 | El orden no cambia tras abrir | RGF-09 |
| INV-10 | Votos asignados por `process_candidate_id` | RGF-12 |
| INV-11 | Sin quórum, sin válidas o con empate no se proclama | RGF-04, RGF-14 |
| INV-12 | Acta y resultado inmutables | RGF-30 |
| INV-13 | `N = candidatos − 2` y `N ≥ 3`; boleta de `N+2` filas | RGF-08 |
| INV-14 | VP post-cierre, entre los electos, con motivo registrado | RGF-18 |
| INV-15 | Vacante versiona la composición sin mutar el resultado | RGF-31, RGF-32 |
| INV-16 | `participación = válidas + anuladas` | RGF-02, RGF-04 |
| INV-17 | Biografía `.md` sanitizada | Requisito de producto (EF-24) |
| INV-18 | Reglamento muestra texto literal con fuente y página | RGF-33 (EF-25) |

> Nota: la numeración vigente de los invariantes es la de `09` §5.6 (INV-01 … INV-18). La numeración puede haber sido reasignada en revisiones anteriores de este documento; la referencia vigente es siempre `09` §5.6.

---

## 4. Riesgos aceptados en F0

| ID | Riesgo | Aceptación | Condición de reevaluación |
|---|---|---|---|
| R-01 | Interpretación legal errónea | Se acepta con mitigación: acta, valores por defecto y revisión de la Comisión | Si la Comisión contradice Q-L02, Q-L13 o Q-L14 |
| R-08 | Aparición de un padrón ≤100 | Se acepta: v1 asume >100; el modo público es fase final | Si el padrón real de la Facultad es ≤100 |
| R-03 | Designación de VP o sucesión mal registrada | Se acepta con mitigación: flujo post-electoral, acta y versiones | Si el Consejo impone otra regla de sucesión |
| R-07 | Expansión a otros niveles | Se acepta: v1 solo Facultad, resto por flags | Si entra en alcance |

---

## 5. Compromisos de implementación derivados del acta

1. Ninguna pantalla ni servicio contiene `9`, `11`, `5` ni `85` hardcodeados.
2. `N` se calcula en el dominio a partir de `candidates.length`; no existe parámetro `seats` editable.
3. `ballots` no tiene `membership_id` ni `votante_id`.
4. La validación del servidor es la autoridad; la UI solo ayuda.
5. Toda transición de estado escribe un evento de auditoría y respeta la matriz de roles de `09` §3.1.
6. El escrutinio es una función pura, idempotente y transaccional; su resultado no depende del orden de las filas.
7. La plantilla de importación y el módulo Reglamento se generan desde una definición única, versionada y con hash.
8. Toda corrección del acta o del resultado produce una nueva versión; nada se muta en sitio.

---

## 6. Criterios de cierre de F0

- [x] Todas las preguntas Q-L tienen estado: resuelta, diferida o con valor por defecto.
- [x] Cada RGF tiene al menos una prueba asignada (salvo las diferidas, con backlog).
- [x] El alcance de v1 está congelado en dos listas (dentro / fuera).
- [x] Los roles por estado están definidos.
- [ ] Acta firmada por el cliente y por la Comisión Electoral.
- [ ] Matriz RGF validada por la Comisión Electoral.

**F0 queda cerrada técnicamente.** Las dos casillas pendientes son formalidades de firma: no bloquean el inicio de F1.

---

**Siguiente fase:** F1 · Plataforma y modelo de organización (3 pw) — scaffold, `structures`, `memberships`, `electoral_processes`, brigadas, auditoría y seed con el módulo Reglamento.
